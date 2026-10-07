import type { ReactNode } from "react";
import { House, Library, Scale, SlidersHorizontal, ListChecks, Send, LogOut, Newspaper } from "lucide-react";
import { requireSecretary } from "@/lib/auth";
import { signOut } from "@/lib/auth-actions";
import { NavLink } from "@/components/client";
import "@/components/console.css";
import { INSTALL } from "@/lib/install";

export default async function SecretaryLayout({ children }: { children: ReactNode }) {
  const u = await requireSecretary();
  return (
    <div className="shell cx">
      {/* Inter, as on the public site. React hoists this into <head>. */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" precedence="default" />
      <aside className="sidebar">
        <div className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element -- small static PNG */}
          <img src={INSTALL.logo} alt={INSTALL.name} />
          <span className="cx-pill">Secretary console</span>
        </div>
        <nav className="nav" aria-label="Secretary">
          <NavLink href="/secretary" exact><House aria-hidden />Content home</NavLink>
          <NavLink href="/secretary/library"><Library aria-hidden />Regulatory library</NavLink>
          <NavLink href="/secretary/criteria"><Scale aria-hidden />Major-importance criteria</NavLink>
          <NavLink href="/secretary/settings"><SlidersHorizontal aria-hidden />Platform settings</NavLink>
          <NavLink href="/secretary/car-template"><ListChecks aria-hidden />CAR checklist template</NavLink>
          <NavLink href="/secretary/publish"><Send aria-hidden />Publish and history</NavLink>
          <NavLink href="/secretary/blog"><Newspaper aria-hidden />Blog</NavLink>
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <span className="cx-top">Platform content for all firms</span>
          <span className="cx-user">{u.name}</span>
          <form action={signOut}><button className="cx-signout"><LogOut aria-hidden />Sign out</button></form>
        </header>
        <main id="main" className="content">{children}</main>
      </div>
    </div>
  );
}
