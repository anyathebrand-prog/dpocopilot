import Link from "next/link";
import { signIn } from "@/lib/auth-actions";
import { Flash, Field } from "@/components/ui";
import { Submit } from "@/components/client";

export default async function SignIn({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  return (
    <main id="main" className="auth">
      <h1>DPO Copilot</h1>
      <p className="meta" style={{ textAlign: "center" }}>Sign in to your workspace</p>
      <Flash sp={sp} />
      <form action={signIn} className="panel">
        <Field label="Email"><input type="email" name="email" autoComplete="email" required /></Field>
        <Field label="Password"><input type="password" name="password" autoComplete="current-password" required /></Field>
        <Submit>Sign in</Submit>
      </form>
      <p className="meta" style={{ marginTop: 16 }}>New DPCO firm? <Link href="/sign-up">Create a firm account</Link></p>
    </main>
  );
}
