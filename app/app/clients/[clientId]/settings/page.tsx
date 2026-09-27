import { redirect } from "next/navigation";
import { requireClient, audit, ROLE_LABEL } from "@/lib/auth";
import { q, one, tx } from "@/lib/db";
import { invite } from "@/lib/invites";
import { str, opt, all, flash } from "@/lib/form";
import { Flash, Field, Chip, Hidden } from "@/components/ui";
import { Submit, Confirm } from "@/components/client";

const path = (id: string) => `/app/clients/${id}/settings`;

async function manager(fd: FormData) {
  const r = await requireClient(str(fd, "client_id"), { write: true });
  if (r.user.role === "associate") redirect(flash(path(r.client.id), "Only Firm Admins and Lead Consultants can change client settings.", "error"));
  return r;
}

async function saveDetails(fd: FormData) {
  "use server";
  const { user, client } = await manager(fd);
  await q("update clients set name = $2, sector = $3, size = $4, car_filing_due_on = $5 where id = $1", [client.id, str(fd, "name") || client.name, opt(fd, "sector"), opt(fd, "size"), opt(fd, "car_filing_due_on")]);
  await audit(user, "update", "client", client.id, { client_id: client.id });
  redirect(flash(path(client.id), "Details saved"));
}

async function inviteContact(fd: FormData) {
  "use server";
  const { user, client } = await manager(fd);
  const email = str(fd, "email").toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) redirect(flash(path(client.id), "Enter a valid email address.", "error"));
  if (await one("select 1 from users where lower(email) = $1", [email])) redirect(flash(path(client.id), "This email already has an account. Use a different email for the portal.", "error"));
  const c = await one<{ id: string }>(`insert into client_contacts (firm_id, client_id, name, email, phone) values ($1,$2,$3,$4,$5)
    on conflict (client_id, email) do update set status = 'invited', name = excluded.name returning id`, [client.firm_id, client.id, str(fd, "name") || email, email, opt(fd, "phone")]);
  await invite({ firm_id: client.firm_id, client_id: client.id, contact_id: c!.id, email, role: "client_contact", invited_by: user.id });
  await audit(user, "invite", "client_contact", c!.id, { client_id: client.id });
  redirect(flash(path(client.id), "Invitation sent"));
}

async function contactAction(fd: FormData) {
  "use server";
  const { user, client } = await manager(fd);
  const c = await one("select * from client_contacts where id = $1 and client_id = $2", [str(fd, "contact_id"), client.id]);
  if (!c) redirect("/forbidden");
  if (str(fd, "op") === "resend") {
    await q("update client_contacts set status = 'invited' where id = $1", [c.id]);
    await invite({ firm_id: client.firm_id, client_id: client.id, contact_id: c.id, email: c.email, role: "client_contact", invited_by: user.id });
    redirect(flash(path(client.id), "Invitation sent again"));
  }
  await q("update invitations set status = 'revoked' where contact_id = $1 and status = 'pending'", [c.id]);
  await q("update client_contacts set status = 'invite_revoked' where id = $1 and status = 'invited'", [c.id]);
  await audit(user, "update", "client_contact", c.id, { client_id: client.id, details: { invitation: "revoked" } });
  redirect(flash(path(client.id), "Invitation revoked"));
}

async function saveTeam(fd: FormData) {
  "use server";
  const { user, client } = await manager(fd);
  const team = all(fd, "team");
  await tx(async (t) => {
    await t.query("delete from client_assignments where client_id = $1", [client.id]);
    for (const m of team) await t.query("insert into client_assignments (client_id, membership_id) select $1, id from memberships where id = $2 and firm_id = $3", [client.id, m, client.firm_id]);
    await audit(user, "update", "client_assignments", client.id, { client_id: client.id, details: { members: team.length } }, t);
  });
  redirect(flash(path(client.id), "Assigned team saved"));
}

async function archiveClient(fd: FormData) {
  "use server";
  const { user, client } = await manager(fd);
  await tx(async (t) => {
    await t.query("update clients set archived_at = now() where id = $1", [client.id]);
    await t.query("update signoff_requests set status = 'cancelled' where client_id = $1 and status = 'pending'", [client.id]);
    await audit(user, "archive", "client", client.id, { client_id: client.id }, t);
  });
  redirect(flash("/app", `${client.name} archived`));
}

