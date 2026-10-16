import { q, one } from "./db";
import { newToken, sha256 } from "./crypto";
import { send, ROLE_LABEL } from "./auth";
import { inviteHtml, inviteText } from "./email-invite";
import { INSTALL } from "./install";

const BASE = process.env.APP_URL ?? "http://localhost:3000";

/** Signed single-use invitation, 7-day expiry (schema SQ-3). Only the hash is stored. */
export async function invite(o: { firm_id: string; email: string; role: string; invited_by: string; client_id?: string; contact_id?: string }) {
  const token = newToken();
  await q("update invitations set status = 'revoked' where email = $1 and firm_id = $2 and status = 'pending' and coalesce(client_id::text,'') = coalesce($3::text,'')", [o.email, o.firm_id, o.client_id ?? null]);
  await q("insert into invitations (firm_id, client_id, contact_id, email, role, token_hash, invited_by, expires_at) values ($1,$2,$3,$4,$5,$6,$7, now() + interval '7 days')",
    [o.firm_id, o.client_id ?? null, o.contact_id ?? null, o.email, o.role, sha256(token), o.invited_by]);
  const n = await one<{ firm: string; inviter: string; client: string | null }>(
    "select f.name as firm, u.name as inviter, (select name from clients where id = $3) as client from firms f, users u where f.id = $1 and u.id = $2",
    [o.firm_id, o.invited_by, o.client_id ?? null]);
  const v = {
    firm_name: n?.client ? `${n.client} (with ${n.firm})` : n?.firm ?? INSTALL.name, inviter_name: n?.inviter ?? n?.firm ?? INSTALL.name,
    role: ROLE_LABEL[o.role] ?? (o.role === "client_contact" ? "Client contact" : o.role), expires_in: "7 days", invite_url: `${BASE}/invite/${token}`, email: o.email,
  };
  await send("email", o.email, "invitation", inviteText(v), { html: inviteHtml(v) });
}
