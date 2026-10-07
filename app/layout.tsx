import "@fontsource/atkinson-hyperlegible-next/400.css";
import "@fontsource/atkinson-hyperlegible-next/700.css";
import "@fontsource/source-serif-4/400.css";
import "@fontsource/source-serif-4/600.css";
import "./globals.css";
import type { ReactNode } from "react";
import { PublicHeader } from "@/components/public-header";
import { connection } from "next/server";
import { INSTALL, headerBrand } from "@/lib/install";

export const generateMetadata = () => ({ title: INSTALL.name, description: "NDPA 2023 compliance workspace" });

export default async function RootLayout({ children }: { children: ReactNode }) {
  await connection(); // per-install branding (lib/install.ts) is read at request time, never baked in at build
  return (
    <html lang="en-NG">
      <body>
        <a className="skip" href="#main">Skip to main content</a>
        <PublicHeader brand={headerBrand} />
        {children}
      </body>
    </html>
  );
}
