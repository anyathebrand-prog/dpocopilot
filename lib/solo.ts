import { q } from "./db";
import { send } from "./auth";

const BASE = () => process.env.APP_URL ?? "http://localhost:3000";

/** In-app notification + email to a firm's active members (optionally only some roles). */
export async function notifyFirm(firmId: string, kind: string, message: string, link: string, roles?: string[]) {
  const people = await q<{ user_id: string; email: string }>(`select m.user_id, u.email from memberships m join users u on u.id = m.user_id
    where m.firm_id = $1 and m.status = 'active' and ($2::text[] is null or m.role = any($2))`, [firmId, roles ?? null]);
  for (const p of people) {
    await q("insert into notifications (firm_id, recipient_user_id, kind, message, link) values ($1,$2,$3,$4,$5)", [firmId, p.user_id, kind, message, link]);
    await send("email", p.email, kind, `${message} Log in to view: ${BASE()}${link}`);
  }
}
export const REVIEWERS = ["firm_admin", "lead_consultant"];

/**
 * A Solo DPO leaves a DPCO that is no longer available (its subscription has lapsed past grace, or was never paid) to choose a new one.
 * The work tied to the old DPCO is cleared: every task in the Solo DPO's workspace is deleted, and proposal reviews are reset so the new
 * DPCO reviews them afresh. Clients, proposals and wallet history (money already earned) are kept.
 */
export async function leaveDpco(soloFirmId: string) {
  const { tx } = await import("./db");
  return tx(async (t) => {
    const tasks = await t.query("delete from tasks where firm_id = $1 returning id", [soloFirmId]);
    await t.query("update proposals set review_status = null, review_note = null, reviewed_by = null, reviewed_at = null where firm_id = $1 and review_status is not null", [soloFirmId]);
    await t.query("update firms set dpco_firm_id = null, dpco_status = null where id = $1", [soloFirmId]);
    return { tasks: tasks.rows.length };
  });
}

/** DPCO firms a Solo DPO can choose: those whose workspace is open (subscription active or in grace, or no subscription fee applies). */
export async function availableDpcos(excludeFirmId: string) {
  const { annualFee } = await import("./subscription");
  const { subState } = await import("./subscription-math");
  const { todayWAT } = await import("./rules");
  const firms = await q<{ id: string; name: string; e: string | null }>("select id, name, subscription_ends::text as e from firms where plan = 'firm' and id <> $1 order by name", [excludeFirmId]);
  if (!(await annualFee())) return firms;
  const today = todayWAT();
  return firms.filter((f) => ["active", "grace"].includes(subState(f.e, today)));
}
