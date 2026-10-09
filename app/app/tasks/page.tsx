import Link from "next/link";
import { redirect } from "next/navigation";
import { requireFirm, requireClient, clientScope, scopeArgs, audit, canApprove } from "@/lib/auth";
import { naira } from "@/lib/invoice";
import { q, one } from "@/lib/db";
import { todayWAT, fmtDate } from "@/lib/rules";
import { str, opt, flash } from "@/lib/form";
import { Flash, Field, Hidden, Chip, Empty, Deadline, PageHead } from "@/components/ui";
import { Submit } from "@/components/client";

/** Fee in naira from the form: null when blank, NaN when not a non-negative amount. */
const fee = (fd: FormData) => { const v = str(fd, "fee").replace(/[,₦\s]/g, ""); return v === "" ? null : Number.isFinite(Number(v)) && Number(v) >= 0 ? Math.round(Number(v) * 100) / 100 : NaN; };

async function create(fd: FormData) {
  "use server";
  const { user, client } = await requireClient(str(fd, "client_id"), { write: true });
  const title = str(fd, "title");
  if (!title) redirect(flash("/app/tasks", "Enter a task title.", "error"));
  const assignee = opt(fd, "assignee"), start = opt(fd, "start_on"), due = opt(fd, "due_on");
  if (start && due && due < start) redirect(flash("/app/tasks", "The due date is before the start date.", "error"));
  if (assignee && !(await one("select 1 from memberships where id = $1 and firm_id = $2", [assignee, user.firm_id]))) redirect("/forbidden");
  const amount = canApprove(user) ? fee(fd) : null; // only Firm Admins and Lead Consultants set fees
  if (Number.isNaN(amount)) redirect(flash("/app/tasks", "Enter the professional fee as an amount in naira.", "error"));
  const t = await one("insert into tasks (firm_id, client_id, title, assignee_membership_id, start_on, due_on, fee, created_by) values ($1,$2,$3,$4,$5,$6,$7,$8) returning id", [user.firm_id, client.id, title, assignee, start, due, amount, user.id]);
  await audit(user, "create", "task", t!.id, { client_id: client.id });
  redirect(flash("/app/tasks", "Task created. It appears on the calendar."));
}

async function update(fd: FormData) {
  "use server";
  const t = await one("select * from tasks where id = $1", [str(fd, "task_id")]);
  if (!t) redirect("/forbidden");
  const { user } = await requireClient(t.client_id, { write: true });
  const status = str(fd, "status") === "done" ? "done" : "open";
  const assignee = opt(fd, "assignee");
  if (assignee && !(await one("select 1 from memberships where id = $1 and firm_id = $2", [assignee, user.firm_id]))) redirect("/forbidden");
  const start = opt(fd, "start_on"), due = opt(fd, "due_on");
  if (start && due && due < start) redirect(flash("/app/tasks", "The due date is before the start date.", "error"));
  const amount = canApprove(user) ? fee(fd) : t.fee; // others keep the fee as it is
  if (Number.isNaN(amount)) redirect(flash("/app/tasks", "Enter the professional fee as an amount in naira.", "error"));
  await q("update tasks set status = $2, assignee_membership_id = $3, start_on = $4, due_on = $5, fee = $7, done_on = case when $2 = 'done' then coalesce(done_on, $6::date) else null end where id = $1",
    [t.id, status, assignee, start, due, todayWAT(), amount]);
  await audit(user, "update", "task", t.id, { client_id: t.client_id, details: { status } });
  redirect(flash("/app/tasks", "Task updated"));
}

