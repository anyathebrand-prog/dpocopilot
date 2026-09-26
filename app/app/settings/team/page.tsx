import Link from "next/link";
import { redirect } from "next/navigation";
import { requireFirmRole, audit, ROLE_LABEL } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { invite } from "@/lib/invites";
import { str, flash } from "@/lib/form";
import { fmtWAT } from "@/lib/rules";
import { Flash, Field, Hidden, Chip, PageHead } from "@/components/ui";
import { Submit } from "@/components/client";

async function inviteMember(fd: FormData) {
  "use server";
  const u = await requireFirmRole("firm_admin");
  const email = str(fd, "email").toLowerCase(), role = str(fd, "role");
  if (!/^\S+@\S+\.\S+$/.test(email) || !ROLE_LABEL[role]) redirect(flash("/app/settings/team", "Enter an email and choose a role.", "error"));
  if (await one("select 1 from users where lower(email) = $1", [email])) redirect(flash("/app/settings/team", "This email already has an account.", "error"));
  await invite({ firm_id: u.firm_id, email, role, invited_by: u.id });
  await audit(u, "invite", "membership", null, { details: { role } });
  redirect(flash("/app/settings/team", `Invitation sent to ${email}`));
}

async function invitationAction(fd: FormData) {
  "use server";
  const u = await requireFirmRole("firm_admin");
  const inv = await one("select * from invitations where id = $1 and firm_id = $2 and status = 'pending' and client_id is null", [str(fd, "invitation_id"), u.firm_id]);
  if (!inv) redirect("/app/settings/team");
  if (str(fd, "op") === "resend") await invite({ firm_id: u.firm_id, email: inv.email, role: inv.role, invited_by: u.id });
  else await q("update invitations set status = 'revoked' where id = $1", [inv.id]);
  redirect(flash("/app/settings/team", str(fd, "op") === "resend" ? "Invitation sent again" : "Invitation revoked"));
}

export default async function Team({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const u = await requireFirmRole("firm_admin");
  const sp = await searchParams;
  const members = await q(`select m.id, m.role, m.status, u.name, u.email, u.mfa_enabled, (select count(*)::int from client_assignments a where a.membership_id = m.id) as clients
    from memberships m join users u on u.id = m.user_id where m.firm_id = $1 order by m.status, u.name`, [u.firm_id]);
  const pending = await q("select * from invitations where firm_id = $1 and client_id is null and status = 'pending' order by created_at desc", [u.firm_id]);
  return (
    <>
      <PageHead title="Team" />
      <Flash sp={sp} />
      <table className="register">
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th className="num">Assigned clients</th></tr></thead>
        <tbody>{members.map((m) => (
          <tr key={m.id}>
            <td><Link href={`/app/settings/team/${m.id}`}>{m.name}</Link></td>
            <td data-label="Email">{m.email}</td>
            <td data-label="Role">{ROLE_LABEL[m.role]}</td>
            <td data-label="Status"><Chip status={m.status === "active" ? "active" : "closed"} /> {m.status === "deactivated" && <span className="meta">Deactivated</span>}{m.status === "active" && !m.mfa_enabled && <span className="meta"> No two-step sign-in</span>}</td>
            <td data-label="Assigned clients" className="num">{m.role === "associate" ? m.clients : "All"}</td>
          </tr>
        ))}</tbody>
      </table>
      {pending.length > 0 && (
        <>
          <h3>Pending invitations</h3>
          {pending.map((p) => (
            <form key={p.id} action={invitationAction} className="rule-row info">
              <Hidden values={{ invitation_id: p.id }} />
              <span>{p.email} · {ROLE_LABEL[p.role]} <span className="meta">· expires {fmtWAT(p.expires_at)}</span></span>
              <span className="row"><Submit className="btn quiet" name="op" value="resend">Send again</Submit><Submit className="btn quiet" name="op" value="revoke">Revoke</Submit></span>
            </form>
          ))}
        </>
      )}
      <form action={inviteMember} className="panel" style={{ maxWidth: 640, marginTop: 32 }}>
        <h3>Invite a team member</h3>
        <Field label="Email" required><input type="email" name="email" required /></Field>
        <Field label="Role" help="Associates only see clients they are assigned to and cannot approve.">
          <select name="role" defaultValue="associate">{Object.entries(ROLE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        </Field>
        <Submit>Send invitation</Submit>
      </form>
    </>
  );
}
