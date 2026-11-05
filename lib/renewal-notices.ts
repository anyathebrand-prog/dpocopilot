import { q, tx } from "./db";
import { todayWAT } from "./rules";
import { noticeInitials } from "./audit-notice";
import { CAR_COUNTRIES } from "./country";
import { renewalSeason } from "./renewal-season";


/**
 * Daily, from 1 November: once a year, draft a Compliance Audit Notification (renewal notice) for the year for every active
 * client that has none, and tell each firm's Admins and Lead Consultants to review, attach invoices and send them.
 * Nothing is sent to clients automatically. A run missed on 1 November still happens on the next day the job runs.
 */
export async function generateRenewalNotices(now = new Date()) {
  const today = todayWAT(now), year = Number(today.slice(0, 4));
  if (!renewalSeason(today)) return { today, generated: 0 };
  const key = `renewal_notices_${year}`;
  const claimed = await q("insert into platform_settings (key, published_value) values ($1, $2) on conflict do nothing returning 1", [key, today]);
  if (!claimed.length) return { today, generated: 0, note: `already generated for ${year}` };
  const clients = await q<{ id: string; firm_id: string; name: string; firm: string }>(`select c.id, c.firm_id, c.name, f.name as firm from clients c join firms f on f.id = c.firm_id
    where c.archived_at is null and c.country = any($1) and not exists (select 1 from audit_notices n where n.client_id = c.id and n.audit_year = $2) order by c.firm_id, c.name`, [CAR_COUNTRIES, year]);
  const perFirm = new Map<string, number>();
  for (const c of clients) await tx(async (t) => {
    const n = (await t.query<{ n: number }>("select count(*)::int as n from audit_notices where firm_id = $1 and audit_year = $2", [c.firm_id, year])).rows[0].n;
    const r = await t.query(`insert into audit_notices (firm_id, client_id, audit_year, our_ref) values ($1,$2,$3,$4) on conflict (client_id, audit_year) do nothing returning id`,
      [c.firm_id, c.id, year, `${noticeInitials(c.firm) || "DPCO"}/${noticeInitials(c.name)}/CAN/${year}/${String(n + 1).padStart(2, "0")}`]);
    if (r.rows.length) perFirm.set(c.firm_id, (perFirm.get(c.firm_id) ?? 0) + 1);
  });
  for (const [firm, count] of perFirm) {
    const msg = `${count} renewal notice${count === 1 ? "" : "s"} for ${year} ${count === 1 ? "is" : "are"} ready. Attach invoices and send them to your clients.`;
    await q(`insert into notifications (firm_id, recipient_user_id, kind, message, link)
      select $1, m.user_id, 'renewal_notices', $2, $3 from memberships m where m.firm_id = $1 and m.status = 'active' and m.role in ('firm_admin','lead_consultant')`, [firm, msg, `/app/audit-notices?year=${year}`]);
  }
  return { today, generated: [...perFirm.values()].reduce((a, b) => a + b, 0), firms: perFirm.size };
}
