import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { setupMfa } from "@/lib/auth-actions";
import { getUser } from "@/lib/auth";
import { newTotpSecret } from "@/lib/crypto";
import { Flash, Field } from "@/components/ui";
import { Submit } from "@/components/client";
import { INSTALL } from "@/lib/install";

export default async function SetupMfa({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const u = await getUser();
  if (!u) redirect("/sign-in");
  const sp = await searchParams;
  const secret = /^[A-Z2-7]{32}$/.test(sp.s ?? "") ? sp.s : newTotpSecret();
  const uri = `otpauth://totp/${encodeURIComponent(INSTALL.name)}:${encodeURIComponent(u.email)}?secret=${secret}&issuer=${encodeURIComponent(INSTALL.name)}`;
  const qr = await QRCode.toString(uri, { type: "svg", margin: 1, width: 200 });
  return (
    <main id="main" className="auth" style={{ maxWidth: 480 }}>
      <h1>Set up two-step sign-in</h1>
      <p>Your role needs a second step when you sign in. Add {INSTALL.name} to an authenticator app such as Google Authenticator or Microsoft Authenticator.</p>
      <Flash sp={sp} />
      <form action={setupMfa} className="panel">
        <input type="hidden" name="secret" value={secret} />
        <p><b>1.</b> In your app, tap <b>+</b> then <b>Scan a QR code</b>, and scan this:</p>
        {/* SVG generated on the server from our own otpauth URI */}
        <div role="img" aria-label="QR code for your authenticator app" style={{ width: 200, height: 200, margin: "0 auto 12px", background: "#fff" }} dangerouslySetInnerHTML={{ __html: qr }} />
        <p>Can&apos;t scan? Choose &quot;Enter a setup key&quot; instead and type this key (time-based):</p>
        <p className="num" style={{ fontSize: 20, letterSpacing: "0.1em", wordBreak: "break-all", background: "var(--sunken)", padding: 12 }}>{secret.match(/.{1,4}/g)!.join(" ")}</p>
        <p className="caption">On a phone, you can <a href={uri}>open it in your authenticator app</a> instead.</p>
        <p><b>2.</b> Enter the 6-digit code your app shows.</p>
        <Field label="6-digit code"><input name="code" className="otp" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required /></Field>
        <Submit>Turn on two-step sign-in</Submit>
      </form>
    </main>
  );
}
