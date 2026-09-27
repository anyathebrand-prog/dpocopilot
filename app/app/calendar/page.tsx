import Link from "next/link";
import { ShieldAlert, UserSearch, FileSearch, FolderUp, Landmark, ListChecks } from "lucide-react";
import { requireFirm, clientScope, scopeArgs } from "@/lib/auth";
import { q } from "@/lib/db";
import { fmtDate, todayWAT, endOfDayWAT } from "@/lib/rules";
import { Empty, Deadline, PageHead } from "@/components/ui";

const TYPES: Record<string, [string, typeof ShieldAlert]> = {
  breach: ["Breach: notify NDPC", ShieldAlert], dsar: ["DSAR response due", UserSearch], dpia: ["DPIA review", FileSearch],
  evidence: ["Evidence due", FolderUp], car: ["CAR filing", Landmark], task: ["Task", ListChecks],
};

/** FR9.2: every dated item, computed from the records themselves so calendar, dashboard and alerts agree. */
export default async function Calendar({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const u = await requireFirm();
  const sp = await searchParams;
  const clients = await q(`select c.id, c.name from clients c where ${clientScope(u)} and c.archived_at is null order by c.name`, scopeArgs(u));
  const members = await q("select m.id, u.name from memberships m join users u on u.id = m.user_id where m.firm_id = $1 and m.status = 'active' order by u.name", [u.firm_id]);
  const rows = await q(`with items as (
      select 'breach' as type, b.client_id, (b.deadline_at at time zone 'Africa/Lagos')::date as day, b.deadline_at as due, 'Breach BR-' || upper(left(b.id::text, 8)) as title, 'breaches/' || b.id as path, null::uuid as assignee
        from breaches b where b.status = 'open' and b.notification_required <> 'no' and not exists (select 1 from breach_notifications n where n.breach_id = b.id and n.audience = 'regulator' and n.sent_at is not null)
      union all select 'dsar', client_id, deadline_on, null, requester_name, 'dsars/' || id, null from dsars where status = 'open'
      union all select 'dpia', client_id, review_date, null, title, 'dpias/' || id, null from dpias where review_date is not null
      union all select 'evidence', client_id, due_on, null, title, 'evidence/' || id, null from evidence_requests where due_on is not null and status in ('open','rejected')
      union all select 'car', id, car_filing_due_on, null, 'Compliance Audit Return', 'car-readiness', null from clients where car_filing_due_on is not null
      union all select 'task', client_id, due_on, null, title, null, assignee_membership_id from tasks where due_on is not null and status = 'open')
    select i.*, c.name as client_name from items i join clients c on c.id = i.client_id
    where ${clientScope(u)} and c.archived_at is null and ($3 = '' or c.id::text = $3)
      and ($4 = '' or i.assignee::text = $4 or (i.type <> 'task' and exists (select 1 from client_assignments a where a.client_id = c.id and a.membership_id::text = $4)))
    order by i.day, i.due nulls last`, [...scopeArgs(u), sp.client ?? "", sp.assignee ?? ""]);
  const today = todayWAT();
  const days = [...new Set(rows.map((r) => r.day))];
  return (
    <>
      <PageHead title="Calendar" sub="All deadlines in West Africa Time (WAT)." />
      <form className="row" style={{ alignItems: "flex-end", marginBottom: 16 }} aria-label="Filters">
        <label className="small">Client <select name="client" defaultValue={sp.client ?? ""} style={{ display: "block" }}><option value="">All clients</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="small">Assignee <select name="assignee" defaultValue={sp.assignee ?? ""} style={{ display: "block" }}><option value="">Anyone</option>{members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
        <button className="btn secondary">Apply filters</button>
      </form>
      {rows.length === 0 ? <Empty><p>Nothing due.</p></Empty> : days.map((d) => (
        <section key={d} aria-labelledby={`d-${d}`}>
          <h3 id={`d-${d}`}>{d < today ? "Overdue · " : d === today ? "Today · " : ""}{fmtDate(d)}</h3>
          {rows.filter((r) => r.day === d).map((r, i) => {
            const [label, Icon] = TYPES[r.type];
            const href = r.path ? `/app/clients/${r.client_id}/${r.path}` : `/app/tasks?client=${r.client_id}`;
            return (
              <div key={i} className={`rule-row ${+(r.due ?? endOfDayWAT(r.day)) < Date.now() ? "urgent" : r.type === "breach" ? "soon" : "info"}`}>
                <div className="row"><Icon aria-hidden size={18} /><div><Link href={href}><b>{label}:</b> {r.title}</Link><div className="meta">{r.client_name}</div></div></div>
                <Deadline due={r.due ?? r.day} dateOnly={!r.due} soonHours={r.type === "breach" ? 24 : 120} />
              </div>
            );
          })}
        </section>
      ))}
    </>
  );
}
