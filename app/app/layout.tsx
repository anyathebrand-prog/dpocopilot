import Link from "next/link";
import type { ReactNode } from "react";
import { Users, ListChecks, Calendar, MessageSquareText, Upload, Settings, Bell, Menu, LayoutList } from "lucide-react";
import { requireFirm, isAdmin, ROLE_LABEL } from "@/lib/auth";
import { one } from "@/lib/db";
import { signOut } from "@/lib/auth-actions";
import { NavLink } from "@/components/client";

export default async function FirmLayout({ children }: { children: ReactNode }) {
  const u = await requireFirm();
  const n = await one<{ n: number }>("select count(*)::int as n from notifications where recipient_user_id = $1 and read_at is null", [u.id]);
  return (
    <div className="shell">
      <aside className="sidebar">
        <details open>
          <summary className="brand">
            <span className="row" style={{ justifyContent: "space-between", fontSize: 18, color: "var(--ink-900)", fontWeight: 700 }}>
              DPO Copilot <span className="menu-toggle btn quiet" aria-label="Menu"><Menu aria-hidden /></span>
            </span>
            <span>{u.firm_name}</span>
          </summary>
          <nav className="nav" aria-label="Main">
            <NavLink href="/app" exact><LayoutList aria-hidden size={18} />Clients</NavLink>
            <NavLink href="/app/tasks"><ListChecks aria-hidden size={18} />Tasks</NavLink>
            <NavLink href="/app/calendar"><Calendar aria-hidden size={18} />Calendar</NavLink>
            <NavLink href="/app/ask"><MessageSquareText aria-hidden size={18} />Ask</NavLink>
            {isAdmin(u) && <NavLink href="/app/import"><Upload aria-hidden size={18} />Import</NavLink>}
            {isAdmin(u) && <NavLink href="/app/settings/team"><Users aria-hidden size={18} />Team</NavLink>}
            {isAdmin(u) && <NavLink href="/app/settings/activity"><Settings aria-hidden size={18} />Activity log</NavLink>}
          </nav>
        </details>
      </aside>
      <div className="main">
        <header className="topbar">
          <Link href="/app/notifications" className="notif btn quiet" aria-label={`Notifications, ${n?.n ?? 0} unread`}>
            <Bell aria-hidden />{!!n?.n && <span className="count num">{n.n}</span>}
          </Link>
          <Link href="/account" className="meta">{u.name} · {ROLE_LABEL[u.role!]}</Link>
          <form action={signOut}><button className="btn quiet">Sign out</button></form>
        </header>
        <main id="main" className="content">{children}</main>
      </div>
    </div>
  );
}
