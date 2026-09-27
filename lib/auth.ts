import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { q, one, type Tx } from "./db";
import { newToken, sha256 } from "./crypto";

export type Role = "firm_admin" | "lead_consultant" | "associate";
export type User = {
  id: string; name: string; email: string; mfa_enabled: boolean;
  kind: "firm" | "contact" | "secretary";
  firm_id: string; firm_name: string;
  membership_id?: string; role?: Role;
  client_id?: string; contact_id?: string;
};

export const ROLE_LABEL: Record<string, string> = { firm_admin: "Firm Admin", lead_consultant: "Lead Consultant", associate: "Associate" };

const COOKIE = "sid";

export async function createSession(userId: string, mfaOk: boolean, hours = 12) {
  const token = newToken();
  await q("insert into sessions (token_hash, user_id, mfa_ok, expires_at) values ($1,$2,$3, now() + make_interval(hours => $4))", [sha256(token), userId, mfaOk, hours]);
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: hours * 3600 });
}

export async function destroySession() {
  const c = await cookies();
  const t = c.get(COOKIE)?.value;
  if (t) await q("delete from sessions where token_hash = $1", [sha256(t)]);
  c.delete(COOKIE);
}

export async function getUser(): Promise<User | null> {
  const t = (await cookies()).get(COOKIE)?.value;
  if (!t) return null;
  const u = await one(`select u.id, u.name, u.email, u.platform_role, u.mfa_enabled from sessions s join users u on u.id = s.user_id
    where s.token_hash = $1 and s.expires_at > now() and s.mfa_ok and u.status = 'active'`, [sha256(t)]);
  if (!u) return null;
  if (u.platform_role === "secretary") return { ...base(u), kind: "secretary", firm_id: "", firm_name: "" };
  const m = await one("select m.id, m.firm_id, m.role, f.name as firm_name from memberships m join firms f on f.id = m.firm_id where m.user_id = $1 and m.status = 'active'", [u.id]);
  if (m) return { ...base(u), kind: "firm", firm_id: m.firm_id, firm_name: m.firm_name, membership_id: m.id, role: m.role };
  const c = await one("select cc.id, cc.client_id, cc.firm_id, f.name as firm_name from client_contacts cc join firms f on f.id = cc.firm_id join clients cl on cl.id = cc.client_id where cc.user_id = $1 and cc.status = 'active'", [u.id]);
  if (c) return { ...base(u), kind: "contact", firm_id: c.firm_id, firm_name: c.firm_name, client_id: c.client_id, contact_id: c.id };
  return null;
}
const base = (u: Record<string, any>) => ({ id: u.id, name: u.name, email: u.email, mfa_enabled: u.mfa_enabled });

/** Session that has passed the password but not yet the second factor (S02). */
export async function pendingMfaUser() {
  const t = (await cookies()).get(COOKIE)?.value;
  if (!t) return null;
  return one("select u.id, u.mfa_secret from sessions s join users u on u.id = s.user_id where s.token_hash = $1 and s.expires_at > now() and not s.mfa_ok", [sha256(t)]);
}
export async function markMfaPassed() {
  const t = (await cookies()).get(COOKIE)?.value;
  if (t) await q("update sessions set mfa_ok = true where token_hash = $1", [sha256(t)]);
}

/** NFR3: MFA mandatory for Firm Admin and Secretary. DEV_SKIP_MFA=1 bypasses it outside production only. */
export const mfaRequired = (u: User) =>
  (u.kind === "secretary" || u.role === "firm_admin") && !u.mfa_enabled && !(process.env.DEV_SKIP_MFA === "1" && process.env.NODE_ENV !== "production");

export const home = (u: User) => (u.kind === "firm" ? "/app" : u.kind === "contact" ? "/portal" : "/secretary");

