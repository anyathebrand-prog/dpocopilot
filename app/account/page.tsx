import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser, home, audit, mfaRequired } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { hashPassword, verifyPassword, sha256 } from "@/lib/crypto";
import { signOut } from "@/lib/auth-actions";
import { cookies } from "next/headers";
import { str, flash } from "@/lib/form";
import { Flash, Field } from "@/components/ui";
import { Submit } from "@/components/client";

async function saveName(fd: FormData) {
  "use server";
  const u = await getUser();
  if (!u) redirect("/sign-in");
  if (str(fd, "name")) await q("update users set name = $2 where id = $1", [u.id, str(fd, "name")]);
  redirect(flash("/account", "Profile saved"));
}

async function changePassword(fd: FormData) {
  "use server";
  const u = await getUser();
  if (!u) redirect("/sign-in");
  const row = await one("select password_hash from users where id = $1", [u.id]);
  if (!verifyPassword(String(fd.get("current") ?? ""), row!.password_hash)) redirect(flash("/account", "Your current password is incorrect.", "error"));
  const next = String(fd.get("next") ?? "");
  if (next.length < 10) redirect(flash("/account", "Use a new password of at least 10 characters.", "error"));
  const token = (await cookies()).get("sid")?.value ?? "";
  await q("update users set password_hash = $2 where id = $1", [u.id, hashPassword(next)]);
  await q("delete from sessions where user_id = $1 and token_hash <> $2", [u.id, sha256(token)]);
  await audit(u, "update", "user", u.id, { details: { password_changed: true } });
  redirect(flash("/account", "Password changed. Other sessions were signed out."));
}

async function turnOffMfa() {
  "use server";
  const u = await getUser();
  if (!u) redirect("/sign-in");
  if (u.kind === "secretary" || u.role === "firm_admin") redirect(flash("/account", "Two-step sign-in is required for your role.", "error"));
  await q("update users set mfa_enabled = false, mfa_secret = null where id = $1", [u.id]);
  await audit(u, "update", "user", u.id, { details: { mfa_enabled: false } });
  redirect(flash("/account", "Two-step sign-in turned off"));
}

export default async function Account({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const u = await getUser();
  if (!u) redirect("/sign-in");
  if (mfaRequired(u)) redirect("/setup/mfa");
  const sp = await searchParams;
  return (
    <main id="main" className="portal" style={{ paddingTop: 32 }}>
      <p><Link href={home(u)}>Back to your home</Link></p>
      <h1>Account</h1>
      <Flash sp={sp} />
      <form action={saveName} className="panel">
        <Field label="Name"><input name="name" defaultValue={u.name} /></Field>
        <Field label="Email"><input value={u.email} readOnly /></Field>
        <Submit className="btn secondary">Save profile</Submit>
      </form>
      <form action={changePassword} className="panel">
        <h3>Change password</h3>
        <Field label="Current password"><input type="password" name="current" autoComplete="current-password" required /></Field>
        <Field label="New password" help="At least 10 characters."><input type="password" name="next" autoComplete="new-password" minLength={10} required /></Field>
        <Submit className="btn secondary">Change password</Submit>
      </form>
      <section className="panel">
        <h3>Two-step sign-in</h3>
        {u.mfa_enabled ? (
          <form action={turnOffMfa}><p>On.</p>{u.kind === "secretary" || u.role === "firm_admin" ? <p className="why">Required for your role, so it can&apos;t be turned off.</p> : <Submit className="btn secondary">Turn off</Submit>}</form>
        ) : <p>Off. <Link href="/setup/mfa">Set up two-step sign-in</Link></p>}
      </section>
      <form action={signOut} style={{ marginTop: 16 }}><Submit className="btn secondary">Sign out</Submit></form>
    </main>
  );
}
