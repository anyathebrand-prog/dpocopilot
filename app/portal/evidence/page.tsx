import Link from "next/link";
import { requireContact } from "@/lib/auth";
import { q } from "@/lib/db";
import { Chip, Deadline, Empty, Field, Flash } from "@/components/ui";
import { Submit } from "@/components/client";
import { uploadDocuments } from "@/lib/evidence";
import { ACCEPT } from "@/lib/files";

export default async function PortalEvidence({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const u = await requireContact();
  const rows = await q("select id, title, due_on, status from evidence_requests where client_id = $1 order by case status when 'rejected' then 0 when 'open' then 1 when 'submitted' then 2 else 3 end, due_on nulls last", [u.client_id]);
  return (
    <>
      <p><Link href="/portal">Back to home</Link></p>
      <h1 style={{ fontSize: 24 }}>Evidence</h1>
      <Flash sp={sp} />
      <form action={uploadDocuments} className="panel" style={{ marginBottom: 24 }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Upload documents</h2>
        <Field label="What are these documents?" required help="e.g. Privacy policy and staff consent forms"><input name="title" required /></Field>
        <Field label="Note for your DPCO (optional)"><textarea name="description" rows={2} /></Field>
        <Field label="Documents" required help="Choose one or more files: PDF, Word, Excel, CSV, text or photos up to 25 MB each, videos up to 100 MB."><input type="file" name="file" multiple accept={ACCEPT} required /></Field>
        <Submit>Upload documents</Submit>
      </form>
      <h2 style={{ fontSize: 18 }}>Requests and uploads</h2>
      {rows.length === 0 ? <Empty><p>No evidence requested.</p></Empty> : rows.map((r) => (
        <div key={r.id} className={`rule-row ${r.status === "rejected" ? "soon" : "info"}`} style={{ display: "block" }}>
          <div className="spread"><Link href={`/portal/evidence/${r.id}`}><b>{r.title}</b></Link><Chip status={r.status} /></div>
          {r.due_on && ["open", "rejected"].includes(r.status) && <Deadline due={r.due_on} dateOnly />}
        </div>
      ))}
    </>
  );
}
