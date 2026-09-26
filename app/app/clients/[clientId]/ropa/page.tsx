import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { requireClient } from "@/lib/auth";
import { q } from "@/lib/db";
import { LAWFUL_BASIS } from "@/lib/templates";
import { Flash, Empty } from "@/components/ui";

const TABS = [["proposed", "Proposed"], ["active", "Active"], ["archived", "Archived"]] as const;
const REQUIRED_ROPA = ["lawful_basis", "data_subjects", "data_categories", "retention_period", "security_measures", "system_owner"] as const;

export default async function Ropa({ params, searchParams }: { params: Promise<{ clientId: string }>; searchParams: Promise<Record<string, string>> }) {
  const { clientId } = await params;
  const sp = await searchParams;
  const { client } = await requireClient(clientId);
  const counts = Object.fromEntries((await q("select state, count(*)::int as n from ropa_entries where client_id = $1 group by state", [clientId])).map((r) => [r.state, r.n]));
  const tab = TABS.some(([t]) => t === sp.tab) ? sp.tab : counts.proposed ? "proposed" : "active";
  const rows = await q("select * from ropa_entries where client_id = $1 and state = $2 order by purpose", [clientId, tab]);
  const b = `/app/clients/${clientId}/ropa`;
  return (
    <>
      <div className="spread">
        <h2 style={{ marginTop: 0 }}>Records of processing activities</h2>
        <div className="row">
          <a className="btn secondary" href={`/export?kind=ropa&client=${clientId}&format=pdf`} target="_blank">Export PDF</a>
          <a className="btn secondary" href={`/export?kind=ropa&client=${clientId}&format=doc`}>Export Word</a>
          {!client.archived_at && <Link className="btn" href={`${b}/new`}>Add entry</Link>}
        </div>
      </div>
      <Flash sp={sp} />
      <nav className="row" aria-label="Filter" style={{ margin: "8px 0 16px" }}>
        {TABS.map(([t, l]) => <Link key={t} href={`${b}?tab=${t}`} className={`btn ${t === tab ? "" : "secondary"}`} aria-current={t === tab ? "page" : undefined}>{l} <span className="num">({counts[t] ?? 0})</span></Link>)}
      </nav>
      {rows.length === 0 ? (
        <Empty><p>{tab === "proposed" ? "No proposed entries. Complete onboarding to get proposed entries, or add one manually." : tab === "active" ? "No active entries yet. Accept proposed entries or add one." : "Nothing archived."}</p></Empty>
      ) : (
        <table className="register">
          <thead><tr><th>Purpose</th><th>Lawful basis</th><th>Data categories</th><th>Retention</th><th>Transfer</th></tr></thead>
          <tbody>{rows.map((r) => {
            const missing = REQUIRED_ROPA.filter((k) => !r[k]).length;
            return (
              <tr key={r.id}>
                <td><Link href={`${b}/${r.id}`}>{r.purpose}</Link>
                  {missing > 0 && <div><span className="chip progress"><TriangleAlert aria-hidden />{missing} field{missing > 1 ? "s" : ""} missing</span></div>}
                  {r.involves_sensitive && <div className="meta" style={{ fontWeight: 400 }}>Sensitive data</div>}</td>
                <td data-label="Lawful basis">{r.lawful_basis ? LAWFUL_BASIS[r.lawful_basis] : <span className="meta">Not set</span>}</td>
                <td data-label="Data categories" className="small">{r.data_categories ?? "—"}</td>
                <td data-label="Retention">{r.retention_period ?? <span className="meta">Not set</span>}</td>
                <td data-label="Transfer">{r.has_transfer ? (r.transfer_safeguard ? "Yes, safeguarded" : <b style={{ color: "var(--red-700)" }}>Yes, no safeguard</b>) : "No"}</td>
              </tr>
            );
          })}</tbody>
        </table>
      )}
    </>
  );
}
