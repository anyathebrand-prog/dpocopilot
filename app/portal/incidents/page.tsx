import Link from "next/link";
import { requireContact } from "@/lib/auth";
import { q } from "@/lib/db";
import { computed, dashboard } from "@/lib/incidents";
import { fmtDate } from "@/lib/rules";
import { Flash, Empty, Chip } from "@/components/ui";

const SEV: Record<string, string> = { Low: "risk_low", Medium: "risk_medium", High: "risk_high", Critical: "risk_high" };

/** The client's Data Privacy Incident Register: dashboard figures, then the register. */
export default async function Incidents({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const u = await requireContact();
  const sp = await searchParams;
  const rows = await q<{ id: string; number: string; data: Record<string, string> }>("select id, number, data from incidents where client_id = $1 order by number desc", [u.client_id]);
  const m = dashboard(rows.map((r) => r.data));
  const stat = (n: number, l: string, alert = false) => <div className="panel" style={{ padding: 14, minWidth: 140, flex: "1 1 140px" }}><div className="num" style={{ fontSize: 26, fontWeight: 700, color: alert && n ? "#ff8a80" : undefined }}>{n}</div><div className="meta" style={{ fontSize: 12 }}>{l}</div></div>;
  return (
    <>
      <div className="spread" style={{ alignItems: "flex-start" }}>
        <div><h1 style={{ fontSize: 24, marginBottom: 4 }}>Data Privacy Incident Register</h1>
          <p className="meta" style={{ marginTop: 0 }}>Every suspected or confirmed personal data incident, under the NDPA 2023 (s.40) and the GAID 2025. Breaches likely to put people at risk must be notified to the NDPC within 72 hours of discovery.</p></div>
        <div className="row"><Link className="btn" href="/portal/incidents/new">Log incident</Link>{rows.length > 0 && <a className="btn secondary" href="/export?kind=incident-register&format=xlsx">Excel</a>}</div>
      </div>
      <Flash sp={sp} />
      <div className="row" style={{ gap: 12, margin: "12px 0", flexWrap: "wrap" }}>
        {stat(m.total, "Total incidents")}{stat(m.open, "Open")}{stat(m.highCritical, "Critical / High", true)}{stat(m.required, "NDPC notification required")}
        {stat(m.within, "Notified within 72h")}{stat(m.late, "Notified late", true)}{stat(m.overdue, "Notification overdue", true)}{stat(m.subjects, "Data subjects affected")}
      </div>
      {rows.length === 0 ? <Empty><p>No incidents logged. <Link href="/portal/incidents/new">Log the first one</Link>.</p></Empty> : (
        <div className="cx-hscroll">
          <table className="register" style={{ minWidth: 900 }}>
            <thead><tr><th>Incident ID</th><th>Title</th><th>Discovered</th><th>Type</th><th>Severity</th><th>NDPC deadline (72h)</th><th>NDPC notification</th><th>Status</th></tr></thead>
            <tbody>{rows.map((r) => { const d = r.data, x = computed(d); return (
              <tr key={r.id}>
                <td><Link href={`/portal/incidents/${r.id}`}>{r.number}</Link></td>
                <td data-label="Title">{d.title}{d.department && <div className="meta">{d.department}</div>}</td>
                <td data-label="Discovered" className="small">{d.discovered_on ? fmtDate(d.discovered_on) : "—"}{d.discovered_time ? ` ${d.discovered_time}` : ""}</td>
                <td data-label="Type" className="small">{d.incident_type}</td>
                <td data-label="Severity">{d.severity ? <Chip status={SEV[d.severity]} /> : "—"} <span className="small">{d.severity}</span></td>
                <td data-label="NDPC deadline" className="small">{x.deadline ? fmtDate(x.deadline) : "—"}</td>
                <td data-label="NDPC notification" className="small">{x.status === "Overdue" || x.status === "Notified late" ? <b style={{ color: "#c62828" }}>{x.status}</b> : x.status}{x.days !== null && <div className="meta">{x.days} day{x.days === 1 ? "" : "s"} to notify</div>}</td>
                <td data-label="Status" className="small">{d.status}</td>
              </tr>); })}</tbody>
          </table>
        </div>
      )}
      {rows.length > 0 && (
        <div className="row" style={{ gap: 24, marginTop: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
          {([["By severity", m.bySeverity], ["By status", m.byStatus], ["By incident type", m.byType]] as const).map(([t, l]) => (
            <div key={t} style={{ minWidth: 200 }}><h3 style={{ fontSize: 15 }}>{t}</h3>{l.map(([k, v]) => <div key={k} className="spread small" style={{ gap: 16 }}><span>{k}</span><b className="num">{v}</b></div>)}</div>
          ))}
        </div>
      )}
      <p className="caption" style={{ marginTop: 16 }}>Confidential: restrict access to the DPO and authorised staff. To alert your DPCO to a live breach, use Report a breach.</p>
    </>
  );
}
