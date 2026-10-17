// Per-client checkout through Kora (https://developers.korapay.com/docs/checkout-redirect).
// A client added while a fee applies to its size must be paid for before its portal invitations are sent.
import { randomUUID } from "node:crypto";
import { q, one } from "./db";
import { setting } from "./data";
import { invite } from "./invites";

const KORA = process.env.KORA_BASE_URL ?? "https://api.korapay.com/merchant/api/v1"; // override only for tests
const KEY = () => process.env.KORA_SECRET_KEY;
const BASE = () => process.env.APP_URL ?? "http://localhost:3000";

/** Client size bands; each has a fee set by the Secretary (Platform settings). */
export const SIZES: [string, string][] = [["small", "Small (up to 50 staff)"], ["medium", "Medium (51 to 250 staff)"], ["large", "Large (over 250 staff)"]];
export const sizeLabel = (k?: string | null) => SIZES.find(([v]) => v === k)?.[1] ?? k ?? "";

export const koraOn = () => !!KEY();
/** Fee in naira for a size band, or 0 (no checkout) when unset or Kora isn't configured. */
export async function feeFor(size?: string | null) {
  if (!koraOn() || !SIZES.some(([k]) => k === size)) return 0;
  const n = Number(await setting(`client_fee_${size}`));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** True while the client's invitations must wait for payment. */
export async function invitesHeld(clientId: string) {
  return !!(await one(`select 1 from clients c where c.id = $1 and c.checkout_amount is not null
    and not exists (select 1 from client_payments p where p.client_id = c.id and p.status = 'paid')`, [clientId]));
}

/** Creates a Kora charge and returns its checkout URL. Throws with Kora's message on failure. */
export async function startCheckout(c: { id: string; firm_id: string; name: string; checkout_amount: string | number }, payer: { id: string; email: string; name: string }) {
  const reference = `DPOC-${randomUUID()}`, amount = Number(c.checkout_amount);
  await q("insert into client_payments (firm_id, client_id, reference, amount, created_by) values ($1,$2,$3,$4,$5)", [c.firm_id, c.id, reference, amount, payer.id]);
  const r = await fetch(`${KORA}/charges/initialize`, {
    method: "POST", headers: { Authorization: `Bearer ${KEY()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount, currency: "NGN", reference, narration: `DPO Copilot: ${c.name}`.slice(0, 100),
      redirect_url: `${BASE()}/app/clients/${c.id}/checkout`, notification_url: `${BASE()}/api/kora/webhook`,
      customer: { email: payer.email, name: payer.name },
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.status || !j.data?.checkout_url) throw new Error(j.message ?? `Kora error ${r.status}`);
  return j.data.checkout_url as string;
}

/**
 * Confirms a charge with Kora (never trusting the redirect or webhook alone), marks it paid once,
 * and then sends the client's held invitations. Returns the payment's status.
 */
export async function confirmPayment(reference: string): Promise<"paid" | "pending" | "failed" | "unknown"> {
  const p = await one("select * from client_payments where reference = $1", [reference]);
  if (!p) return "unknown";
  if (p.status === "paid") return "paid";
  const r = await fetch(`${KORA}/charges/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${KEY()}` } });
  const d = (await r.json().catch(() => ({})))?.data;
  if (!r.ok || !d) return "pending";
  if (d.status === "failed") { await q("update client_payments set status = 'failed' where id = $1 and status = 'pending'", [p.id]); return "failed"; }
  if (d.status !== "success" || d.currency !== "NGN" || Number(d.amount) < Number(p.amount)) return "pending";
  // Only the request that flips it to paid sends the invitations (redirect and webhook can race).
  const won = await one("update client_payments set status = 'paid', paid_at = now() where id = $1 and status <> 'paid' returning id", [p.id]);
  if (won) await releaseInvites(p.client_id, p.created_by);
  return "paid";
}

/** Sends invitations to the client's contacts who were added before payment and have no account yet. */
async function releaseInvites(clientId: string, by: string) {
  const contacts = await q("select cc.id, cc.email, cc.firm_id from client_contacts cc where cc.client_id = $1 and cc.status = 'invited' and not exists (select 1 from users u where lower(u.email) = lower(cc.email))", [clientId]);
  for (const c of contacts) await invite({ firm_id: c.firm_id, client_id: clientId, contact_id: c.id, email: c.email, role: "client_contact", invited_by: by });
}
