import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { INSTALL } from "@/lib/install";
import { getUser, home } from "@/lib/auth";

export default async function SiteLayout({ children }: { children: ReactNode }) {
  // A DPCO's own install has no marketing site: everything starts at sign-in.
  if (INSTALL.singleFirm) { const u = await getUser(); redirect(u ? home(u) : "/sign-in"); }
  return (
    <div className="site">
      <main id="main">{children}</main>
      <footer className="site-footer">
        <div className="site-inner spread">
          <span>DPO Copilot · NDPA 2023 compliance workspace for Nigerian DPCOs</span>
          <nav aria-label="Legal" className="row"><Link href="/privacy">Privacy notice</Link><Link href="/terms">Terms</Link></nav>
        </div>
      </footer>
    </div>
  );
}
