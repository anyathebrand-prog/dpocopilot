import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { q } from "@/lib/db";
import { fmtDate } from "@/lib/rules";
import { DSAR_TYPES } from "@/lib/templates";
import { Flash, Chip, Empty, Deadline } from "@/components/ui";

export default async function Dsars({ params, searchParams }: { params: Promise<{ clientId: string }>; searchParams: Promise<Record<string, string>> }) {
  const { clientId } = await params;
  const sp = await searchParams;
  const { client } = await requireClient(clientId);
  const status = sp.status === "closed" ? "closed" : "open";
  const rows = await q("select * from dsars where client_id = $1 and status = $2 order by deadline_on", [clientId, status]);
  const b = `/app/clients/${clientId}/dsars`;
  return (
    <>
      <div className="spread"><h2 style={{ marginTop: 0 }}>Data subject requests</h2>{!client.archived_at && <Link className="btn" href={`${b}/new`}>Log DSAR</Link>}</div>
      <Flash sp={sp} />
      <nav className="row" style={{ marginBottom: 16 }} aria-label="Filter">
        <Link className={`btn ${status === "open" ? "" : "secondary"}`} href={b}>Open</Link>
        <Link className={`btn ${status === "closed" ? "" : "secondary"}`} href={`${b}?status=closed`}>Closed</Link>
      </nav>
      {rows.length === 0 ? <Empty><p>No {status} requests.</p></Empty> : (
        <table className="register">
          <thead><tr><th>Requester</th><th>Type</th><th>Received</th><th>Deadline</th><th>Source</th></tr></thead>
          <tbody>{rows.map((d) => (
            <tr key={d.id}>
              <td><Link href={`${b}/${d.id}`}>{d.requester_name}</Link></td>
              <td data-label="Type">{DSAR_TYPES[d.request_type].split(" (")[0]}</td>
              <td data-label="Received">{fmtDate(d.received_on)}</td>
              <td data-label="Deadline">{d.status === "open" ? <Deadline due={d.deadline_on} dateOnly soonHours={7 * 24} /> : <Chip status="closed" />}</td>
              <td data-label="Source">{d.source === "portal" ? "Client portal" : "Firm"}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </>
  );
}
