import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { q } from "@/lib/db";
import { fmtWAT } from "@/lib/rules";
import { reference } from "@/lib/breach";
import { Flash, Chip, Empty, Deadline } from "@/components/ui";

export default async function Breaches({ params, searchParams }: { params: Promise<{ clientId: string }>; searchParams: Promise<Record<string, string>> }) {
  const { clientId } = await params;
  const sp = await searchParams;
  const { client } = await requireClient(clientId);
  const b = `/app/clients/${clientId}/breaches`;
  const rows = await q(`select b.*, (select sent_at from breach_notifications n where n.breach_id = b.id and n.audience = 'regulator') as ndpc_sent
    from breaches b where b.client_id = $1 order by b.status, b.deadline_at desc`, [clientId]);
  return (
    <>
      <div className="spread"><h2 style={{ marginTop: 0 }}>Breaches</h2>{!client.archived_at && <Link className="btn" href={`${b}/new`}>Log breach</Link>}</div>
      <Flash sp={sp} />
      {rows.length === 0 ? <Empty><p>No incidents recorded.</p></Empty> : (
        <table className="register">
          <thead><tr><th>Incident</th><th>Reported by</th><th>Aware</th><th>NDPC deadline</th><th>Severity</th><th>Notification</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id}>
              <td><Link href={`${b}/${r.id}`}>{reference(r.id)}</Link><div className="meta" style={{ fontWeight: 400 }}>{r.description.slice(0, 80)}{r.description.length > 80 && "…"}</div></td>
              <td data-label="Reported by">{r.reported_via === "portal" ? "Client (portal)" : "Firm"}</td>
              <td data-label="Aware" className="small">{fmtWAT(r.aware_at)}</td>
              <td data-label="Deadline">{r.status === "closed" ? <Chip status="closed" /> : r.ndpc_sent ? "Notified" : r.notification_required === "no" ? "Not required" : <Deadline due={r.deadline_at} soonHours={24} prefix="By" />}</td>
              <td data-label="Severity">{r.severity ? <Chip status={r.severity} /> : "Not set"}</td>
              <td data-label="Notification">{r.notification_required === "yes" ? "Required" : r.notification_required === "no" ? "Not required" : "Not yet known"}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </>
  );
}