export default async function Settings({ params, searchParams }: { params: Promise<{ clientId: string }>; searchParams: Promise<Record<string, string>> }) {
  const { clientId } = await params;
  const sp = await searchParams;
  const { user, client } = await requireClient(clientId);
  const ro = user.role === "associate" || !!client.archived_at;
  const contacts = await q("select * from client_contacts where client_id = $1 order by created_at", [clientId]);
  const members = await q(`select m.id, u.name, m.role, exists (select 1 from client_assignments a where a.client_id = $2 and a.membership_id = m.id) as assigned
    from memberships m join users u on u.id = m.user_id where m.firm_id = $1 and m.status = 'active' order by u.name`, [client.firm_id, clientId]);
  const h = <Hidden values={{ client_id: clientId }} />;
  return (
    <>
      <h2 style={{ marginTop: 0 }}>Client settings</h2>
      <Flash sp={sp} />
      {user.role === "associate" && <p className="why">Only Firm Admins and Lead Consultants can change these settings.</p>}
      <fieldset disabled={ro}>
        <form action={saveDetails}>{h}
          <h3>Details</h3>
          <Field label="Client name" required><input name="name" defaultValue={client.name} required /></Field>
          <Field label="Sector"><input name="sector" defaultValue={client.sector ?? ""} /></Field>
          <Field label="Size"><input name="size" defaultValue={client.size ?? ""} /></Field>
          <Field label="CAR filing due date"><input type="date" name="car_filing_due_on" defaultValue={client.car_filing_due_on ?? ""} /></Field>
          <Submit className="btn secondary">Save details</Submit>
        </form>
      </fieldset>

      <h3>Client contacts</h3>
      <p className="meta">Contacts use the client portal. They only ever see this client&apos;s information.</p>
      {contacts.length > 0 && (
        <table className="register" style={{ marginBottom: 16 }}>
          <thead><tr><th>Name</th><th>Email</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td><td data-label="Email">{c.email}</td>
                <td data-label="Status"><Chip status={c.status === "active" ? "active" : c.status === "invited" ? "submitted" : "closed"} /> <span className="meta">{c.status === "invited" ? "Invited" : c.status === "active" ? "" : "Invitation revoked"}</span></td>
                <td>{!ro && c.status !== "active" && (
                  <form action={contactAction} className="row">{h}<input type="hidden" name="contact_id" value={c.id} />
                    <Submit className="btn quiet" name="op" value="resend">Send invitation again</Submit>
                    {c.status === "invited" && <Submit className="btn quiet" name="op" value="revoke">Revoke</Submit>}
                  </form>)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!ro && (
        <form action={inviteContact} className="panel" style={{ maxWidth: 640 }}>{h}
          <h3>Invite a contact</h3>
          <Field label="Name"><input name="name" /></Field>
          <Field label="Email" required><input type="email" name="email" required /></Field>
          <Field label="Mobile number" help="Optional. For signing codes by SMS later."><input type="tel" name="phone" /></Field>
          <Submit>Send invitation</Submit>
        </form>
      )}

      <form action={saveTeam}>{h}
        <h3>Assigned team</h3>
        <fieldset disabled={ro}>
          {members.map((m) => <label key={m.id} className="check"><input type="checkbox" name="team" value={m.id} defaultChecked={m.assigned} />{m.name} <span className="meta">({ROLE_LABEL[m.role]})</span></label>)}
          <p className="meta">Associates gain or lose access as soon as you save.</p>
          <Submit className="btn secondary">Save team</Submit>
        </fieldset>
      </form>

      {!ro && (
        <section style={{ marginTop: 48, borderTop: "1px solid var(--line)", paddingTop: 16 }}>
          <h3>Danger</h3>
          <p>Archiving makes this client read-only and cancels pending sign-offs. Nothing is deleted.</p>
          <Confirm action={archiveClient} title={`Archive ${client.name}?`} body="The client becomes read-only for everyone. You can still view and export its records." label="Archive client">{h}</Confirm>
        </section>
      )}
    </>
  );
}
