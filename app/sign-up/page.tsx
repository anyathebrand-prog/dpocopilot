import Link from "next/link";
import { signUp } from "@/lib/auth-actions";
import { Flash, Field } from "@/components/ui";
import { Submit } from "@/components/client";

// FLAG-1: sign-up is open in V1 by default. Make it invite-only here if pilot firms are set up by hand.
export default async function SignUp({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  return (
    <main id="main" className="auth">
      <h1>Create a firm account</h1>
      <p className="meta" style={{ textAlign: "center" }}>You will be the firm&apos;s first Firm Admin.</p>
      <Flash sp={sp} />
      <form action={signUp} className="panel">
        <Field label="Your full name" required><input name="name" autoComplete="name" required /></Field>
        <Field label="Work email" required><input type="email" name="email" autoComplete="email" required /></Field>
        <Field label="Password" help="At least 10 characters." required><input type="password" name="password" autoComplete="new-password" minLength={10} required /></Field>
        <Field label="Firm name" required><input name="firm" autoComplete="organization" required /></Field>
        <Submit>Create firm</Submit>
      </form>
      <p className="meta" style={{ marginTop: 16 }}>Already have an account? <Link href="/sign-in">Sign in</Link></p>
    </main>
  );
}
