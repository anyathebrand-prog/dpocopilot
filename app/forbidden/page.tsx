import Link from "next/link";
import { getUser, home } from "@/lib/auth";

export default async function Forbidden() {
  const u = await getUser();
  return (
    <main id="main" className="auth">
      <h1>You don&apos;t have access to this page</h1>
      <p>If you think you should, ask your firm administrator.</p>
      <p><Link href={u ? home(u) : "/"}>Back to your home</Link></p>
    </main>
  );
}
