import Link from "next/link";
import type { ReactNode } from "react";

export default function SiteLayout({ children }: { children: ReactNode }) {
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
