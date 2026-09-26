import Link from "next/link";
import { requireContact } from "@/lib/auth";
import { q } from "@/lib/db";
import { Chip, Deadline, Empty } from "@/components/ui";

export default async function PortalEvidence() {
  const u = await requireContact();
  const rows = await q("select id, title, due_on, status from evidence_requests where client_id = $1 order by case status when 'rejected' then 0 when 'open' then 1 when 'submitted' then 2 else 3 end, due_on nulls last", [u.client_id]);
  return (
    <>
      <p><Link href="/portal">Back to home</Link></p>
      <h1 style={{ fontSize: 24 }}>Evidence requests</h1>
      {rows.length === 0 ? <Empty><p>No evidence requested.</p></Empty> : rows.map((r) => (
        <div key={r.id} className={`rule-row ${r.status === "rejected" ? "soon" : "info"}`} style={{ display: "block" }}>
          <div className="spread"><Link href={`/portal/evidence/${r.id}`}><b>{r.title}</b></Link><Chip status={r.status} /></div>
          {r.due_on && ["open", "rejected"].includes(r.status) && <Deadline due={r.due_on} dateOnly />}
        </div>
      ))}
    </>
  );
}
