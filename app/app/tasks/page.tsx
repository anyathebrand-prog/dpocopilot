import Link from "next/link";
import { redirect } from "next/navigation";
import { requireFirm, requireClient, clientScope, scopeArgs, audit } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { todayWAT } from "@/lib/rules";
import { str, opt, flash } from "@/lib/form";
import { Flash, Field, Hidden, Chip, Empty, Deadline, PageHead } from "@/components/ui";
import { Submit } from "@/components/client";

async function create(fd: FormData) {
  "use server";
  const { user, client } = await requireClient(str(fd, "client_id"), { write: true });
  const title = str(fd, "title");
  if (!title) redirect(flash("/app/tasks", "Enter a task title.", "error"));
  const assignee = opt(fd, "assignee");
  if (assignee && !(await one("select 1 from memberships where id = $1 and firm_id = $2", [assignee, user.firm_id]))) redirect("/forbidden");
  const t = await one("insert into tasks (firm_id, client_id, title, assignee_membership_id, due_on, created_by) values ($1,$2,$3,$4,$5,$6) returning id", [user.firm_id, client.id, title, assignee, opt(fd, "due_on"), user.id]);
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
  await q("update tasks set status = $2, assignee_membership_id = $3 where id = $1", [t.id, status, assignee]);
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
            <Field label="Due date"><input type="date" name="due_on" /></Field>
            <Submit>Create task</Submit>
          </form>
        </details>
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
          <thead><tr><th>Task</th><th>Client</th><th>Due</th><th>Assignee and status</th></tr></thead>
          <tbody>{rows.map((t) => (
            <tr key={t.id}>
              <td>{t.title}</td>
              <td data-label="Client"><Link href={`/app/clients/${t.client_id}`}>{t.client_name}</Link></td>
              <td data-label="Due">{t.due_on ? (t.status === "open" ? <Deadline due={t.due_on} dateOnly soonHours={48} /> : t.due_on) : "—"}</td>
              <td data-label="Update">
                <form action={update} className="row">
                  <Hidden values={{ task_id: t.id }} />
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
