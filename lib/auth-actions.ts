"use server";
import { redirect } from "next/navigation";
import { q, one, tx } from "./db";
import { hashPassword, verifyPassword, sha256, verifyTotp } from "./crypto";
import { createSession, destroySession, getUser, pendingMfaUser, markMfaPassed, audit, clientIp, home } from "./auth";
import { str, flash } from "./form";
import { readDoc, linkedinOk, NG_STATES } from "./solo-profile";
import { signUpOpen } from "./install";

// Login/MFA throttle: 8 failures per key in a 15-minute window (login_attempts table, shared across restarts and instances).
async function throttled(key: string) {
  await q("delete from login_attempts where key = $1 and since < now() - interval '15 minutes'", [key]);
  return ((await one<{ n: number }>("select n from login_attempts where key = $1", [key]))?.n ?? 0) >= 8;
}
const fail = (key: string) => q("insert into login_attempts (key, n) values ($1, 1) on conflict (key) do update set n = login_attempts.n + 1", [key]);
const clearAttempts = (key: string) => q("delete from login_attempts where key = $1", [key]);

const validPassword = (p: string) => p.length >= 10;


/** After sign-in: straight to the user's own home (the public homepage no longer redirects signed-in users). */
async function toHome(): Promise<never> {
  const u = await getUser();
  redirect(u ? home(u) : "/sign-in");
}

export async function signIn(fd: FormData) {
  const email = str(fd, "email").toLowerCase(), password = String(fd.get("password") ?? "");
  const key = `${email}|${await clientIp()}`;
  if (await throttled(key)) redirect(flash("/sign-in", "Too many attempts. Try again in 15 minutes.", "error"));
  const u = await one("select * from users where lower(email) = $1", [email]);
  if (!u || !verifyPassword(password, u.password_hash)) {
    await fail(key);
    await audit(null, "login_failed", "user", u?.id ?? null, { firm_id: null, details: {} });
    redirect(flash("/sign-in", "Email or password is incorrect.", "error"));
  }
  const m = await one("select firm_id, role, status from memberships where user_id = $1", [u.id]);
  const c = await one("select firm_id, client_id, status from client_contacts where user_id = $1", [u.id]);
  if (u.status !== "active" || m?.status === "deactivated" || (!m && !c && u.platform_role !== "secretary") || (c && c.status !== "active"))
    redirect(flash("/sign-in", "Your access has been removed. Contact your firm administrator.", "error"));
  await clearAttempts(key);
  // DEV_SKIP_MFA=1 (never in production) also skips the code step for accounts that already enrolled.
  const askCode = u.mfa_enabled && !(process.env.DEV_SKIP_MFA === "1" && process.env.NODE_ENV !== "production");
  await createSession(u.id, !askCode, u.platform_role === "secretary" ? 2 : 12);
  await audit({ id: u.id, firm_id: m?.firm_id ?? c?.firm_id ?? "", role: m?.role, kind: m ? "firm" : c ? "contact" : "secretary" }, "login", "user", u.id, { firm_id: m?.firm_id ?? c?.firm_id ?? null });
  if (askCode) redirect("/sign-in/verify");
  await toHome();
}

export async function verifyMfa(fd: FormData) {
  const p = await pendingMfaUser();
  if (!p) redirect("/sign-in");
  if (await throttled(`mfa|${p.id}`)) { await destroySession(); redirect(flash("/sign-in", "Too many wrong codes. Sign in again later.", "error")); }
  if (!verifyTotp(p.mfa_secret, str(fd, "code"))) { await fail(`mfa|${p.id}`); redirect(flash("/sign-in/verify", "That code didn't work. Check your authenticator app and try again.", "error")); }
  await markMfaPassed();
  await toHome();
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
  const token = str(fd, "token"), solo = str(fd, "plan") === "solo";
  const back = token ? `/sign-up?token=${encodeURIComponent(token)}` : solo ? "/sign-up?plan=solo" : "/sign-up";
  if (!(await signUpOpen(token))) redirect(flash("/sign-in", "This workspace is already set up. Sign in, or ask your firm administrator for an invitation.", "error"));
  const name = str(fd, "name"), email = str(fd, "email").toLowerCase(), password = String(fd.get("password") ?? ""), firm = solo ? str(fd, "name") : str(fd, "firm"); // a Solo DPO's practice carries their own name
  if (!name || !firm || !/^\S+@\S+\.\S+$/.test(email)) redirect(flash(back, solo ? "Enter your name and a valid email." : "Enter your name, a valid email and your firm's name.", "error"));
  if (!validPassword(password)) redirect(flash(back, "Use a password of at least 10 characters.", "error"));
  if (await one("select 1 from users where lower(email) = $1", [email])) redirect(flash(back, "An account with this email exists. Sign in instead.", "error"));
  // Solo DPO: professional details, shown to the DPCO they ask to work under.
  let profile: unknown[] | null = null;
  if (solo) {
    const years = Number(str(fd, "years_experience")), linkedin = str(fd, "linkedin");
    const cert = await readDoc(fd.get("cert_file")), cv = await readDoc(fd.get("cv_file"));
    if (!str(fd, "phone") || !NG_STATES.includes(str(fd, "state")) || !Number.isInteger(years) || years < 0 || years > 60 || !str(fd, "certification"))
      redirect(flash(back, "Enter your phone number, state, years of experience and certification.", "error"));
    if (!cert || cert === "bad") redirect(flash(back, "Upload your certificate as a PDF, PNG or JPEG under 5 MB.", "error"));
    if (cv === "bad") redirect(flash(back, "Upload your CV as a PDF, PNG or JPEG under 5 MB.", "error"));
    if (!linkedinOk(linkedin)) redirect(flash(back, "Enter your LinkedIn profile as a full link (https://www.linkedin.com/in/…).", "error"));
    if (!cv && !linkedin) redirect(flash(back, "Upload your CV or give your LinkedIn profile.", "error"));
    profile = [str(fd, "phone").slice(0, 40), str(fd, "state"), years, str(fd, "certification").slice(0, 300), null, linkedin || null,
      cert.bytes, cert.mime, cert.name, cv?.bytes ?? null, cv?.mime ?? null, cv?.name ?? null];
  }
  const ids = await tx(async (t) => {
    const u = await t.query<{ id: string }>("insert into users (name, email, password_hash) values ($1,$2,$3) returning id", [name, email, hashPassword(password)]);
    const f = await t.query<{ id: string }>("insert into firms (name, created_by, plan) values ($1,$2,$3) returning id", [firm, u.rows[0].id, solo ? "solo" : "firm"]);
    if (profile) await t.query(`insert into solo_profiles (firm_id, phone, state, years_experience, certification, ndpc_number, linkedin, cert_file, cert_mime, cert_name, cv_file, cv_mime, cv_name)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`, [f.rows[0].id, ...profile]);
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
  await toHome();
}

export async function signOut() {
  const u = await getUser();
  if (u) await audit(u, "logout", "user", u.id);
  await destroySession();
  redirect("/sign-in");
}