export default async function Tasks({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const u = await requireFirm();
  const sp = await searchParams;
  const today = todayWAT();
  const clients = await q(`select c.id, c.name from clients c where ${clientScope(u)} and c.archived_at is null order by c.name`, scopeArgs(u));
  const members = await q("select m.id, u.name from memberships m join users u on u.id = m.user_id where m.firm_id = $1 and m.status = 'active' order by u.name", [u.firm_id]);
  const status = sp.status === "done" ? "done" : "open";
  const rows = await q(`select t.*, c.name as client_name, us.name as assignee_name from tasks t join clients c on c.id = t.client_id
    left join memberships m on m.id = t.assignee_membership_id left join users us on us.id = m.user_id
    where ${clientScope(u)} and t.status = $3 and ($4 = '' or t.client_id::text = $4) and ($5 = '' or t.assignee_membership_id::text = $5) and ($6 = '' or t.due_on < $7)
    order by t.due_on nulls last`, [...scopeArgs(u), status, sp.client ?? "", sp.assignee ?? "", sp.overdue ? "1" : "", today]);
  return (
    <>
      <PageHead title="Tasks" />
      <Flash sp={sp} />
      {clients.length > 0 && (
        <details className="group" open={!rows.length}>
          <summary>New task</summary>
          <form action={create} style={{ maxWidth: 640 }}>
            <Field label="Title" required><input name="title" required /></Field>
            <Field label="Client" required><select name="client_id" defaultValue={sp.client ?? ""} required><option value="" disabled>Choose…</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
            <Field label="Assignee"><select name="assignee" defaultValue={u.membership_id}><option value="">Unassigned</option>{members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Field>
            <div className="row">
              <Field label="Start date"><input type="date" name="start_on" /></Field>
              <Field label="Due date"><input type="date" name="due_on" /></Field>
            </div>
            {canApprove(u) && <Field label="Professional Fee Payable (₦)" help="Shown to the assignee on their task."><input name="fee" inputMode="decimal" placeholder="0.00" style={{ width: 200 }} /></Field>}
            <Submit>Create task</Submit>
          </form>
        </details>
      )}
      {clients.length > 0 && (
        <form action="/export" target="_blank" className="panel row" style={{ alignItems: "flex-end", margin: "16px 0" }} aria-label="Project plan">
          <input type="hidden" name="kind" value="project-plan" />
          <Field label="Project plan for"><select name="client" defaultValue={sp.client ?? clients[0].id}>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <Field label="Format"><select name="format" defaultValue="pdf"><option value="pdf">PDF</option><option value="doc">Word</option></select></Field>
          <button className="btn">Generate project plan</button>
          <button className="btn secondary" name="cover" value="only">Cover letter</button>
          <span className="meta">All the client&apos;s tasks with start and due dates, as a timeline.</span>
        </form>
      )}
      <form className="row" style={{ alignItems: "flex-end", margin: "16px 0" }} aria-label="Filters">
        <label className="small">Client <select name="client" defaultValue={sp.client ?? ""} style={{ display: "block" }}><option value="">All</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="small">Assignee <select name="assignee" defaultValue={sp.assignee ?? ""} style={{ display: "block" }}><option value="">Anyone</option>{members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
        <label className="small">Status <select name="status" defaultValue={status} style={{ display: "block" }}><option value="open">Open</option><option value="done">Done</option></select></label>
        <label className="check"><input type="checkbox" name="overdue" value="1" defaultChecked={!!sp.overdue} />Overdue only</label>
        <button className="btn secondary">Apply filters</button>
      </form>
      {rows.length === 0 ? <Empty><p>No tasks.</p></Empty> : (
        <table className="register">
          <thead><tr><th>Task</th><th>Client</th><th>Start</th><th>Due</th><th className="num">Professional Fee Payable</th><th>Dates, assignee and status</th></tr></thead>
          <tbody>{rows.map((t) => (
            <tr key={t.id}>
              <td>{t.title}</td>
              <td data-label="Client"><Link href={`/app/clients/${t.client_id}`}>{t.client_name}</Link></td>
              <td data-label="Start" className="small">{t.start_on ? fmtDate(t.start_on) : "—"}</td>
              <td data-label="Due">{t.due_on ? (t.status === "open" ? <Deadline due={t.due_on} dateOnly soonHours={48} /> : t.due_on) : "—"}</td>
              <td data-label="Professional Fee Payable" className="num">{(canApprove(u) || t.assignee_membership_id === u.membership_id) && t.fee != null ? naira(Number(t.fee)) : "—"}</td>
              <td data-label="Update">
                <form action={update} className="row">
                  <Hidden values={{ task_id: t.id }} />
                  <input type="date" name="start_on" defaultValue={t.start_on ?? ""} aria-label="Start date" style={{ width: "auto" }} />
                  <input type="date" name="due_on" defaultValue={t.due_on ?? ""} aria-label="Due date" style={{ width: "auto" }} />
                  {canApprove(u) && <input name="fee" inputMode="decimal" defaultValue={t.fee ?? ""} placeholder="Fee ₦" aria-label="Professional fee payable" style={{ width: 120 }} />}
                  <select name="assignee" defaultValue={t.assignee_membership_id ?? ""} aria-label="Assignee" style={{ width: "auto" }}><option value="">Unassigned</option>{members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
                  <select name="status" defaultValue={t.status} aria-label="Status" style={{ width: "auto" }}><option value="open">Open</option><option value="done">Done</option></select>
                  <Submit className="btn secondary">Save</Submit>
                </form>
                {t.status === "done" && <Chip status="done" />}
              </td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </>
  );
}
