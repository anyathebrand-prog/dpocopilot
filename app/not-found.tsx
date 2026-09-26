import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="auth">
      <h1>Page not found</h1>
      <p><Link href="/">Back to your home</Link></p>
    </main>
  );
}
