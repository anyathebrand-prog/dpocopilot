import Link from "next/link";
import { complianceScore } from "@/lib/compliance-score";
import { ShieldAlert } from "lucide-react";
import { requireContact } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { reference } from "@/lib/breach";
import { fmtDate, fmtWAT, todayWAT, carReminderStage } from "@/lib/rules";
import { Flash, Deadline, Chip, Banner, Bar } from "@/components/ui";
import { BAND_COLOR, type Band } from "@/lib/car-perf-model";

export default async function PortalHome({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const u = await requireContact();
  const sp = await searchParams;
  const id = u.client_id!;
  const client = await one("select name, archived_at, car_filing_due_on from clients where id = $1", [id]);
  const { score, parts } = await complianceScore(id);
  const qn = await one("select status from questionnaires where client_id = $1", [id]);
  const evidence = await q("select id, title, due_on, status from evidence_requests where client_id = $1 and status in ('open','rejected') order by due_on nulls last", [id]);
  const signoffs = await q(`select s.id, v.parent_type, v.parent_id, coalesce(d.title, dp.title) as title from signoff_requests s join content_versions v on v.id = s.version_id
    left join documents d on v.parent_type = 'document' and d.id = v.parent_id left join dpias dp on v.parent_type = 'dpia' and dp.id = v.parent_id
    where s.client_id = $1 and s.status = 'pending'`, [id]);
  // FLAG-6 default: contacts see the status of what they reported, nothing more.
  const reports = await q(`(select 'breach' as kind, id, created_at, status, null as label from breaches where client_id = $1 and reported_by = $2)
    union all (select 'dsar', id, created_at, status, requester_name from dsars where client_id = $1 and logged_by = $2) order by created_at desc limit 5`, [id, u.id]);
  const perf = await one<{ car_year: number; overall_score: string; rating_band: string; first_year: number; first_score: string }>(`select s.car_year, s.overall_score, s.rating_band,
      f.car_year as first_year, f.overall_score as first_score from car_perf_snapshots s
    left join lateral (select car_year, overall_score from car_perf_snapshots x where x.client_id = s.client_id and x.status = 'locked' and x.overall_score is not null and x.car_year >= s.car_year - 4 order by car_year limit 1) f on true
    where s.client_id = $1 and s.status = 'locked' and s.overall_score is not null order by s.car_year desc limit 1`, [id]);
  const todo = (qn!.status !== "completed" ? 1 : 0) + evidence.length + signoffs.length;

  if (client!.archived_at) return <Banner kind="warn">{client!.name}&apos;s compliance file is archived. Contact {u.firm_name} if you need anything.</Banner>;
  return (
    <>
      <Flash sp={sp} />
      <section className="cx-ready">
        {score === null
          ? <h1>Your compliance score appears here once {u.firm_name} starts recording your compliance work</h1>
          : <><h1>Your compliance score is <span className="cx-ready-pct num">{score}%</span></h1><Bar pct={score} label={`Compliance score ${score}%`} /></>}
      </section>
      {score !== null && (
        <section className="panel" style={{ marginBottom: 16 }} aria-label="How your score is made up">
          {parts.map((p) => (
            <div key={p.key} style={{ marginBottom: 12 }}>
              <div className="spread"><b>{p.label}</b><span className="num">{p.pct === null ? "Not measured yet" : `${p.pct}%`}</span></div>
              {p.pct !== null && <Bar pct={p.pct} label={`${p.label} ${p.pct}%`} />}
              <div className="meta">{p.detail}</div>
            </div>
          ))}
          <p className="caption" style={{ margin: 0 }}>The score is the average of the parts that can be measured. It updates as {u.firm_name} records your compliance work.</p>
        </section>
      )}
      {perf && (
        <section className="panel" style={{ marginBottom: 16 }} aria-label="CAR performance">
          <div className="spread"><b>CAR performance</b><Link href="/portal/performance">View the trend</Link></div>
          <p style={{ margin: "6px 0 0" }}><span className="num" style={{ fontSize: 26, fontWeight: 700 }}>{Number(perf.overall_score).toFixed(1)}</span> <span className="perf-band"><i style={{ background: BAND_COLOR[perf.rating_band as Band] }} />{perf.rating_band}</span> <span className="meta">CAR {perf.car_year}{perf.first_year < perf.car_year ? ` · ${Number(perf.overall_score) - Number(perf.first_score) >= 0 ? "+" : ""}${(Number(perf.overall_score) - Number(perf.first_score)).toFixed(1)} pts since ${perf.first_year}` : ""}</span></p>
        </section>
      )}
      <p className="meta">Managed by {u.firm_name}</p>
      {client!.car_filing_due_on && carReminderStage(client!.car_filing_due_on, todayWAT()) !== null && (
        <Banner kind="warn">
          <b>Compliance Audit Return</b> · {u.firm_name} files it with the NDPC for you.
          <Deadline due={client!.car_filing_due_on} dateOnly prefix="Filing due" soonHours={7 * 24} />
        </Banner>
      )}
      <h2>To do</h2>
      {todo === 0 && <p>You&apos;re all caught up.</p>}
      {qn!.status !== "completed" && (
        <div className="rule-row info"><Link href="/portal/questionnaire"><b>Answer the onboarding questions</b></Link><span className="meta">Save and come back any time</span></div>
      )}
      {signoffs.map((s) => (
        <div key={s.id} className="rule-row info"><Link href={`/portal/documents/${s.id}/sign`}><b>Review and sign: {s.title}</b></Link><Chip status="awaiting_client_signoff" /></div>
      ))}
      {evidence.map((e) => (
        <div key={e.id} className={`rule-row ${e.status === "rejected" ? "soon" : "info"}`} style={{ display: "block" }}>
          <Link href={`/portal/evidence/${e.id}`}><b>{e.status === "rejected" ? "Upload again: " : "Upload: "}{e.title}</b></Link>
          {e.due_on && <Deadline due={e.due_on} dateOnly />}
        </div>
      ))}
      <h2>Something happened?</h2>
      <div className="stack">
        <Link className="btn emergency" href="/portal/report-breach"><ShieldAlert aria-hidden />Report a breach</Link>
        <Link className="btn secondary" style={{ width: "100%" }} href="/portal/log-request">Log a data subject request</Link>
      </div>
      <h2>More</h2>
      <div className="cx-links"><Link href="/portal/deadlines">Upcoming deadlines</Link><Link href="/portal/car">CAR checklist</Link><Link href="/portal/ropa">Data inventory</Link><Link href="/portal/documents">Documents</Link><Link href="/portal/evidence">Evidence requests</Link><Link href="/portal/invoices">Invoices</Link><Link href="/portal/questionnaire">Onboarding answers</Link></div>
      {reports.length > 0 && (
        <>
          <h2>What you&apos;ve reported</h2>
          {reports.map((r) => (
            <div key={r.id} className="rule-row info">
              <span>{r.kind === "breach" ? `Breach report ${reference(r.id)}` : `Data subject request: ${r.label}`}<div className="meta">{fmtWAT(r.created_at)}</div></span>
              <Chip status={r.status === "closed" ? "closed" : "open"} />
            </div>
          ))}
        </>
      )}
      <p className="caption" style={{ marginTop: 32 }}>Only people at {client!.name} and {u.firm_name} can see this information. Today is {fmtDate(new Date(Date.now() + 3600e3).toISOString().slice(0, 10))}.</p>
    </>
  );
}
