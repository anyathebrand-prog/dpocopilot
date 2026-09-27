"use server";
import { redirect } from "next/navigation";
import { q, one, tx } from "./db";
import { hashPassword, verifyPassword, sha256, verifyTotp } from "./crypto";
import { createSession, destroySession, getUser, pendingMfaUser, markMfaPassed, audit, clientIp } from "./auth";
import { str, flash } from "./form";

// ponytail: in-memory login throttle (one app instance). Move to the rate_limits table (schema §2) when running 2+ instances.
const attempts = new Map<string, { n: number; since: number }>();
function throttled(key: string) {
  const a = attempts.get(key);
  if (a && Date.now() - a.since > 15 * 60_000) attempts.delete(key);
  return (attempts.get(key)?.n ?? 0) >= 8;
}
const fail = (key: string) => { const a = attempts.get(key) ?? { n: 0, since: Date.now() }; a.n++; attempts.set(key, a); };

const validPassword = (p: string) => p.length >= 10;

export async function signIn(fd: FormData) {
  const email = str(fd, "email").toLowerCase(), password = String(fd.get("password") ?? "");
  const key = `${email}|${await clientIp()}`;
  if (throttled(key)) redirect(flash("/sign-in", "Too many attempts. Try again in 15 minutes.", "error"));
  const u = await one("select * from users where lower(email) = $1", [email]);
  if (!u || !verifyPassword(password, u.password_hash)) {
    fail(key);
    await audit(null, "login_failed", "user", u?.id ?? null, { firm_id: null, details: {} });
    redirect(flash("/sign-in", "Email or password is incorrect.", "error"));
  }
  const m = await one("select firm_id, role, status from memberships where user_id = $1", [u.id]);
  const c = await one("select firm_id, client_id, status from client_contacts where user_id = $1", [u.id]);
  if (u.status !== "active" || m?.status === "deactivated" || (!m && !c && u.platform_role !== "secretary") || (c && c.status !== "active"))
    redirect(flash("/sign-in", "Your access has been removed. Contact your firm administrator.", "error"));
  attempts.delete(key);
  await createSession(u.id, !u.mfa_enabled, u.platform_role === "secretary" ? 2 : 12);
  await audit({ id: u.id, firm_id: m?.firm_id ?? c?.firm_id ?? "", role: m?.role, kind: m ? "firm" : c ? "contact" : "secretary" }, "login", "user", u.id, { firm_id: m?.firm_id ?? c?.firm_id ?? null });
  redirect(u.mfa_enabled ? "/sign-in/verify" : "/");
}

export async function verifyMfa(fd: FormData) {
  const p = await pendingMfaUser();
  if (!p) redirect("/sign-in");
  if (throttled(`mfa|${p.id}`)) { await destroySession(); redirect(flash("/sign-in", "Too many wrong codes. Sign in again later.", "error")); }
  if (!verifyTotp(p.mfa_secret, str(fd, "code"))) { fail(`mfa|${p.id}`); redirect(flash("/sign-in/verify", "That code didn't work. Check your authenticator app and try again.", "error")); }
  await markMfaPassed();
  redirect("/");
}

export async function setupMfa(fd: FormData) {
  const u = await getUser();
  if (!u) redirect("/sign-in");
  const secret = str(fd, "secret");
  if (!/^[A-Z2-7]{32}$/.test(secret) || !verifyTotp(secret, str(fd, "code")))
    redirect(flash(`/setup/mfa?s=${secret}`, "That code didn't match. Enter the current 6-digit code from your app.", "error"));
  await q("update users set mfa_secret = $2, mfa_enabled = true where id = $1", [u.id, secret]);
  await audit(u, "update", "user", u.id, { details: { mfa_enabled: true } });
  redirect(flash(u.kind === "firm" ? "/app" : u.kind === "contact" ? "/portal" : "/secretary", "Two-step sign-in is on"));
}

export async function signUp(fd: FormData) {
  const name = str(fd, "name"), email = str(fd, "email").toLowerCase(), password = String(fd.get("password") ?? ""), firm = str(fd, "firm");
  if (!name || !firm || !/^\S+@\S+\.\S+$/.test(email)) redirect(flash("/sign-up", "Enter your name, a valid email and your firm's name.", "error"));
  if (!validPassword(password)) redirect(flash("/sign-up", "Use a password of at least 10 characters.", "error"));
  if (await one("select 1 from users where lower(email) = $1", [email])) redirect(flash("/sign-up", "An account with this email exists. Sign in instead.", "error"));
  const ids = await tx(async (t) => {
    const u = await t.query<{ id: string }>("insert into users (name, email, password_hash) values ($1,$2,$3) returning id", [name, email, hashPassword(password)]);
    const f = await t.query<{ id: string }>("insert into firms (name, created_by) values ($1,$2) returning id", [firm, u.rows[0].id]);
    await t.query("insert into memberships (firm_id, user_id, role) values ($1,$2,'firm_admin')", [f.rows[0].id, u.rows[0].id]);
    await audit({ id: u.rows[0].id, firm_id: f.rows[0].id, role: "firm_admin", kind: "firm" }, "create", "firm", f.rows[0].id, {}, t);
    return u.rows[0].id;
  });
  await createSession(ids, true);
  redirect("/app");
}

export async function acceptInvite(fd: FormData) {
  const token = str(fd, "token"), name = str(fd, "name"), password = String(fd.get("password") ?? "");
  const inv = await one("select * from invitations where token_hash = $1 and status = 'pending' and expires_at > now()", [sha256(token)]);
  if (!inv) redirect("/invite/expired");
  const self = `/invite/${token}`;
  if (!name) redirect(flash(self, "Enter your name.", "error"));
  if (!validPassword(password)) redirect(flash(self, "Use a password of at least 10 characters.", "error"));
  if (await one("select 1 from users where lower(email) = lower($1)", [inv.email])) redirect(flash(self, "This email already has an account. Sign in, or ask for an invitation to a different email.", "error"));
  const userId = await tx(async (t) => {
    const u = await t.query<{ id: string }>("insert into users (name, email, password_hash) values ($1,$2,$3) returning id", [name, inv.email.toLowerCase(), hashPassword(password)]);
    const id = u.rows[0].id;
    if (inv.role === "client_contact") await t.query("update client_contacts set user_id = $2, status = 'active', name = $3 where id = $1", [inv.contact_id, id, name]);
    else await t.query("insert into memberships (firm_id, user_id, role) values ($1,$2,$3)", [inv.firm_id, id, inv.role]);
    await t.query("update invitations set status = 'accepted' where id = $1", [inv.id]);
    await audit({ id, firm_id: inv.firm_id, role: inv.role === "client_contact" ? undefined : inv.role, kind: inv.role === "client_contact" ? "contact" : "firm" }, "create", "user", id, { client_id: inv.client_id ?? undefined, details: { accepted_invitation: inv.role } }, t);
    return id;
  });
  await createSession(userId, true);
  redirect("/");
}

export async function signOut() {
  const u = await getUser();
  if (u) await audit(u, "logout", "user", u.id);
  await destroySession();
  redirect("/sign-in");
}
