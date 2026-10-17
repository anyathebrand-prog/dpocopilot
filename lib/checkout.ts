// Per-client checkout through Paystack (https://paystack.com/docs/api/transaction/).
// A client added while a fee applies to its size must be paid for before its portal invitations are sent.
import { randomUUID } from "node:crypto";
import { q, one } from "./db";
import { setting } from "./data";
import { invite } from "./invites";

const PAYSTACK = process.env.PAYSTACK_BASE_URL ?? "https://api.paystack.co"; // override only for tests
const KEY = () => process.env.PAYSTACK_SECRET_KEY;
const BASE = () => process.env.APP_URL ?? "http://localhost:3000";

export { SIZES, sizeLabel } from "./client-size";
import { SIZES } from "./client-size";

export const paymentsOn = () => !!KEY();
/** Fee in naira for a size band, or 0 (no checkout) when unset or Paystack isn't configured. */
export async function feeFor(size?: string | null) {
  if (!paymentsOn() || !SIZES.some(([k]) => k === size)) return 0;
  const n = Number(await setting(`client_fee_${size}`));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** True while the client's invitations must wait for payment. */
export async function invitesHeld(clientId: string) {
  return !!(await one(`select 1 from clients c where c.id = $1 and c.checkout_amount is not null
    and not exists (select 1 from client_payments p where p.client_id = c.id and p.status = 'paid')`, [clientId]));
}

/** Starts a Paystack transaction and returns its payment page URL. Throws with Paystack's message on failure. */
export async function startCheckout(c: { id: string; firm_id: string; name: string; checkout_amount: string | number }, payer: { id: string; email: string; name: string }) {
  const reference = `DPOC-${randomUUID()}`, amount = Number(c.checkout_amount);
  await q("insert into client_payments (firm_id, client_id, reference, amount, created_by) values ($1,$2,$3,$4,$5)", [c.firm_id, c.id, reference, amount, payer.id]);
  const r = await fetch(`${PAYSTACK}/transaction/initialize`, {
    method: "POST", headers: { Authorization: `Bearer ${KEY()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: payer.email, amount: Math.round(amount * 100), currency: "NGN", reference, // amount in kobo
      callback_url: `${BASE()}/app/clients/${c.id}/checkout`, metadata: { client_id: c.id, client: c.name },
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.status || !j.data?.authorization_url) throw new Error(j.message ?? `Paystack error ${r.status}`);
  return j.data.authorization_url as string;
}

/**
 * Confirms a transaction with Paystack (never trusting the redirect or webhook alone), marks it paid once,
 * and then sends the client's held invitations. Returns the payment's status.
 */
export async function confirmPayment(reference: string): Promise<"paid" | "pending" | "failed" | "unknown"> {
  const p = await one("select * from client_payments where reference = $1", [reference]);
  if (!p) return "unknown";
  if (p.status === "paid") return "paid";
  const r = await fetch(`${PAYSTACK}/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${KEY()}` } });
  const d = (await r.json().catch(() => ({})))?.data;
  if (!r.ok || !d) return "pending";
  if (d.status === "failed") { await q("update client_payments set status = 'failed' where id = $1 and status = 'pending'", [p.id]); return "failed"; }
  if (d.status !== "success" || d.currency !== "NGN" || Number(d.amount) < Math.round(Number(p.amount) * 100)) return "pending";
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
