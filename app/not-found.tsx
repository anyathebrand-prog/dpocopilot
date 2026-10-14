import Link from "next/link";
import { getUser, home } from "@/lib/auth";

export default async function NotFound() {
  const u = await getUser();
  return (
    <main id="main" className="auth">
      <h1>Page not found</h1>
      <p><Link href={u ? home(u) : "/"}>Back to your home</Link></p>
    </main>
  );
}
