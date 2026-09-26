import Link from "next/link";
import { redirect } from "next/navigation";
import { requireFirmRole, audit, ROLE_LABEL } from "@/lib/auth";
import { q, one, tx } from "@/lib/db";
import { str, all, flash } from "@/lib/form";
import { fmtWAT } from "@/lib/rules";
import { Flash, Field, Hidden, Chip } from "@/components/ui";
import { Submit, Confirm } from "@/components/client";

async function member(fd: FormData) {
  const u = await requireFirmRole("firm_admin");
  const m = await one("select m.*, u.name from memberships m join users u on u.id = m.user_id where m.id = $1 and m.firm_id = $2", [str(fd, "membership_id"), u.firm_id]);
  if (!m) redirect("/forbidden");
  return { u, m, back: `/app/settings/team/${m.id}` };
}

/** FLAG-16 default: a firm always keeps at least one active Firm Admin. */
async function lastAdmin(firmId: string, membershipId: string) {
  const r = await one<{ n: number }>("select count(*)::int as n from memberships where firm_id = $1 and role = 'firm_admin' and status = 'active' and id <> $2", [firmId, membershipId]);
  return r!.n === 0;
}

async function changeRole(fd: FormData) {
  "use server";
  const { u, m, back } = await member(fd);
  const role = str(fd, "role");
  if (!ROLE_LABEL[role]) redirect(back);
  if (m.role === "firm_admin" && role !== "firm_admin" && await lastAdmin(u.firm_id, m.id)) redirect(flash(back, "The firm needs at least one Firm Admin. Make someone else a Firm Admin first.", "error"));
  await q("update memberships set role = $2 where id = $1", [m.id, role]);
  await audit(u, "role_change", "membership", m.id, { details: { from: m.role, to: role } });
  redirect(flash(back, `Role changed to ${ROLE_LABEL[role]}`));
}

async function saveAssignments(fd: FormData) {
  "use server";
  const { u, m, back } = await member(fd);
  const ids = all(fd, "client");
  await tx(async (t) => {
    await t.query("delete from client_assignments where membership_id = $1", [m.id]);
    for (const c of ids) await t.query("insert into client_assignments (client_id, membership_id) select id, $2 from clients where id = $1 and firm_id = $3", [c, m.id, u.firm_id]);
    await audit(u, "update", "client_assignments", m.id, { details: { clients: ids.length } }, t);
  });
  redirect(flash(back, "Client assignments saved. Access changed immediately."));
}

async function setActive(fd: FormData) {
  "use server";
  const { u, m, back } = await member(fd);
  const activate = str(fd, "op") === "activate";
  if (!activate && m.role === "firm_admin" && await lastAdmin(u.firm_id, m.id)) redirect(flash(back, "You can't deactivate the only Firm Admin.", "error"));
  await tx(async (t) => {
    await t.query("update memberships set status = $2 where id = $1", [m.id, activate ? "active" : "deactivated"]);
    if (!activate) await t.query("delete from sessions where user_id = $1", [m.user_id]);
    await audit(u, activate ? "update" : "deactivate", "membership", m.id, { details: { status: activate ? "active" : "deactivated" } }, t);
  });
  redirect(flash(back, activate ? `${m.name} reactivated` : `${m.name} deactivated and signed out everywhere`));
}

export default async function Member({ params, searchParams }: { params: Promise<{ userId: string }>; searchParams: Promise<Record<string, string>> }) {
  const { userId } = await params;
  const sp = await searchParams;
  const u = await requireFirmRole("firm_admin");
  const m = await one("select m.*, us.name, us.email, us.mfa_enabled from memberships m join users us on us.id = m.user_id where m.id = $1 and m.firm_id = $2", [/^[0-9a-f-]{36}$/.test(userId) ? userId : null, u.firm_id]);
  if (!m) redirect("/forbidden");
  const clients = await q(`select c.id, c.name, exists (select 1 from client_assignments a where a.client_id = c.id and a.membership_id = $2) as assigned
    from clients c where c.firm_id = $1 and c.archived_at is null order by c.name`, [u.firm_id, m.id]);
  const activity = await q("select occurred_at, action, entity_type from audit_events where firm_id = $1 and actor_user_id = $2 order by occurred_at desc limit 10", [u.firm_id, m.user_id]);
  const openTasks = await one<{ n: number }>("select count(*)::int as n from tasks where assignee_membership_id = $1 and status = 'open'", [m.id]);
  const h = <Hidden values={{ membership_id: m.id }} />;
  return (
    <>
      <nav className="meta" aria-label="Breadcrumb"><Link href="/app/settings/team">Team</Link> / {m.name}</nav>
      <h1 style={{ marginTop: 8 }}>{m.name}</h1>
      <p className="meta">{m.email} · {ROLE_LABEL[m.role]} · Two-step sign-in {m.mfa_enabled ? "on" : "off"} · <Chip status={m.status === "active" ? "active" : "closed"} /></p>
      <Flash sp={sp} />
      <div className="with-rail">
        <div>
          <form action={changeRole} className="panel">{h}
            <h3>Role</h3>
            <Field label="Role"><select name="role" defaultValue={m.role}>{Object.entries(ROLE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
            <Submit className="btn secondary">Change role</Submit>
          </form>
          <form action={saveAssignments} className="panel">{h}
            <h3>Assigned clients</h3>
            <p className="meta">{m.role === "associate" ? "Associates only see these clients." : "Firm Admins and Lead Consultants see every client; assignment decides who gets alerts."}</p>
            {clients.map((c) => <label key={c.id} className="check"><input type="checkbox" name="client" value={c.id} defaultChecked={c.assigned} />{c.name}</label>)}
            {!clients.length && <p className="meta">No clients yet.</p>}
            <Submit className="btn secondary">Save assignments</Submit>
          </form>
        </div>
        <aside>
          <section className="panel">
            <h3>Recent activity</h3>
            {activity.length ? activity.map((a, i) => <p key={i} className="small">{fmtWAT(a.occurred_at)}: {a.action} {a.entity_type.replace(/_/g, " ")}</p>) : <p className="meta">None.</p>}
          </section>
          <section className="panel">
            {m.status === "active" ? (
              <>
                {openTasks!.n > 0 && <p className="why">{openTasks!.n} open tasks are assigned to {m.name}. Reassign them on the Tasks page.</p>}
                {m.user_id !== u.id && <Confirm action={setActive} title={`Deactivate ${m.name}?`} body="They are signed out everywhere and can't sign in. Their records and history are kept." label="Deactivate">{h}<input type="hidden" name="op" value="deactivate" /></Confirm>}
                {m.user_id === u.id && <p className="why">You can&apos;t deactivate yourself.</p>}
              </>
            ) : (
              <form action={setActive}>{h}<input type="hidden" name="op" value="activate" /><Submit className="btn secondary">Reactivate</Submit></form>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
