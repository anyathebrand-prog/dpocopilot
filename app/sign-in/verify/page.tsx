import { redirect } from "next/navigation";
import { verifyMfa } from "@/lib/auth-actions";
import { pendingMfaUser } from "@/lib/auth";
import { Flash, Field } from "@/components/ui";
import { Submit } from "@/components/client";

export default async function Verify({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  if (!(await pendingMfaUser())) redirect("/sign-in");
  const sp = await searchParams;
  return (
    <main id="main" className="auth">
      <h1>Two-step sign-in</h1>
      <Flash sp={sp} />
      <form action={verifyMfa} className="panel">
        <Field label="6-digit code" help="Open your authenticator app and enter the code for DPO Copilot.">
          <input name="code" className="otp" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required autoFocus />
        </Field>
        <Submit>Verify</Submit>
      </form>
      <p className="meta" style={{ marginTop: 16 }}>Lost your device? Contact your firm administrator.</p>
    </main>
  );
}
