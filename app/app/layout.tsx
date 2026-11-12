import { redirect } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { Users, ListChecks, Calendar, MessageSquareText, Upload, Settings, Bell, Menu, LayoutList, LogOut, Building2, Receipt, FileSignature, BookOpen, Mail, SearchCheck, UserCheck, Wallet, Banknote, Scale } from "lucide-react";
import { requireFirm, isAdmin, canApprove, ROLE_LABEL, planName } from "@/lib/auth";
import { one } from "@/lib/db";
import { signOut } from "@/lib/auth-actions";
import { NavLink } from "@/components/client";
import "@/components/console.css";
import { INSTALL } from "@/lib/install";
import { Banner } from "@/components/ui";
import { subscriptionOf } from "@/lib/subscription";
import { fmtDate, daysUntil, todayWAT } from "@/lib/rules";
import { CreditCard } from "lucide-react";

export default async function FirmLayout({ children }: { children: ReactNode }) {
  const u = await requireFirm();
  const n = await one<{ n: number }>("select count(*)::int as n from notifications where recipient_user_id = $1 and read_at is null", [u.id]);
  const sub = await subscriptionOf(u), left = sub.ends ? daysUntil(sub.ends, todayWAT()) : null;
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
            <span className="meta" style={{ display: "block", marginTop: 4, fontSize: 12 }}>{planName(u)} plan{u.plan === "solo" && u.dpco_name ? ` · with ${u.dpco_name}` : ""}</span>
          </summary>
          <nav className="nav" aria-label="Main">
            <NavLink href="/app" exact><LayoutList aria-hidden />Clients</NavLink>
            <NavLink href="/app/tasks"><ListChecks aria-hidden />Tasks</NavLink>
            <NavLink href="/app/calendar"><Calendar aria-hidden />Calendar</NavLink>
            <NavLink href="/app/proposals"><FileSignature aria-hidden />Proposals</NavLink>
            <NavLink href="/app/billing"><Receipt aria-hidden />Invoices</NavLink>
            {u.plan !== "solo" && canApprove(u) && <NavLink href="/app/solo-dpos"><UserCheck aria-hidden />Solo DPOs</NavLink>}
            <NavLink href="/app/wallet"><Wallet aria-hidden />Wallet</NavLink>
            {u.plan !== "solo" && isAdmin(u) && <NavLink href="/app/payouts"><Banknote aria-hidden />Payouts</NavLink>}
            {u.plan !== "solo" && <NavLink href="/app/audit-notices"><Mail aria-hidden />Audit notices</NavLink>}
            <NavLink href="/app/library"><BookOpen aria-hidden />Library</NavLink>
            <NavLink href="/app/verify"><SearchCheck aria-hidden />NDPC check</NavLink>
            <NavLink href="/app/ask"><MessageSquareText aria-hidden />Ask</NavLink>
            {isAdmin(u) && u.plan !== "solo" && <NavLink href="/app/import"><Upload aria-hidden />Import</NavLink>}
            {isAdmin(u) && u.plan !== "solo" && <NavLink href="/app/settings/firm"><Building2 aria-hidden />Firm profile</NavLink>}
            {u.plan === "solo" && <NavLink href="/app/settings/me"><Building2 aria-hidden />My details</NavLink>}
            {isAdmin(u) && u.plan !== "solo" && <NavLink href="/app/settings/team"><Users aria-hidden />Team</NavLink>}
            {isAdmin(u) && u.plan !== "solo" && sub.ends && <NavLink href="/subscription"><CreditCard aria-hidden />Subscription</NavLink>}
            {isAdmin(u) && <NavLink href="/app/settings/risk-model"><Scale aria-hidden />Risk model</NavLink>}
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
        <main id="main" className="content">
          {sub.state === "grace" && <Banner kind="warn">Your subscription ended on {fmtDate(sub.ends!)}. The workspace is read-only and locks after {fmtDate(sub.graceEnds!)}. {sub.own ? <Link href="/subscription">Renew now</Link> : "Ask your DPCO to renew."}</Banner>}
          {sub.state === "active" && sub.own && left !== null && left <= 30 && isAdmin(u) && <Banner kind="info">Your subscription ends on {fmtDate(sub.ends!)}. <Link href="/subscription">Renew now</Link></Banner>}
          {children}
        </main>
      </div>
    </div>
  );
}
