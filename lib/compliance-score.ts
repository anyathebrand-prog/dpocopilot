import { one } from "./db";
import { countryOf } from "./country";
import { pct, overall, type Part } from "./score";

/** The client's compliance score and its parts, from their records (shown to the client in the portal). */
export async function complianceScore(clientId: string) {
  const r = (await one(`select c.country,
      (select count(*) filter (where status = 'complete') from client_car_items i where i.client_id = c.id and i.audit_year = c.car_audit_year and i.category_key <> 'data_processors' and i.status <> 'not_applicable')::int as car_done,
      (select count(*) from client_car_items i where i.client_id = c.id and i.audit_year = c.car_audit_year and i.category_key <> 'data_processors' and i.status <> 'not_applicable')::int as car_total,
      (select coalesce(sum(case severity when 'high' then 3 when 'medium' then 2 else 1 end) filter (where state = 'resolved'), 0) from gap_findings g where g.client_id = c.id)::int as gap_done,
      (select coalesce(sum(case severity when 'high' then 3 when 'medium' then 2 else 1 end) filter (where state in ('resolved','open')), 0) from gap_findings g where g.client_id = c.id)::int as gap_total,
      (select count(*) filter (where state = 'open' and severity = 'high') from gap_findings g where g.client_id = c.id)::int as gap_high,
      (select count(*) filter (where status = 'completed') from remediation_actions a where a.client_id = c.id and a.audit_year = c.car_audit_year)::int as rem_done,
      (select count(*) from remediation_actions a where a.client_id = c.id and a.audit_year = c.car_audit_year)::int as rem_total,
      (select count(*) filter (where status = 'closed' and closed_at::date <= deadline_on) from dsars d where d.client_id = c.id and d.received_on > current_date - 365)::int as dsar_ok,
      (select count(*) filter (where status = 'closed' or deadline_on < current_date) from dsars d where d.client_id = c.id and d.received_on > current_date - 365)::int as dsar_due,
      (select count(*) filter (where n.sent_at is not null and n.sent_at <= b.deadline_at) from breaches b left join breach_notifications n on n.breach_id = b.id and n.audience = 'regulator'
         where b.client_id = c.id and b.notification_required = 'yes' and b.aware_at > now() - interval '365 days')::int as br_ok,
      (select count(*) filter (where n.sent_at is not null or b.deadline_at < now()) from breaches b left join breach_notifications n on n.breach_id = b.id and n.audience = 'regulator'
         where b.client_id = c.id and b.notification_required = 'yes' and b.aware_at > now() - interval '365 days')::int as br_due
    from clients c where c.id = $1`, [clientId]))!;
  const cc = countryOf(r.country);
  const parts: Part[] = [
    ...(cc.car ? [{ key: "car", label: "Audit readiness", pct: pct(r.car_done, r.car_total), detail: `${r.car_done} of ${r.car_total} CAR checklist items complete` }] : []),
    { key: "gaps", label: "Risks fixed", pct: pct(r.gap_done, r.gap_total), detail: r.gap_total ? `${r.gap_high} high-risk gap${r.gap_high === 1 ? "" : "s"} still open` : "No gap check run yet" },
    { key: "plan", label: "Action plan", pct: pct(r.rem_done, r.rem_total), detail: r.rem_total ? `${r.rem_done} of ${r.rem_total} remediation actions completed` : "No remediation actions yet" },
    { key: "dsar", label: "Data requests answered on time", pct: pct(r.dsar_ok, r.dsar_due), detail: r.dsar_due ? `${r.dsar_ok} of ${r.dsar_due} in the last 12 months` : "None due in the last 12 months" },
    { key: "breach", label: `Breaches reported to the ${cc.regulator.short} on time`, pct: pct(r.br_ok, r.br_due), detail: r.br_due ? `${r.br_ok} of ${r.br_due} in the last 12 months` : "None to report in the last 12 months" },
  ];
  return { score: overall(parts), parts };
}
