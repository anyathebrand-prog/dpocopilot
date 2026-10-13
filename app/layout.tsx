import "@fontsource/atkinson-hyperlegible-next/400.css";
import "@fontsource/atkinson-hyperlegible-next/700.css";
import "@fontsource/source-serif-4/400.css";
import "@fontsource/source-serif-4/600.css";
import "./globals.css";
import type { ReactNode } from "react";
import { PublicHeader } from "@/components/public-header";
import { connection } from "next/server";
import { INSTALL, headerBrand } from "@/lib/install";
import { COUNTRY } from "@/lib/country";
import { SITE_URL } from "@/lib/site-url";

const description = "NDPA 2023 and GAID 2025 compliance workspace for Nigerian DPCOs";
export const generateMetadata = () => ({
  metadataBase: new URL(SITE_URL),
  title: INSTALL.name, description,
  openGraph: { type: "website", siteName: INSTALL.name, title: INSTALL.name, description, url: "/" },
  twitter: { card: "summary_large_image", title: INSTALL.name, description },
});

export default async function RootLayout({ children }: { children: ReactNode }) {
  await connection(); // per-install branding (lib/install.ts) is read at request time, never baked in at build
  return (
    <html lang={COUNTRY.locale}>
      <body>
        <a className="skip" href="#main">Skip to main content</a>
        <PublicHeader brand={headerBrand} />
        {children}
      </body>
    </html>
  );
}
