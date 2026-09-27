import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { todayWAT, fmtWAT } from "@/lib/rules";
import { progress } from "@/lib/questionnaire";
import { answersOf } from "@/lib/data";
import { Flash, Deadline, Chip } from "@/components/ui";
import { Countdown } from "@/components/client";

export default async function Overview({ params, searchParams }: { params: Promise<{ clientId: string }>; searchParams: Promise<Record<string, string>> }) {
  const { clientId } = await params;
  const sp = await searchParams;
  const { client } = await requireClient(clientId);
  const b = `/app/clients/${clientId}`;
  const today = todayWAT();
  const qn = await one("select status from questionnaires where client_id = $1", [clientId]);
  const contacts = await one<{ n: number }>("select count(*)::int as n from client_contacts where client_id = $1 and status <> 'invite_revoked'", [clientId]);
  const proposed = await one<{ n: number }>("select count(*)::int as n from ropa_entries where client_id = $1 and state = 'proposed'", [clientId]);
  const docs = await one<{ n: number }>("select count(*)::int as n from documents where client_id = $1", [clientId]);
  const pct = progress(await answersOf(clientId));

  const next: [string, string, string] =
    !contacts!.n ? ["Invite someone at the client so they can answer the onboarding questions.", "Invite a client contact", `${b}/settings`] :
    qn!.status === "not_sent" ? ["Send the onboarding questionnaire to build the data map.", "Send onboarding questionnaire", `${b}/onboarding`] :
    qn!.status !== "completed" ? [`Onboarding is ${pct}% answered. You can also fill it in on the client's behalf.`, "Open onboarding", `${b}/onboarding`] :
    proposed!.n ? [`${proposed!.n} proposed processing activities are waiting for review.`, "Review proposed RoPA entries", `${b}/ropa`] :
    !docs!.n ? ["Generate the core policies from the data map.", "Generate documents", `${b}/documents`] :
    !client.gaps_checked_at ? ["Check the file for compliance gaps.", "Run gap check", `${b}/gaps`] :
    ["Collect evidence for missing CAR checklist items.", "Open CAR readiness", `${b}/car-readiness`];

  const breaches = await q("select id, deadline_at, description from breaches where client_id = $1 and status = 'open' order by deadline_at", [clientId]);
  const dsars = await q("select id, requester_name, deadline_on from dsars where client_id = $1 and status = 'open' order by deadline_on limit 5", [clientId]);
  const gaps = await q("select id, message, severity, link from gap_findings where client_id = $1 and state = 'open' order by case severity when 'high' then 0 when 'medium' then 1 else 2 end limit 5", [clientId]);
  const tasks = await q("select id, title, due_on from tasks where client_id = $1 and status = 'open' and due_on < $2 order by due_on", [clientId, today]);
  const evidence = await q("select id, title, due_on, status from evidence_requests where client_id = $1 and status in ('open','rejected','submitted') order by due_on nulls last limit 5", [clientId]);
  const pending = await q(`select v.parent_type, v.parent_id, v.status, coalesce(d.title, doc.title) as title from content_versions v
    left join dpias d on v.parent_type = 'dpia' and d.id = v.parent_id left join documents doc on v.parent_type = 'document' and doc.id = v.parent_id
    where v.client_id = $1 and v.status in ('in_review','awaiting_client_signoff') and v.parent_type in ('dpia','document')`, [clientId]);

  return (
    <>
      <Flash sp={sp} />
      {!client.archived_at && (
        <section className="panel" style={{ borderLeft: "4px solid var(--stamp-700)", marginBottom: 32 }}>
          <h2 style={{ margin: "0 0 4px", fontSize: 18 }}>Next step</h2>
          <p>{next[0]}</p>
          <Link className="btn" href={next[2]}>{next[1]}</Link>
        </section>
      )}
      {breaches.map((x) => (
        <div key={x.id} className="banner breach">
          <div className="spread" style={{ flex: 1 }}>
            <div><b>Active breach</b><div>Notify NDPC by {fmtWAT(x.deadline_at)}</div></div>
            <div className="row"><Countdown due={x.deadline_at.toISOString()} /><Link className="btn danger" href={`${b}/breaches/${x.id}`}>Open breach</Link></div>
          </div>
        </div>
      ))}
      <div className="with-rail" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <section>
          <h3>Open gaps</h3>
          {gaps.length ? gaps.map((g) => <div key={g.id} className={`rule-row ${g.severity === "high" ? "urgent" : "soon"}`}><Link href={`${b}/${g.link}`}>{g.message}</Link><Chip status={g.severity} /></div>)
            : <p className="meta">{client.gaps_checked_at ? "No open gaps." : "No gap check run yet."} <Link href={`${b}/gaps`}>Gap analysis</Link></p>}
          <h3>Waiting for approval or sign-off</h3>
          {pending.length ? pending.map((p) => <div key={p.parent_id} className="rule-row info"><Link href={`${b}/${p.parent_type === "dpia" ? "dpias" : "documents"}/${p.parent_id}`}>{p.title}</Link><Chip status={p.status} /></div>)
            : <p className="meta">Nothing waiting.</p>}
          <h3>Overdue tasks</h3>
          {tasks.length ? tasks.map((t) => <div key={t.id} className="rule-row urgent"><span>{t.title}</span><Deadline due={t.due_on} dateOnly /></div>)
            : <p className="meta">None. <Link href={`/app/tasks?client=${clientId}`}>Client tasks</Link> · <Link href={`/app/calendar?client=${clientId}`}>Client calendar</Link></p>}
        </section>
        <section>
          <h3>Evidence outstanding</h3>
          {evidence.length ? evidence.map((e) => <div key={e.id} className="rule-row info"><Link href={`${b}/evidence/${e.id}`}>{e.title}</Link><Chip status={e.status} /></div>)
            : <p className="meta">None outstanding.</p>}
          <h3>Open data subject requests</h3>
          {dsars.length ? dsars.map((d) => <div key={d.id} className="rule-row info"><Link href={`${b}/dsars/${d.id}`}>{d.requester_name}</Link><Deadline due={d.deadline_on} dateOnly /></div>)
            : <p className="meta">None open.</p>}
          <h3>Onboarding</h3>
          <p className="meta">Questionnaire: {qn!.status.replace("_", " ")}, {pct}% answered.</p>
        </section>
      </div>
    </>
  );
}
