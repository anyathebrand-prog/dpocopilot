import type { ReactNode } from "react";
import { House, Library, Scale, SlidersHorizontal, ListChecks, Send, LogOut } from "lucide-react";
import { requireSecretary } from "@/lib/auth";
import { signOut } from "@/lib/auth-actions";
import { NavLink } from "@/components/client";
import "@/components/secretary.css";

export default async function SecretaryLayout({ children }: { children: ReactNode }) {
  const u = await requireSecretary();
  return (
    <div className="shell sec">
      {/* Inter, as on the public site. React hoists this into <head>. */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" precedence="default" />
      <aside className="sidebar">
        <div className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element -- small static PNG */}
          <img src="/logo.png" alt="DPO Copilot" width={601} height={162} />
          <span className="sec-pill">Secretary console</span>
        </div>
        <nav className="nav" aria-label="Secretary">
          <NavLink href="/secretary" exact><House aria-hidden />Content home</NavLink>
          <NavLink href="/secretary/library"><Library aria-hidden />Regulatory library</NavLink>
          <NavLink href="/secretary/criteria"><Scale aria-hidden />Major-importance criteria</NavLink>
          <NavLink href="/secretary/settings"><SlidersHorizontal aria-hidden />Platform settings</NavLink>
          <NavLink href="/secretary/car-template"><ListChecks aria-hidden />CAR checklist template</NavLink>
          <NavLink href="/secretary/publish"><Send aria-hidden />Publish and history</NavLink>
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <span className="sec-top">Platform content for all firms</span>
          <span className="sec-user">{u.name}</span>
          <form action={signOut}><button className="sec-signout"><LogOut aria-hidden />Sign out</button></form>
        </header>
        <main id="main" className="content">{children}</main>
      </div>
    </div>
  );
}