async function need(kind: User["kind"]) {
  const u = await getUser();
  if (!u) redirect("/sign-in");
  if (u.kind !== kind) redirect("/forbidden");
  if (mfaRequired(u)) redirect("/setup/mfa");
  return u;
}
export const requireFirm = () => need("firm");
export const requireContact = () => need("contact");
export const requireSecretary = () => need("secretary");

export const canApprove = (u: User) => u.role === "firm_admin" || u.role === "lead_consultant";
export const isAdmin = (u: User) => u.role === "firm_admin";

export async function requireFirmRole(...roles: Role[]) {
  const u = await requireFirm();
  if (!roles.includes(u.role!)) redirect("/forbidden");
  return u;
}

/** SQL fragment limiting clients to what this firm user may see (FR1.3). Uses $1 = firm_id, $2 = membership_id. */
export const clientScope = (u: User, alias = "c") =>
  u.role === "associate"
    ? `${alias}.firm_id = $1 and exists (select 1 from client_assignments ca where ca.client_id = ${alias}.id and ca.membership_id = $2)`
    : `${alias}.firm_id = $1 and $2::uuid is not null`;
export const scopeArgs = (u: User) => [u.firm_id, u.membership_id];

/** FR1.4: every client page and action goes through here. Unassigned or foreign → 403, including by direct URL. */
export async function requireClient(clientId: string, opts: { write?: boolean } = {}) {
  const u = await requireFirm();
  if (!/^[0-9a-f-]{36}$/i.test(clientId)) redirect("/forbidden");
  const client = await one(`select c.* from clients c where c.id = $3 and ${clientScope(u)}`, [...scopeArgs(u), clientId]);
  if (!client) redirect("/forbidden");
  if (opts.write && client.archived_at) throw new Error("This client is archived and read-only.");
  return { user: u, client };
}

export async function audit(u: Pick<User, "id" | "firm_id" | "role" | "kind"> | null, action: string, entityType: string, entityId: string | null, extra: { client_id?: string; details?: object; firm_id?: string | null } = {}, t?: Tx) {
  const run = t ? t.query.bind(t) : (s: string, p: unknown[]) => q(s, p);
  await run("insert into audit_events (firm_id, client_id, actor_user_id, actor_role, action, entity_type, entity_id, details) values ($1,$2,$3,$4,$5,$6,$7,$8)", [
    extra.firm_id !== undefined ? extra.firm_id : u?.firm_id || null, extra.client_id ?? null, u?.id ?? null,
    u ? (u.role ?? u.kind) : "system", action, entityType, entityId, JSON.stringify(extra.details ?? {}),
  ]);
}

/**
 * Email/SMS carry no compliance content — only "log in to view" (TRD §9.1).
 * ponytail: no SMTP/SMS provider wired yet; messages are recorded and printed to the server log. Add a relay behind this function.
 */
export async function send(channel: "email" | "sms", recipient: string, template: string, devText: string) {
  await q("insert into outbound_messages (channel, recipient, template_key) values ($1,$2,$3)", [channel, recipient, template]);
  console.log(`[outbound ${channel} → ${recipient}] ${template}: ${devText}`);
}

/** In-app alerts. Breach recipients: assigned team + every Lead Consultant and Firm Admin (FLAG-8 default). */
export async function notifyTeam(firmId: string, clientId: string, kind: string, message: string, link: string) {
  const rows = await q<{ user_id: string; email: string }>(`select distinct m.user_id, u.email from memberships m join users u on u.id = m.user_id
    where m.firm_id = $1 and m.status = 'active' and (m.role in ('firm_admin','lead_consultant') or exists (select 1 from client_assignments ca where ca.membership_id = m.id and ca.client_id = $2))`, [firmId, clientId]);
  for (const r of rows) {
    await q("insert into notifications (firm_id, recipient_user_id, kind, message, link) values ($1,$2,$3,$4,$5)", [firmId, r.user_id, kind, message, link]);
    if (kind === "breach_reported") await send("email", r.email, "breach_alert", `You have a new urgent item. Log in to view: ${link}`);
  }
}

export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() ?? null;
}
