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
  // Website visits, last 30 days (cookieless counts from app/api/visit).
  const since = "current_date - 29";
  const v = (await one(`select coalesce(sum(landings),0)::int as visits, coalesce(sum(views),0)::int as views from page_views where day >= ${since}`))!;
  const days = await q(`select to_char(day, 'DD Mon') as d, sum(landings)::int as visits, sum(views)::int as views from page_views where day >= ${since} group by day order by day desc`);
  const pages = await q(`select path, sum(views)::int as views from page_views where day >= ${since} group by path order by views desc limit 10`);
  const sources = await q(`select source, sum(landings)::int as visits from page_views where day >= ${since} and source <> 'internal' group by source order by visits desc limit 10`);
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
      <h2>Website visits <span className="meta" style={{ fontSize: 14 }}>last 30 days</span></h2>
      <p className="meta">Public pages only. Counted without cookies or IP addresses, so a returning visitor counts again.</p>
      {v.views === 0 ? <p className="meta">No visits recorded yet.</p> : (
        <>
          <div className="row" style={{ gap: 16, marginBottom: 16 }}>
            <div className="panel"><div className="meta">Visits</div><b className="num" style={{ fontSize: 24 }}>{v.visits.toLocaleString()}</b></div>
            <div className="panel"><div className="meta">Page views</div><b className="num" style={{ fontSize: 24 }}>{v.views.toLocaleString()}</b></div>
          </div>
          <div className="row" style={{ gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
            <table className="register" style={{ flex: 1, minWidth: 220 }}><thead><tr><th>Day</th><th className="num">Visits</th><th className="num">Page views</th></tr></thead>
              <tbody>{days.map((d) => <tr key={d.d}><td>{d.d}</td><td data-label="Visits" className="num">{d.visits}</td><td data-label="Page views" className="num">{d.views}</td></tr>)}</tbody></table>
            <table className="register" style={{ flex: 1, minWidth: 220 }}><thead><tr><th>Page</th><th className="num">Views</th></tr></thead>
              <tbody>{pages.map((r) => <tr key={r.path}><td>{r.path}</td><td data-label="Views" className="num">{r.views}</td></tr>)}</tbody></table>
            <table className="register" style={{ flex: 1, minWidth: 220 }}><thead><tr><th>Came from</th><th className="num">Visits</th></tr></thead>
              <tbody>{sources.map((r) => <tr key={r.source}><td>{r.source}</td><td data-label="Visits" className="num">{r.visits}</td></tr>)}</tbody></table>
          </div>
        </>
      )}
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
