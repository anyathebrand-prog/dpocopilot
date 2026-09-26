import Link from "next/link";
import { requireContact } from "@/lib/auth";
import { q } from "@/lib/db";
import { fmtWAT } from "@/lib/rules";
import { Chip, Empty } from "@/components/ui";

/** P04: only versions a sign-off request was made for are ever visible here (FR10.3). */
export default async function PortalDocuments() {
  const u = await requireContact();
  const rows = await q(`select s.id as request_id, s.status as request_status, v.id as version_id, v.version_no, v.status, coalesce(d.title, 'DPIA: ' || dp.title) as title,
      (select signed_at from signatures g where g.request_id = s.id) as signed_at
    from signoff_requests s join content_versions v on v.id = s.version_id
    left join documents d on v.parent_type = 'document' and d.id = v.parent_id left join dpias dp on v.parent_type = 'dpia' and dp.id = v.parent_id
    where s.client_id = $1 and s.status in ('pending','signed') order by s.created_at desc`, [u.client_id]);
  const waiting = rows.filter((r) => r.request_status === "pending"), signed = rows.filter((r) => r.request_status === "signed");
  return (
    <>
      <p><Link href="/portal">Back to home</Link></p>
      <h1 style={{ fontSize: 24 }}>Documents</h1>
      {rows.length === 0 && <Empty><p>No documents yet.</p></Empty>}
      {waiting.length > 0 && <h2>Awaiting your sign-off</h2>}
      {waiting.map((r) => (
        <div key={r.request_id} className="rule-row info">
          <Link href={`/portal/documents/${r.request_id}/sign`}><b>{r.title}</b> (version {r.version_no})</Link>
          <Link className="btn" href={`/portal/documents/${r.request_id}/sign`}>Review and sign</Link>
        </div>
      ))}
      {signed.length > 0 && <h2>Signed documents</h2>}
      {signed.map((r) => (
        <div key={r.request_id} className="rule-row">
          <span><b>{r.title}</b> (version {r.version_no})<div className="meta">Signed {fmtWAT(r.signed_at)}</div></span>
          <span className="row"><Chip status="client_signed_off" /><a href={`/export?kind=version&id=${r.version_id}&format=pdf`} target="_blank">Download</a></span>
        </div>
      ))}
    </>
  );
}
