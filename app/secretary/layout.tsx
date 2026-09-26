import type { ReactNode } from "react";
import { requireSecretary } from "@/lib/auth";
import { signOut } from "@/lib/auth-actions";
import { NavLink } from "@/components/client";

export default async function SecretaryLayout({ children }: { children: ReactNode }) {
  const u = await requireSecretary();
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">DPO Copilot<span>Secretary console</span></div>
        <nav className="nav" aria-label="Secretary">
          <NavLink href="/secretary" exact>Content home</NavLink>
          <NavLink href="/secretary/library">Regulatory library</NavLink>
          <NavLink href="/secretary/criteria">Major-importance criteria</NavLink>
          <NavLink href="/secretary/settings">Platform settings</NavLink>
          <NavLink href="/secretary/car-template">CAR checklist template</NavLink>
          <NavLink href="/secretary/publish">Publish and history</NavLink>
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <b style={{ marginRight: "auto" }}>Secretary console · platform content for all firms</b>
          <span className="meta">{u.name}</span>
          <form action={signOut}><button className="btn quiet">Sign out</button></form>
        </header>
        <main id="main" className="content">{children}</main>
      </div>
    </div>
  );
}
