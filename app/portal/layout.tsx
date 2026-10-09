import Link from "next/link";
import type { ReactNode } from "react";
import { House, ListChecks, Database, CalendarClock, FileText, Upload, Receipt, ClipboardList, ShieldAlert, UserSearch, BadgeCheck, Menu, LogOut } from "lucide-react";
import { requireContact } from "@/lib/auth";
import { one } from "@/lib/db";
import { signOut } from "@/lib/auth-actions";
import { NavLink } from "@/components/client";
import "@/components/console.css";
import { INSTALL } from "@/lib/install";

/** Client portal in the same frame as the firm workspace: navy sidebar with icon nav, top bar with account and sign out. */
export default async function PortalLayout({ children }: { children: ReactNode }) {
  const u = await requireContact();
  const c = await one(`select c.name,
      (select count(*)::int from evidence_requests e where e.client_id = c.id and e.status in ('open','rejected')) as evidence,
      (select count(*)::int from signoff_requests s where s.client_id = c.id and s.status = 'pending') as signoffs,
      (select count(*)::int from invoices i where i.client_id = c.id and i.status = 'unpaid' and i.sent_at is not null) as invoices,
      (select count(*)::int from dsars d where d.client_id = c.id and d.status = 'open' and (d.id_status = 'not_verified' or d.department is null)) as unverified
    from clients c where c.id = $1`, [u.client_id]);
  const badge = (n: number) => (n ? <span className="chip neutral num" aria-label={`${n} need attention`}>{n}</span> : null);
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
            <span className="cx-pill">{c!.name}</span>
            <span className="meta" style={{ display: "block", marginTop: 4, fontSize: 12 }}>Compliance portal · {u.firm_name}</span>
          </summary>
          <nav className="nav" aria-label="Main">
            <NavLink href="/portal" exact><House aria-hidden />Home</NavLink>
            <NavLink href="/portal/car"><ListChecks aria-hidden />CAR checklist</NavLink>
            <NavLink href="/portal/ropa"><Database aria-hidden />Data inventory</NavLink>
            <NavLink href="/portal/deadlines"><CalendarClock aria-hidden />Deadlines</NavLink>
            <NavLink href="/portal/documents"><FileText aria-hidden /><span>Documents</span>{badge(c!.signoffs)}</NavLink>
            <NavLink href="/portal/evidence"><Upload aria-hidden /><span>Evidence</span>{badge(c!.evidence)}</NavLink>
            <NavLink href="/portal/invoices"><Receipt aria-hidden /><span>Invoices</span>{badge(c!.invoices)}</NavLink>
            <NavLink href="/portal/questionnaire"><ClipboardList aria-hidden />Onboarding answers</NavLink>
            <NavLink href="/portal/report-breach"><ShieldAlert aria-hidden />Report a breach</NavLink>
            <NavLink href="/portal/log-request"><UserSearch aria-hidden />Log a data request</NavLink>
            <NavLink href="/portal/requests"><BadgeCheck aria-hidden /><span>Verify &amp; assign requests</span>{badge(c!.unverified)}</NavLink>
          </nav>
        </details>
      </aside>
      <div className="main">
        <header className="topbar">
          <span className="cx-top">Compliance portal</span>
          <Link href="/account" className="cx-user">{u.name} · Client contact</Link>
          <form action={signOut}><button className="cx-signout"><LogOut aria-hidden />Sign out</button></form>
        </header>
        <main id="main" className="content">{children}</main>
      </div>
    </div>
  );
}
