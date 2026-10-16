import Link from "next/link";
import { one } from "@/lib/db";
import { sha256 } from "@/lib/crypto";
import { acceptInvite } from "@/lib/auth-actions";
import { ROLE_LABEL } from "@/lib/auth";
import { Flash, Field } from "@/components/ui";
import { Submit } from "@/components/client";

// Our logo is mint on transparent, so it sits on a navy badge to read on the light page.
const Logo = () => (
  <div style={{ background: "#0b1220", borderRadius: 12, padding: "14px 20px", width: "fit-content", margin: "0 auto 20px" }}>
    {/* eslint-disable-next-line @next/next/no-img-element -- static logo */}
    <img src="/logo.png" alt="DPO Copilot" width={160} height={43} style={{ display: "block", height: "auto" }} />
  </div>
);

export default async function Invite({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<Record<string, string>> }) {
  const { token } = await params;
  const sp = await searchParams;
  const inv = await one(`select i.*, f.name as firm_name, c.name as client_name from invitations i join firms f on f.id = i.firm_id left join clients c on c.id = i.client_id
    where i.token_hash = $1 and i.status = 'pending' and i.expires_at > now()`, [sha256(token)]);
  if (!inv) return (
    <main id="main" className="auth">
      <Logo />
      <h1>This invitation has expired</h1>
      <p>Each invitation works once and lasts 7 days. Ask whoever invited you to send a new one.</p>
      <p><Link href="/sign-in">Go to sign in</Link></p>
    </main>
  );
  return (
    <main id="main" className="auth">
      <Logo />
      <h1>Sign in to {inv.firm_name}</h1>
      <p style={{ textAlign: "center" }}>
        {inv.role === "client_contact"
          ? <>You&apos;ve been invited to view and complete compliance work for <b>{inv.client_name}</b>.</>
          : <>You&apos;ve been invited as <b>{ROLE_LABEL[inv.role]}</b>.</>}
      </p>
      <Flash sp={sp} />
      <form action={acceptInvite} className="panel">
        <input type="hidden" name="token" value={token} />
        <Field label="Email"><input value={inv.email} readOnly /></Field>
        <Field label="Your full name" required><input name="name" autoComplete="name" required /></Field>
        <Field label="Create a password" help="At least 10 characters." required><input type="password" name="password" autoComplete="new-password" minLength={10} required /></Field>
        <Submit>Sign in</Submit>
      </form>
    </main>
  );
}
