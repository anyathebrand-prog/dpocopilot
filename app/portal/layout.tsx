import Link from "next/link";
import type { ReactNode } from "react";
import { UserRound } from "lucide-react";
import { requireContact } from "@/lib/auth";
import { one } from "@/lib/db";
import "@/components/console.css";

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const u = await requireContact();
  const c = await one("select name from clients where id = $1", [u.client_id]);
  return (
    <div className="cx cx-portal">
      {/* Inter, as on the public site. React hoists this into <head>. */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" precedence="default" />
      <header className="portal-top">
        <div className="inner">
          <div className="cx-portal-id">
            <Link href="/" className="cx-logo-pill" aria-label="DPO Copilot homepage">
              {/* eslint-disable-next-line @next/next/no-img-element -- small static PNG */}
              <img src="/logo.png" alt="DPO Copilot" width={601} height={162} />
            </Link>
            <div><b>{c!.name}</b><div className="cx-portal-firm">Compliance portal · {u.firm_name}</div></div>
          </div>
          <Link href="/account" className="cx-signout"><UserRound aria-hidden />Account</Link>
        </div>
      </header>
      <main id="main" className="portal">{children}</main>
    </div>
  );
}
