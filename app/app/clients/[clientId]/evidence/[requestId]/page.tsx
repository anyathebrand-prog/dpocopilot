import Link from "next/link";
import { redirect } from "next/navigation";
import { requireClient, audit } from "@/lib/auth";
import { q, one, tx } from "@/lib/db";
import { uploadEvidence } from "@/lib/evidence";
import { ACCEPT } from "@/lib/files";
import { fmtWAT } from "@/lib/rules";
import { str, opt, flash } from "@/lib/form";
import { Flash, Field, Hidden, Chip, Deadline } from "@/components/ui";
import { Submit } from "@/components/client";

async function decide(fd: FormData) {
  "use server";
  const r = await one("select * from evidence_requests where id = $1", [str(fd, "request_id")]);
  if (!r) redirect("/forbidden");
  const { user } = await requireClient(r.client_id, { write: true });
  const back = `/app/clients/${r.client_id}/evidence/${r.id}`;
  const decision = str(fd, "decision"), comment = opt(fd, "comment");
  if (!["accepted", "rejected"].includes(decision)) redirect(back);
  if (decision === "rejected" && !comment) redirect(flash(back, "Add a comment explaining what the client needs to fix. They will see it.", "error"));
  if (r.status !== "submitted") redirect(flash(back, "Only submitted evidence can be accepted or rejected.", "error"));
  await tx(async (t) => {
    await t.query("insert into evidence_decisions (request_id, decision, comment, decided_by) values ($1,$2,$3,$4)", [r.id, decision, comment, user.id]);
    await t.query("update evidence_requests set status = $2 where id = $1", [r.id, decision]);
    if (decision === "accepted" && r.car_item_id && fd.get("mark_complete") === "on")
      await t.query("update client_car_items set status = 'complete', updated_by = $2 where id = $1", [r.car_item_id, user.id]);
    await audit(user, "update", "evidence_request", r.id, { client_id: r.client_id, details: { decision } }, t);
  });
  redirect(flash(back, decision === "accepted" ? "Evidence accepted" : "Evidence rejected. The client can see your comment and resubmit."));
}

async function setDue(fd: FormData) {
  "use server";
  const r = await one("select * from evidence_requests where id = $1", [str(fd, "request_id")]);
  if (!r) redirect("/forbidden");
  const { user } = await requireClient(r.client_id, { write: true });
  await q("update evidence_requests set due_on = $2 where id = $1", [r.id, opt(fd, "due_on")]);
  await audit(user, "update", "evidence_request", r.id, { client_id: r.client_id, details: { due_on: opt(fd, "due_on") } });
  redirect(flash(`/app/clients/${r.client_id}/evidence/${r.id}`, "Due date saved"));
}

export default async function EvidenceRequest({ params, searchParams }: { params: Promise<{ clientId: string; requestId: string }>; searchParams: Promise<Record<string, string>> }) {
  const { clientId, requestId } = await params;
  const sp = await searchParams;
  const { client } = await requireClient(clientId);
  const r = await one("select e.*, i.item_text from evidence_requests e left join client_car_items i on i.id = e.car_item_id where e.id = $1 and e.client_id = $2", [/^[0-9a-f-]{36}$/.test(requestId) ? requestId : null, clientId]);
  if (!r) redirect("/forbidden");
  const files = await q("select f.*, u.name as uploader from files f join users u on u.id = f.uploaded_by where f.evidence_request_id = $1 order by f.created_at desc", [r.id]);
  const decisions = await q("select d.*, u.name from evidence_decisions d join users u on u.id = d.decided_by where d.request_id = $1 order by d.created_at desc", [r.id]);
  const ro = !!client.archived_at;
  const h = <Hidden values={{ request_id: r.id }} />;
  return (
    <>
      <nav className="meta" aria-label="Breadcrumb"><Link href={`/app/clients/${clientId}/evidence`}>Evidence</Link> / {r.title}</nav>
      <h2 style={{ marginTop: 8 }}>{r.title} <Chip status={r.status} /></h2>
      <Flash sp={sp} />
      {r.due_on && ["open", "rejected"].includes(r.status) && <Deadline due={r.due_on} dateOnly />}
      <div className="with-rail" style={{ marginTop: 16 }}>
        <div>
          <p>{r.description ?? <span className="meta">No description.</span>}</p>
          {r.item_text && <p className="meta">Checklist item: {r.item_text}</p>}
          <h3>Files</h3>
          {files.length === 0 ? <p className="meta">Nothing uploaded yet.</p> : (
            <table className="register">
              <thead><tr><th>File</th><th>Uploaded</th><th>Security scan</th></tr></thead>
              <tbody>{files.map((f) => (
                <tr key={f.id}>
                  <td><a href={`/files/${f.id}`}>{f.original_name}</a> <span className="meta">({Math.ceil(Number(f.size_bytes) / 1024)} KB)</span></td>
                  <td data-label="Uploaded" className="small">{f.uploader}, {fmtWAT(f.created_at)}</td>
                  <td data-label="Scan">{f.scan_status === "clean" ? "Clean" : "Not scanned (no scanner configured)"}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
          {!ro && r.status !== "accepted" && (
            <form action={uploadEvidence} className="panel" style={{ marginTop: 16 }}>{h}
              <Field label="Upload on the client's behalf" help="PDF, Word, Excel, CSV, text or photos. Up to 25 MB each."><input type="file" name="file" multiple accept={ACCEPT} /></Field>
              <Submit className="btn secondary">Upload</Submit>
            </form>
          )}
          <h3>Decisions</h3>
          {decisions.length ? decisions.map((d) => <div key={d.id} className={`rule-row ${d.decision === "rejected" ? "soon" : "info"}`}><span><Chip status={d.decision} /> {d.comment}</span><span className="meta">{d.name}, {fmtWAT(d.created_at)}</span></div>) : <p className="meta">None yet.</p>}
        </div>
        <aside>
          {!ro && (
            <form action={decide} className="panel">{h}
              <h3>Decision</h3>
              <fieldset disabled={r.status !== "submitted"}>
                {r.car_item_id && <label className="check"><input type="checkbox" name="mark_complete" defaultChecked />Mark the checklist item Complete when accepting</label>}
                <Field label="Comment" help="Required when rejecting. The client sees it."><textarea name="comment" /></Field>
                <div className="row"><Submit name="decision" value="accepted">Accept</Submit><Submit className="btn secondary" name="decision" value="rejected">Reject</Submit></div>
              </fieldset>
              {r.status !== "submitted" && <p className="why">Available once the client submits evidence.</p>}
            </form>
          )}
          {!ro && (
            <form action={setDue} className="panel">{h}
              <Field label="Due date"><input type="date" name="due_on" defaultValue={r.due_on ?? ""} /></Field>
              <Submit className="btn secondary">Save due date</Submit>
            </form>
          )}
        </aside>
      </div>
    </>
  );
}
