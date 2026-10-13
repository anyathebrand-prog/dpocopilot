import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { INSTALL } from "@/lib/install";
import { getUser, home } from "@/lib/auth";
import { SITE_URL } from "@/lib/site-url";

// schema.org description of the product for search engines and AI assistants.
const LD = JSON.stringify({ "@context": "https://schema.org", "@graph": [
  { "@type": "Organization", name: "DPO Copilot", url: SITE_URL, logo: `${SITE_URL}/logo.png` },
  { "@type": "SoftwareApplication", name: "DPO Copilot", url: SITE_URL, applicationCategory: "BusinessApplication", operatingSystem: "Web", areaServed: "NG",
    description: "Compliance workspace for Nigerian Data Protection Compliance Organisations (DPCOs): NDPA 2023 and GAID 2025 DPIAs, DSARs, breach register, CAR readiness, policies and client portal.",
    offers: { "@type": "Offer", url: `${SITE_URL}/pricing`, priceCurrency: "NGN" } },
] }).replace(/</g, "\u003c");

export default async function SiteLayout({ children }: { children: ReactNode }) {
  // A DPCO's own install has no marketing site: everything starts at sign-in.
  if (INSTALL.singleFirm) { const u = await getUser(); redirect(u ? home(u) : "/sign-in"); }
  return (
    <div className="site">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: LD }} />
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
