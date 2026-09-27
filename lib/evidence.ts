"use server";
import { redirect } from "next/navigation";
import { q, one } from "./db";
import { getUser, requireClient, notifyTeam, type User } from "./auth";
import { storeUpload } from "./files";
import { str, flash } from "./form";

/** FR8.2: Client Contacts upload against a request; firm users may too (FLAG-11 default). Upload moves the request to Submitted. */
export async function uploadEvidence(fd: FormData) {
  const u = await getUser();
  if (!u) redirect("/sign-in");
  const r = await one("select e.*, c.name as client_name, c.archived_at from evidence_requests e join clients c on c.id = e.client_id where e.id = $1", [str(fd, "request_id")]);
  if (!r) redirect("/forbidden");
  let user: User = u, back: string;
  if (u.kind === "contact") {
    if (u.client_id !== r.client_id || r.archived_at) redirect("/forbidden");
    back = `/portal/evidence/${r.id}`;
  } else {
    user = (await requireClient(r.client_id, { write: true })).user;
    back = `/app/clients/${r.client_id}/evidence/${r.id}`;
  }
  if (r.status === "accepted") redirect(flash(back, "This request is already accepted.", "error"));
  const files = fd.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) redirect(flash(back, "Choose a file to upload.", "error"));
  for (const f of files) {
    const err = await storeUpload(user, { id: r.client_id, firm_id: r.firm_id }, f, r.id);
    if (err) redirect(flash(back, err, "error"));
  }
  await q("update evidence_requests set status = 'submitted' where id = $1", [r.id]);
  if (u.kind === "contact") await notifyTeam(r.firm_id, r.client_id, "evidence_submitted", `${r.client_name} uploaded evidence: ${r.title}`, `/app/clients/${r.client_id}/evidence/${r.id}`);
  redirect(flash(back, files.length > 1 ? `${files.length} files uploaded` : "File uploaded"));
}
