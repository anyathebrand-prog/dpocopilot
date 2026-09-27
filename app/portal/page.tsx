import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { requireContact } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { reference } from "@/lib/breach";
import { fmtDate, fmtWAT } from "@/lib/rules";
import { Flash, Deadline, Chip, Banner } from "@/components/ui";

export default async function PortalHome({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const u = await requireContact();
  const sp = await searchParams;
  const id = u.client_id!;
  const client = await one("select name, archived_at from clients where id = $1", [id]);
  const score = await one<{ pct: number }>(`select coalesce(round(100.0 * count(*) filter (where status = 'complete') / nullif(count(*) filter (where status <> 'not_applicable'), 0)), 0)::int as pct from client_car_items where client_id = $1`, [id]);
  const qn = await one("select status from questionnaires where client_id = $1", [id]);
  const evidence = await q("select id, title, due_on, status from evidence_requests where client_id = $1 and status in ('open','rejected') order by due_on nulls last", [id]);
  const signoffs = await q(`select s.id, v.parent_type, v.parent_id, coalesce(d.title, dp.title) as title from signoff_requests s join content_versions v on v.id = s.version_id
    left join documents d on v.parent_type = 'document' and d.id = v.parent_id left join dpias dp on v.parent_type = 'dpia' and dp.id = v.parent_id
    where s.client_id = $1 and s.status = 'pending'`, [id]);
  // FLAG-6 default: contacts see the status of what they reported, nothing more.
  const reports = await q(`(select 'breach' as kind, id, created_at, status, null as label from breaches where client_id = $1 and reported_by = $2)
    union all (select 'dsar', id, created_at, status, requester_name from dsars where client_id = $1 and logged_by = $2) order by created_at desc limit 5`, [id, u.id]);
  const todo = (qn!.status !== "completed" ? 1 : 0) + evidence.length + signoffs.length;

  if (client!.archived_at) return <Banner kind="warn">{client!.name}&apos;s compliance file is archived. Contact {u.firm_name} if you need anything.</Banner>;
  return (
    <>
      <Flash sp={sp} />
      <h1 style={{ fontSize: 24 }}>Your compliance file is <span className="num">{score!.pct}%</span> ready</h1>
      <p className="meta">Managed by {u.firm_name}</p>
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
      <p><Link href="/portal/documents">Documents</Link> · <Link href="/portal/evidence">Evidence requests</Link> · <Link href="/portal/questionnaire">Onboarding answers</Link></p>
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
