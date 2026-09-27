import "@fontsource/atkinson-hyperlegible-next/400.css";
import "@fontsource/atkinson-hyperlegible-next/700.css";
import "@fontsource/source-serif-4/400.css";
import "@fontsource/source-serif-4/600.css";
import "./globals.css";
import type { ReactNode } from "react";
import { PublicHeader } from "@/components/public-header";

export const metadata = { title: "DPO Copilot", description: "NDPA 2023 compliance workspace for Nigerian DPCOs" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-NG">
      <body>
        <a className="skip" href="#main">Skip to main content</a>
        <PublicHeader />
        {children}
      </body>
    </html>
  );
}
