import Link from "next/link";

export default function Forbidden() {
  return (
    <main id="main" className="auth">
      <h1>You don&apos;t have access to this page</h1>
      <p>If you think you should, ask your firm administrator.</p>
      <p><Link href="/">Back to your home</Link></p>
    </main>
  );
}
