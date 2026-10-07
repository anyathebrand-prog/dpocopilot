import Link from "next/link";
import type { ReactNode } from "react";
import { Users, ListChecks, Calendar, MessageSquareText, Upload, Settings, Bell, Menu, LayoutList, LogOut, Building2 } from "lucide-react";
import { requireFirm, isAdmin, ROLE_LABEL } from "@/lib/auth";
import { one } from "@/lib/db";
import { signOut } from "@/lib/auth-actions";
import { NavLink } from "@/components/client";
import "@/components/console.css";
import { INSTALL } from "@/lib/install";

export default async function FirmLayout({ children }: { children: ReactNode }) {
  const u = await requireFirm();
  const n = await one<{ n: number }>("select count(*)::int as n from notifications where recipient_user_id = $1 and read_at is null", [u.id]);
  return (
    <div className="shell cx">
      {/* Inter, as on the public site. React hoists this into <head>. */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" precedence="default" />
      <aside className="sidebar">
        <details open>
          <summary className="brand">
            <span className="cx-brand-row">
              {/* eslint-disable-next-line @next/next/no-img-element -- small static PNG */}
              <img src={INSTALL.logo} alt={INSTALL.name} />
              <span className="menu-toggle cx-menu" aria-label="Menu"><Menu aria-hidden /></span>
            </span>
            <span className="cx-pill">{u.firm_name}</span>
          </summary>
          <nav className="nav" aria-label="Main">
            <NavLink href="/app" exact><LayoutList aria-hidden />Clients</NavLink>
            <NavLink href="/app/tasks"><ListChecks aria-hidden />Tasks</NavLink>
            <NavLink href="/app/calendar"><Calendar aria-hidden />Calendar</NavLink>
            <NavLink href="/app/ask"><MessageSquareText aria-hidden />Ask</NavLink>
            {isAdmin(u) && <NavLink href="/app/import"><Upload aria-hidden />Import</NavLink>}
            {isAdmin(u) && <NavLink href="/app/settings/firm"><Building2 aria-hidden />Firm profile</NavLink>}
            {isAdmin(u) && <NavLink href="/app/settings/team"><Users aria-hidden />Team</NavLink>}
            {isAdmin(u) && <NavLink href="/app/settings/activity"><Settings aria-hidden />Activity log</NavLink>}
          </nav>
        </details>
      </aside>
      <div className="main">
        <header className="topbar">
          <span className="cx-top">Firm workspace</span>
          <Link href="/app/notifications" className="notif cx-icon" aria-label={`Notifications, ${n?.n ?? 0} unread`}>
            <Bell aria-hidden />{!!n?.n && <span className="count num">{n.n}</span>}
          </Link>
          <Link href="/account" className="cx-user">{u.name} · {ROLE_LABEL[u.role!]}</Link>
          <form action={signOut}><button className="cx-signout"><LogOut aria-hidden />Sign out</button></form>
        </header>
        <main id="main" className="content">{children}</main>
      </div>
    </div>
  );
}
