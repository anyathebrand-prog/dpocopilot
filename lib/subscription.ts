// DPCO annual subscription through Paystack (https://paystack.com/docs/api/transaction/).
// A DPCO pays before it can use its workspace, and renews each year; reminders go out from the daily cron (app/api/cron/car-reminders).
import { randomUUID } from "node:crypto";
import { q, one } from "./db";
import { setting } from "./data";
import { send } from "./auth";
import { paymentsOn } from "./checkout";
import { todayWAT, fmtDate } from "./rules";
import { subState, nextEnd, reminderStage, GRACE_DAYS, type SubState } from "./subscription-math";
import { money } from "./country";

const PAYSTACK = process.env.PAYSTACK_BASE_URL ?? "https://api.paystack.co"; // override only for tests
const KEY = () => process.env.PAYSTACK_SECRET_KEY;
const BASE = () => process.env.APP_URL ?? "http://localhost:3000";
const addDays = (d: string, n: number) => { const x = new Date(d + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };

/** The annual fee in naira, or 0 when none is set or Paystack isn't configured (no subscription is then required). */
export async function annualFee() {
  if (!paymentsOn()) return 0;
  const n = Number(await setting("dpco_annual_fee"));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export type Sub = { state: SubState; ends: string | null; graceEnds: string | null; firmId: string; own: boolean };

/**
 * The subscription that governs a firm user's access: their own firm's, or for a Solo DPO, their approved DPCO's.
 * A Solo DPO not yet working with a DPCO, and every firm while no fee applies, count as active.
 */
export async function subscriptionOf(u: { firm_id: string; plan?: string; dpco_firm_id?: string | null; dpco_status?: string | null }, today = todayWAT()): Promise<Sub> {
  const solo = u.plan === "solo";
  const firmId = solo ? (u.dpco_status === "approved" ? u.dpco_firm_id ?? null : null) : u.firm_id;
  if (!firmId) return { state: "active", ends: null, graceEnds: null, firmId: u.firm_id, own: !solo };
  const ends = (await one<{ e: string | null }>("select subscription_ends::text as e from firms where id = $1", [firmId]))?.e ?? null;
  let state = subState(ends, today);
  if (state !== "active" && !(await annualFee())) state = "active";
  return { state, ends, graceEnds: ends ? addDays(ends, GRACE_DAYS) : null, firmId, own: !solo };
}

/** Starts a Paystack transaction for a year's subscription and returns its payment page URL. */
export async function startSubscription(firmId: string, payer: { id: string; email: string }) {
  const amount = await annualFee();
  if (!amount) throw new Error("No subscription fee is set.");
  const reference = `DPOS-${randomUUID()}`;
  await q("insert into firm_subscription_payments (firm_id, reference, amount, created_by) values ($1,$2,$3,$4)", [firmId, reference, amount, payer.id]);
  const r = await fetch(`${PAYSTACK}/transaction/initialize`, {
    method: "POST", headers: { Authorization: `Bearer ${KEY()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email: payer.email, amount: Math.round(amount * 100), currency: "NGN", reference, callback_url: `${BASE()}/subscription`, metadata: { firm_id: firmId, kind: "dpco_subscription" } }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.status || !j.data?.authorization_url) throw new Error(j.message ?? `Paystack error ${r.status}`);
  return j.data.authorization_url as string;
}

/** Verifies a subscription payment with Paystack (never trusting the redirect or webhook alone); the first to confirm it extends the subscription by a year. */
export async function confirmSubscription(reference: string): Promise<"paid" | "pending" | "failed" | "unknown"> {
  const p = await one("select * from firm_subscription_payments where reference = $1", [reference]);
  if (!p) return "unknown";
  if (p.status === "paid") return "paid";
  const r = await fetch(`${PAYSTACK}/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${KEY()}` } });
  const d = (await r.json().catch(() => ({})))?.data;
  if (!r.ok || !d) return "pending";
  if (d.status === "failed") { await q("update firm_subscription_payments set status = 'failed' where id = $1 and status = 'pending'", [p.id]); return "failed"; }
  if (d.status !== "success" || d.currency !== "NGN" || Number(d.amount) < Math.round(Number(p.amount) * 100)) return "pending";
  const won = await one("update firm_subscription_payments set status = 'paid', paid_at = now() where id = $1 and status <> 'paid' returning id", [p.id]);
  if (!won) return "paid"; // the redirect and the webhook can race; only one extends
  const f = (await one<{ e: string | null; name: string }>("select subscription_ends::text as e, name from firms where id = $1", [p.firm_id]))!;
  const end = nextEnd(f.e, todayWAT());
  await q("update firms set subscription_ends = $2 where id = $1", [p.firm_id, end]);
  await q("update firm_subscription_payments set period_end = $2 where id = $1", [p.id, end]);
  await tellAdmins(p.firm_id, `Payment of ${money(Number(p.amount))} received. ${f.name}'s DPO Copilot subscription now runs to ${fmtDate(end)}.`);
  return "paid";
}

async function tellAdmins(firmId: string, message: string) {
  const admins = await q<{ user_id: string; email: string }>("select m.user_id, u.email from memberships m join users u on u.id = m.user_id where m.firm_id = $1 and m.status = 'active' and m.role = 'firm_admin'", [firmId]);
  for (const a of admins) {
    await q("insert into notifications (firm_id, recipient_user_id, kind, message, link) values ($1,$2,'subscription',$3,'/subscription')", [firmId, a.user_id, message]);
    await send("email", a.email, "subscription", `${message} Manage it at ${BASE()}/subscription`);
  }
}

const REMINDER: Record<string, (end: string, grace: string, fee: string) => string> = {
  d30: (e, _g, fee) => `Renewal notice: your DPO Copilot subscription ends on ${fmtDate(e)}. Renew for ${fee} to keep your workspace open.`,
  d7: (e, _g, fee) => `Reminder: your DPO Copilot subscription ends on ${fmtDate(e)}, in a week. Renew for ${fee}.`,
  d1: (e, _g, fee) => `Your DPO Copilot subscription ends on ${fmtDate(e)}. Renew for ${fee} to avoid interruption.`,
  grace: (e, g) => `Your DPO Copilot subscription ended on ${fmtDate(e)}. Your workspace is read-only, and locks on ${fmtDate(addDays(g, 1))} unless you renew. Your clients' portals stay open.`,
  locked: (e) => `Your DPO Copilot subscription ended on ${fmtDate(e)} and your workspace is now locked. Nothing has been deleted; renew to unlock it straight away.`,
};

/** Daily: renewal notices, reminders and lockout notices for DPCO subscriptions (to Firm Admins) and client subscriptions, each sent once per end date. */
export async function sendSubscriptionReminders(now = new Date()) {
  return { ...(await dpcoReminders(now)), clients: await clientReminders(now) };
}

const CLIENT_REMINDER: Record<string, (client: string, end: string, grace: string) => string> = {
  d30: (c, e) => `Renewal notice: ${c}'s DPO Copilot subscription ends on ${fmtDate(e)}. Renew it to keep their portal open.`,
  d7: (c, e) => `Reminder: ${c}'s subscription ends on ${fmtDate(e)}, in a week.`,
  d1: (c, e) => `${c}'s subscription ends on ${fmtDate(e)}. Renew it to avoid interrupting their portal.`,
  grace: (c, e, g) => `${c}'s subscription ended on ${fmtDate(e)}. Their portal is read-only, and pauses on ${fmtDate(addDays(g, 1))} unless it is renewed.`,
  locked: (c, e) => `${c}'s subscription ended on ${fmtDate(e)} and their portal is paused. Renew it to restore access.`,
};

async function clientReminders(now: Date) {
  const today = todayWAT(now);
  const clients = await q<{ id: string; firm_id: string; name: string; e: string }>(`select id, firm_id, name, subscription_ends::text as e from clients
    where archived_at is null and subscription_ends is not null and subscription_ends <= $1::date + 30`, [today]);
  let sent = 0;
  for (const c of clients) {
    const stage = reminderStage(c.e, today);
    if (!stage) continue;
    const claimed = await q("insert into client_subscription_reminders (client_id, period_end, stage) values ($1,$2,$3) on conflict do nothing returning 1", [c.id, c.e, stage]);
    if (!claimed.length) continue;
    const msg = CLIENT_REMINDER[stage](c.name, c.e, addDays(c.e, GRACE_DAYS)), link = `/app/clients/${c.id}/subscription`;
    const team = await q<{ user_id: string; email: string }>("select m.user_id, u.email from memberships m join users u on u.id = m.user_id where m.firm_id = $1 and m.status = 'active' and m.role in ('firm_admin','lead_consultant')", [c.firm_id]);
    for (const t of team) {
      await q("insert into notifications (firm_id, recipient_user_id, kind, message, link) values ($1,$2,'subscription',$3,$4)", [c.firm_id, t.user_id, msg, link]);
      await send("email", t.email, "client_subscription", `${msg} Renew at ${BASE()}${link}`);
    }
    if (stage === "grace" || stage === "locked") { // the client's own contacts hear when their access changes
      const contacts = await q<{ email: string }>("select email from client_contacts where client_id = $1 and status = 'active'", [c.id]);
      const f = (await one<{ name: string }>("select name from firms where id = $1", [c.firm_id]))!;
      for (const k of contacts) await send("email", k.email, "client_subscription", stage === "grace"
        ? `${c.name}'s DPO Copilot subscription has ended. Your portal is read-only for now. Ask ${f.name} to renew it.`
        : `${c.name}'s DPO Copilot portal access is paused because the subscription has ended. Ask ${f.name} to renew it. Nothing has been deleted.`);
    }
    sent++;
  }
  return { sent };
}

async function dpcoReminders(now: Date) {
  const fee = await annualFee();
  if (!fee) return { sent: 0, note: "no subscription fee" };
  const today = todayWAT(now);
  const firms = await q<{ id: string; e: string }>("select id, subscription_ends::text as e from firms where plan = 'firm' and subscription_ends is not null and subscription_ends <= $1::date + 30", [today]);
  let sent = 0;
  for (const f of firms) {
    const stage = reminderStage(f.e, today);
    if (!stage) continue;
    const claimed = await q("insert into firm_subscription_reminders (firm_id, period_end, stage) values ($1,$2,$3) on conflict do nothing returning 1", [f.id, f.e, stage]);
    if (!claimed.length) continue;
    await tellAdmins(f.id, REMINDER[stage](f.e, addDays(f.e, GRACE_DAYS), money(fee)));
    sent++;
  }
  return { sent };
}
