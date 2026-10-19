import Link from "next/link";
import { countryOf } from "@/lib/country";
import type { ReactNode } from "react";
import { requireClient } from "@/lib/auth";
import { one } from "@/lib/db";
import { todayWAT } from "@/lib/rules";
import { Chip, Banner } from "@/components/ui";
import { NavLink, SectionSelect } from "@/components/client";

export default async function ClientLayout({ children, params }: { children: ReactNode; params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const { client } = await requireClient(clientId, { unpaid: true });
  // Unpaid client: only the checkout page (every other client page redirects to it).
  if (client.unpaid) return (<><nav aria-label="Breadcrumb" className="meta" style={{ marginBottom: 8 }}><Link href="/app">Clients</Link> / {client.name}</nav><h1>{client.name}</h1>{children}</>);
  const s = await one(`select
      (select coalesce(round(100.0 * count(*) filter (where status = 'complete') / nullif(count(*) filter (where status <> 'not_applicable'), 0)), 0)::int from client_car_items where client_id = $1 and audit_year = (select car_audit_year from clients where id = $1) and category_key <> 'data_processors') as readiness,
      (select count(*)::int from breaches where client_id = $1 and status = 'open') as breaches,
      (select count(*)::int from dsars where client_id = $1 and status = 'open' and deadline_on < $2) as dsars_overdue,
      (select count(*)::int from gap_findings where client_id = $1 and state = 'open') as gaps,
      (select count(*)::int from evidence_requests where client_id = $1 and status = 'submitted') as evidence_waiting,
      (select count(*)::int from trainings where client_id = $1 and status = 'scheduled' and starts_on < $2) as training_due,
      (select count(*)::int from remediation_actions where client_id = $1 and status <> 'completed' and audit_year = (select car_audit_year from clients where id = $1)) as remediation_open`, [clientId, todayWAT()]);
  const b = `/app/clients/${clientId}`, cc = countryOf(client.country), car = cc.car;
  const groups: [string | null, [string, string, number?][]][] = [
    [null, [["", "Overview"]]],
    ["Set up", [["/onboarding", "Onboarding"], ["/data-inventory", "Data inventory"], ["/ropa", "RoPA"]]],
    ["Assess", [["/dpias", "DPIAs"], ["/assessments/lia", "LIAs"], ["/assessments/tia", "Transfer risk"], ["/assessments/tpra", "Third-party risk"], ["/gaps", "Gaps", s!.gaps], ...(car ? [["/car-readiness", "CAR readiness"] as [string, string]] : []), ["/remediation", "Remediation", s!.remediation_open]]],
    ["Documents and evidence", [["/documents", "Documents"], ["/evidence", "Evidence", s!.evidence_waiting]]],
    ["Respond", [["/breaches", "Breaches", s!.breaches]]],
    [null, [["/settings", "Settings"]]],
    ["Capacity building", [["/training", "Training plan", s!.training_due]]],
    ["Billing", [["/billing", "Invoices"]]],
  ];
  return (
    <>
      <nav aria-label="Breadcrumb" className="meta" style={{ marginBottom: 8 }}><Link href="/app">Clients</Link> / {client.name}</nav>
      <div className="spread" style={{ marginBottom: 24, alignItems: "flex-end" }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>{client.name}</h1>
          <div className="row">
            <Chip status={client.archived_at ? "archived" : client.status} />
            <span className="meta">{client.mi_class === "major_importance" ? "Major importance" : client.mi_class === "not_major_importance" ? "Not of major importance" : "Major importance: not yet classified"}</span>
          </div>
        </div>
        {car ? <div className="meta">CAR readiness <b className="num" style={{ fontSize: 22, color: "var(--ink-900)" }}>{s!.readiness}%</b></div> : <div className="meta">{cc.name} · {cc.law.short} · {cc.regulator.short}</div>}
      </div>
      {client.archived_at && <Banner kind="warn">This client is archived. Everything is read-only.</Banner>}
      {/* shortcut: templates, checklists and reports still cite the NDPA; Ghana versions are step 2 */}
      {!car && <Banner kind="warn">{cc.name} client ({cc.law.name}; regulator: {cc.regulator.name}). Invoices use {cc.currency.code} and {cc.name} VAT, and the NDPC CAR is switched off. Templates, reports and checklists still cite Nigerian law, so review every document before sending it.</Banner>}
      <div className="client-layout">
        <nav className="client-nav" aria-label="Client sections">
          <div className="links">
            {groups.map(([g, links], i) => (
              <div key={i}>
                {g && <h4>{g}</h4>}
                {links.map(([p, l, n]) => (
                  <NavLink key={p} href={b + p} exact={p === ""}>
                    <span>{l}</span>{!!n && <span className="chip neutral num" aria-label={`${n} need attention`}>{n}</span>}
                  </NavLink>
                ))}
              </div>
            ))}
          </div>
          <SectionSelect options={groups.flatMap(([, links]) => links.map(([p, l]) => ({ href: b + p, label: l })))} />
        </nav>
        <div style={{ minWidth: 0 }}>{children}</div>
      </div>
    </>
  );
}
