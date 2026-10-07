import Link from "next/link";
import { requireContact } from "@/lib/auth";
import { q } from "@/lib/db";
import { LAWFUL_BASIS } from "@/lib/templates";
import { Empty } from "@/components/ui";

/** Read-only record of processing: active entries only; proposed entries are unreviewed drafts (FR10.3). */
export default async function PortalRopa() {
  const u = await requireContact();
  const rows = await q("select * from ropa_entries where client_id = $1 and state = 'active' order by purpose", [u.client_id]);
  return (
    <>
      <p><Link href="/portal">Back to home</Link></p>
      <h1 style={{ fontSize: 24 }}>Your data inventory</h1>
      <p className="meta">What personal data your organisation processes, why, and how it is protected. This is your record of processing activities (RoPA), kept by {u.firm_name}. Tell them if anything here is wrong or out of date.</p>
      {rows.length === 0 ? <Empty><p>{u.firm_name} hasn&apos;t finished your data inventory yet.</p></Empty> : (
        <table className="register">
          <thead><tr><th>Purpose</th><th>Department</th><th>Lawful basis</th><th>Whose data</th><th>What data</th><th>Shared with</th><th>Sent outside Nigeria</th><th>Kept for</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id}>
              <td><b>{r.purpose}</b>{r.involves_sensitive && <div className="meta">Includes sensitive data</div>}</td>
              <td data-label="Department">{r.department ?? "—"}</td>
              <td data-label="Lawful basis">{r.lawful_basis ? LAWFUL_BASIS[r.lawful_basis] : "—"}</td>
              <td data-label="Whose data" className="small">{r.data_subjects ?? "—"}</td>
              <td data-label="What data" className="small">{r.data_categories ?? "—"}</td>
              <td data-label="Shared with" className="small">{r.recipients ?? "—"}</td>
              <td data-label="Sent outside Nigeria">{r.has_transfer ? (r.transfer_safeguard ? `Yes. Safeguard: ${r.transfer_safeguard}` : "Yes") : "No"}</td>
              <td data-label="Kept for">{r.retention_period ?? "—"}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </>
  );
}
