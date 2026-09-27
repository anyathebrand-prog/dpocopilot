import Link from "next/link";
import { q, one } from "@/lib/db";
import { fmtWAT } from "@/lib/rules";
import { pendingSummary } from "@/lib/secretary";
import { PageHead, Banner } from "@/components/ui";

export default async function SecretaryHome() {
  const c = await one(`select
    (select count(*)::int from reg_documents where status = 'published') as docs,
    (select count(*)::int from mi_criteria where status = 'published') as criteria,
    (select published_value from platform_settings where key = 'dsar_response_days') as days,
    (select count(*)::int from car_template_items where status = 'published') as car`);
  const pending = await pendingSummary();
  const pilots = await q("select * from pilot_requests order by created_at desc limit 50");
  const areas: [string, string, string][] = [
    ["/secretary/library", "Regulatory library", `${c!.docs} published source documents`],
    ["/secretary/criteria", "Major-importance criteria", `${c!.criteria} published criteria`],
    ["/secretary/settings", "Platform settings", `DSAR response period: ${c!.days} days`],
    ["/secretary/car-template", "CAR checklist template", `${c!.car} published items in 5 categories`],
  ];
  return (
    <>
      <PageHead title="Content home" sub="Changes here reach every firm once published." />
      {pending.length > 0 && <Banner kind="warn">{pending.length} unpublished change{pending.length > 1 ? "s" : ""}. <Link href="/secretary/publish">Review and publish</Link></Banner>}
      {areas.map(([href, title, sub]) => (
        <div key={href} className="rule-row info"><Link href={href}><b>{title}</b></Link><span className="meta">{sub}</span></div>
      ))}
      <p className="caption" style={{ marginTop: 24 }}>Policy templates are maintained in code for V1.</p>
      <h2>Pilot requests</h2>
      {pilots.length === 0 ? <p className="meta">None yet. They arrive from the public &quot;Request pilot access&quot; form.</p> : (
        <table className="register">
          <thead><tr><th>Firm</th><th>Contact</th><th>Clients</th><th>Message</th><th>Received (WAT)</th></tr></thead>
          <tbody>{pilots.map((r) => (
            <tr key={r.id}>
              <td>{r.firm}</td>
              <td data-label="Contact">{r.name}<div className="meta"><a href={`mailto:${r.email}`}>{r.email}</a>{r.phone && ` · ${r.phone}`}</div></td>
              <td data-label="Clients">{r.client_count ?? "—"}</td>
              <td data-label="Message" className="small">{r.message ?? "—"}</td>
              <td data-label="Received" className="small num">{fmtWAT(r.created_at)}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </>
  );
}
