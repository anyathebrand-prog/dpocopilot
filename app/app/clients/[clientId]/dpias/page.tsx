import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { q } from "@/lib/db";
import { riskLevel, fmtDate } from "@/lib/rules";
import { Flash, Chip, Empty } from "@/components/ui";

export default async function Dpias({ params, searchParams }: { params: Promise<{ clientId: string }>; searchParams: Promise<Record<string, string>> }) {
  const { clientId } = await params;
  const sp = await searchParams;
  const { client } = await requireClient(clientId);
  const b = `/app/clients/${clientId}/dpias`;
  const asked = Number(sp.year);
  const year = Number.isInteger(asked) && asked >= 2019 && asked <= 2100 ? asked : null; // null = all years
  const years = (await q<{ y: number }>("select distinct assessment_year as y from dpias where client_id = $1 order by 1 desc", [clientId])).map((r) => r.y);
  const rows = await q(`select d.*, v.status, v.version_no, v.ai_generated, v.body,
      (select string_agg(r.purpose, ', ') from dpia_ropa dr join ropa_entries r on r.id = dr.ropa_entry_id where dr.dpia_id = d.id) as activities
    from dpias d join lateral (select * from content_versions where parent_type = 'dpia' and parent_id = d.id order by version_no desc limit 1) v on true
    where d.client_id = $1 and ($2::int is null or d.assessment_year = $2) order by d.assessment_year desc, d.created_at desc`, [clientId, year]);
  const start = year ? `${b}/new?year=${year}` : `${b}/new`;
  const gap = await q("select 1 from gap_findings where client_id = $1 and state = 'open' and rule_key in ('sensitive_without_dpia','high_risk_without_dpia') limit 1", [clientId]);
  const maxRisk = (body: string) => Math.max(0, ...(JSON.parse(body || "{}").risks_list ?? []).map((r: any) => r.likelihood * r.impact));
  return (
    <>
      <div className="spread"><h2 style={{ marginTop: 0 }}>DPIAs{year ? ` · ${year}` : ""}</h2>{!client.archived_at && <Link className="btn" href={start}>Start DPIA</Link>}</div>
      <Flash sp={sp} />
      <form method="get" className="row" style={{ alignItems: "flex-end", margin: "8px 0 16px" }} aria-label="Assessment year">
        <label className="small">Assessment year <input type="number" name="year" min={2019} max={2100} required defaultValue={year ?? ""} style={{ width: 120, display: "block" }} /></label>
        <button className="btn secondary">Open</button>
        <nav className="row" aria-label="Recorded years" style={{ gap: 6 }}>
          <Link href={b} className={`btn ${year ? "quiet" : ""}`} aria-current={year ? undefined : "page"}>All years</Link>
          {years.map((y) => <Link key={y} href={`${b}?year=${y}`} className={`btn ${y === year ? "" : "quiet"}`} aria-current={y === year ? "page" : undefined}>{y}</Link>)}
        </nav>
      </form>
      {gap.length > 0 && <div className="banner warn">The last gap check found high-risk processing with no DPIA. <Link href={`/app/clients/${clientId}/gaps`}>See gaps</Link></div>}
      {rows.length === 0 ? (
        <Empty>
          <p><b>{year ? `No DPIAs recorded for ${year}.` : "No DPIAs yet."}</b></p>
          {year && <p>{years.length ? `Years with DPIAs: ${years.join(", ")}.` : "No DPIAs recorded in any year yet."}</p>}
          {!client.archived_at && <Link className="btn" href={start}>{year ? `Start a DPIA for ${year}` : "Start DPIA"}</Link>}
        </Empty>
      ) : (
        <table className="register">
          <thead><tr><th>DPIA</th><th className="num">Year</th><th>Processing activities</th><th>Status</th><th className="num">Version</th><th>Highest risk</th><th>Review date</th></tr></thead>
          <tbody>{rows.map((d) => {
            const r = maxRisk(d.body);
            return (
              <tr key={d.id}>
                <td><Link href={`${b}/${d.id}`}>{d.title}</Link></td>
                <td data-label="Year" className="num">{d.assessment_year}</td>
                <td data-label="Activities" className="small">{d.activities}</td>
                <td data-label="Status"><Chip status={d.status} ai={d.ai_generated} /></td>
                <td data-label="Version" className="num">{d.version_no}</td>
                <td data-label="Highest risk">{r ? `${r} (${riskLevel(r)})` : "—"}</td>
                <td data-label="Review date">{d.review_date ? fmtDate(d.review_date) : "—"}</td>
              </tr>
            );
          })}</tbody>
        </table>
      )}
    </>
  );
}
