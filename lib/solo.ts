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
 * The work tied to the old DPCO is cleared: every task in the Solo DPO's workspace is deleted, proposal reviews are reset so the new
 * DPCO reviews them afresh, and clients the old DPCO added go back to it with all their records (kept, as NDPA records must be).
 * Clients from the Solo DPO's own accepted proposals, the proposals themselves and wallet history (money already earned) stay.
 */
export async function leaveDpco(soloFirmId: string) {
  const { tx } = await import("./db");
  return tx(async (t) => {
    const tasks = await t.query("delete from tasks where firm_id = $1 returning id", [soloFirmId]);
    await t.query("update proposals set review_status = null, review_note = null, reviewed_by = null, reviewed_at = null where firm_id = $1 and review_status is not null", [soloFirmId]);
    const old = (await t.query<{ dpco_firm_id: string | null }>("select dpco_firm_id from firms where id = $1", [soloFirmId])).rows[0]?.dpco_firm_id;
    const back = old ? (await t.query<{ id: string }>("select id from clients where firm_id = $1 and added_by_dpco = $2", [soloFirmId, old])).rows.map((r) => r.id) : [];
    if (back.length) {
      await t.query("delete from client_assignments where client_id = any($1)", [back]);
      // Every table that holds both firm_id and client_id moves with the client (the audit trail stays as it was written).
      const tables = await t.query<{ table_name: string }>(`select c1.table_name from information_schema.columns c1 join information_schema.columns c2
        on c2.table_schema = c1.table_schema and c2.table_name = c1.table_name and c2.column_name = 'client_id'
        join information_schema.tables tb on tb.table_schema = c1.table_schema and tb.table_name = c1.table_name and tb.table_type = 'BASE TABLE'
        where c1.table_schema = current_schema() and c1.column_name = 'firm_id' and c1.table_name not in ('audit_events')`);
      for (const { table_name } of tables.rows) await t.query(`update "${table_name}" set firm_id = $1 where client_id = any($2)`, [old, back]);
      await t.query("update clients set firm_id = $1, added_by_dpco = null where id = any($2)", [old, back]);
    }
    await t.query("update firms set dpco_firm_id = null, dpco_status = null where id = $1", [soloFirmId]);
    return { tasks: tasks.rows.length, clients: back.length };
  });
}

/** DPCO firms a Solo DPO can choose: those whose workspace is open (subscription active or in grace, or no subscription fee applies). */
export async function availableDpcos(excludeFirmId: string) {
  const { feesOn } = await import("./subscription");
  const { subState } = await import("./subscription-math");
  const { todayWAT } = await import("./rules");
  const firms = await q<{ id: string; name: string; e: string | null }>("select id, name, subscription_ends::text as e from firms where plan = 'firm' and id <> $1 order by name", [excludeFirmId]);
  if (!(await feesOn())) return firms;
  const today = todayWAT();
  return firms.filter((f) => ["active", "grace"].includes(subState(f.e, today)));
}
