import { redirect } from "next/navigation";
import { setupMfa } from "@/lib/auth-actions";
import { getUser } from "@/lib/auth";
import { newTotpSecret } from "@/lib/crypto";
import { Flash, Field } from "@/components/ui";
import { Submit } from "@/components/client";

export default async function SetupMfa({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const u = await getUser();
  if (!u) redirect("/sign-in");
  const sp = await searchParams;
  const secret = /^[A-Z2-7]{32}$/.test(sp.s ?? "") ? sp.s : newTotpSecret();
  const uri = `otpauth://totp/DPO%20Copilot:${encodeURIComponent(u.email)}?secret=${secret}&issuer=DPO%20Copilot`;
  return (
    <main id="main" className="auth" style={{ maxWidth: 480 }}>
      <h1>Set up two-step sign-in</h1>
      <p>Your role needs a second step when you sign in. Add DPO Copilot to an authenticator app such as Google Authenticator or Microsoft Authenticator.</p>
      <Flash sp={sp} />
      <form action={setupMfa} className="panel">
        <input type="hidden" name="secret" value={secret} />
        <p><b>1.</b> In your app, choose &quot;Enter a setup key&quot; and type this key:</p>
        <p className="num" style={{ fontSize: 20, letterSpacing: "0.1em", wordBreak: "break-all", background: "var(--sunken)", padding: 12 }}>{secret.match(/.{1,4}/g)!.join(" ")}</p>
        <p className="caption">On a phone, you can <a href={uri}>open it in your authenticator app</a> instead.</p>
        <p><b>2.</b> Enter the 6-digit code your app shows.</p>
        <Field label="6-digit code"><input name="code" className="otp" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required /></Field>
        <Submit>Turn on two-step sign-in</Submit>
      </form>
    </main>
  );
}
