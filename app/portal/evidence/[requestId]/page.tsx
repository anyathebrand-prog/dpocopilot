import Link from "next/link";
import { redirect } from "next/navigation";
import { requireContact } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { uploadEvidence } from "@/lib/evidence";
import { ACCEPT } from "@/lib/files";
import { fmtWAT } from "@/lib/rules";
import { Flash, Field, Hidden, Chip, Deadline, Banner } from "@/components/ui";
import { Submit } from "@/components/client";

export default async function PortalEvidenceRequest({ params, searchParams }: { params: Promise<{ requestId: string }>; searchParams: Promise<Record<string, string>> }) {
  const u = await requireContact();
  const { requestId } = await params;
  const sp = await searchParams;
  const r = await one("select * from evidence_requests where id = $1 and client_id = $2", [/^[0-9a-f-]{36}$/.test(requestId) ? requestId : null, u.client_id]);
  if (!r) redirect("/forbidden");
  const files = await q("select id, original_name, created_at from files where evidence_request_id = $1 order by created_at desc", [r.id]);
  const rejection = r.status === "rejected" ? await one("select comment from evidence_decisions where request_id = $1 and decision = 'rejected' order by created_at desc limit 1", [r.id]) : null;
  return (
    <>
      <p><Link href="/portal/evidence">Back to evidence requests</Link></p>
      <h1 style={{ fontSize: 24 }}>{r.title}</h1>
      <p><Chip status={r.status} /></p>
      <Flash sp={sp} />
      {r.due_on && ["open", "rejected"].includes(r.status) && <Deadline due={r.due_on} dateOnly />}
      {rejection && <Banner kind="warn"><b>Your DPCO asked you to upload this again:</b> {rejection.comment}</Banner>}
      <p style={{ marginTop: 16 }}>{r.description ?? "Upload the document your DPCO asked for."}</p>
      {files.length > 0 && (
        <>
          <h2>Uploaded</h2>
          <ul>{files.map((f) => <li key={f.id}><a href={`/files/${f.id}`}>{f.original_name}</a> <span className="meta">{fmtWAT(f.created_at)}</span></li>)}</ul>
        </>
      )}
      {r.status !== "accepted" ? (
        <form action={uploadEvidence} className="panel">
          <Hidden values={{ request_id: r.id }} />
          <Field label="Choose file or take photo" help="PDF, Word, Excel, CSV, text or photos. Up to 25 MB each."><input type="file" name="file" multiple accept={ACCEPT} required /></Field>
          <Submit>Upload</Submit>
        </form>
      ) : <Banner kind="ok">Accepted by your DPCO. Nothing more to do.</Banner>}
    </>
  );
}
