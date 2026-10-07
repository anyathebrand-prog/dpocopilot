import Link from "next/link";
import { requireContact } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { readiness, CAR_CATEGORIES, carItemRisk, carRisk } from "@/lib/rules";
import { Chip, Bar, Deadline, Empty } from "@/components/ui";

/** Read-only CAR checklist for the client: what's done and what they still owe. The firm's N/A reasons stay internal (FR10.3). */
export default async function PortalCar() {
  const u = await requireContact();
  const client = await one("select car_filing_due_on, car_audit_year from clients where id = $1", [u.client_id]);
  const items = await q(`select i.id, i.category_key, i.section, i.item_text, i.status, i.priority, i.recommendation,
      (select json_agg(json_build_object('id', e.id, 'title', e.title, 'status', e.status)) from evidence_requests e
        where e.car_item_id = i.id and e.status in ('open','rejected')) as asks
    from client_car_items i where i.client_id = $1 and i.audit_year = (select car_audit_year from clients where id = $1) order by i.category_key, i.position`, [u.client_id]);
  const r = readiness(items as { category_key: string; status: string }[]);
  const risk = carRisk(items as { category_key: string; status: string; priority: string | null }[]);
  return (
    <>
      <p><Link href="/portal">Back to home</Link></p>
      <h1 style={{ fontSize: 24 }}>Compliance Audit Return checklist{client!.car_audit_year ? ` · ${client!.car_audit_year}` : ""}</h1>
      {client!.car_filing_due_on && <Deadline due={client!.car_filing_due_on} dateOnly prefix="Filing due" soonHours={30 * 24} />}
      {items.length === 0 ? <Empty><p>{u.firm_name} hasn&apos;t set up your checklist yet.</p></Empty> : (
        <>
          <section className="panel" style={{ margin: "16px 0 24px" }}>
            <p style={{ fontSize: 20, margin: "0 0 8px" }}><b className="num">{r.overall.pct}%</b> ready · <span className="num">{r.overall.complete} of {r.overall.applicable}</span> items complete</p>
            <Bar pct={r.overall.pct} label={`CAR checklist ${r.overall.pct}% ready`} />
            {risk && <p style={{ margin: "10px 0 0" }}>Risk score <b className="num">{risk.score}</b> / 100 <Chip status={`risk_${risk.rating}`} /></p>}
            <p className="caption" style={{ marginTop: 8 }}>{u.firm_name} keeps this checklist up to date and files the return with the NDPC.</p>
          </section>
          {Object.entries(CAR_CATEGORIES).filter(([k]) => items.some((i) => i.category_key === k)).map(([k, label]) => (
            <section key={k}>
              <h2>{label} <span className="num meta" style={{ fontSize: 14 }}>{r.byCategory[k].pct}%</span></h2>
              {items.filter((i) => i.category_key === k).map((i, n, list) => (
                <div key={i.id}>
                {i.section && i.section !== list[n - 1]?.section && <h3 style={{ fontSize: 16, margin: "16px 0 8px" }}>{i.section}</h3>}
                <div className={`rule-row ${i.status === "missing" ? "soon" : i.status === "complete" ? "" : "info"}`} style={{ display: "block" }}>
                  <div className="spread"><b>{i.item_text}</b><span className="row" style={{ gap: 6 }}>{carItemRisk(i.status, i.priority) && <Chip status={`risk_${carItemRisk(i.status, i.priority)}`} />}<Chip status={i.status} /></span></div>
                  {i.recommendation && <p className="small" style={{ margin: "6px 0 0" }}><b>Recommendation from {u.firm_name}:</b> {i.recommendation}</p>}
                  {(i.asks ?? []).map((e: { id: string; title: string; status: string }) => (
                    <div key={e.id} className="meta"><Link href={`/portal/evidence/${e.id}`}>{e.status === "rejected" ? "Upload again: " : "Upload: "}{e.title}</Link></div>
                  ))}
                </div>
                </div>
              ))}
            </section>
          ))}
        </>
      )}
    </>
  );
}
