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

/** Upload documents without a request: one evidence entry per upload, holding all the files chosen.
 *  From the portal it is Submitted for the firm to review (team notified); from the firm it is filed as Accepted. */
export async function uploadDocuments(fd: FormData) {
  const u = await getUser();
  if (!u) redirect("/sign-in");
  let user: User = u, clientId: string, back: string;
  if (u.kind === "contact") {
    clientId = u.client_id!;
    if ((await one("select archived_at from clients where id = $1", [clientId]))?.archived_at) redirect("/forbidden");
    back = "/portal/evidence";
  } else {
    clientId = str(fd, "client_id");
    user = (await requireClient(clientId, { write: true })).user;
    back = `/app/clients/${clientId}/evidence`;
  }
  const client = (await one<{ id: string; firm_id: string; name: string }>("select id, firm_id, name from clients where id = $1", [clientId]))!;
  const title = str(fd, "title"), files = fd.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
  if (!title) redirect(flash(back, "Say what the documents are.", "error"));
  if (!files.length) redirect(flash(back, "Choose at least one document to upload.", "error"));
  const item = u.kind === "contact" ? null : str(fd, "car_item_id") || null;
  if (item && !(await one("select 1 from client_car_items where id = $1 and client_id = $2", [item, clientId]))) redirect("/forbidden");
  const r = (await one<{ id: string }>("insert into evidence_requests (firm_id, client_id, title, description, car_item_id, status, created_by) values ($1,$2,$3,$4,$5,$6,$7) returning id",
    [client.firm_id, clientId, title, str(fd, "description") || null, item, u.kind === "contact" ? "submitted" : "accepted", u.id]))!;
  for (const f of files) {
    const err = await storeUpload(user, client, f, r.id);
    if (err) redirect(flash(back, `${err} Files before it were uploaded.`, "error"));
  }
  if (u.kind === "contact") await notifyTeam(client.firm_id, clientId, "evidence_submitted", `${client.name} uploaded documents: ${title}`, `/app/clients/${clientId}/evidence/${r.id}`);
  redirect(flash(back, `${files.length} document${files.length === 1 ? "" : "s"} uploaded${u.kind === "contact" ? ". Your DPCO has been told." : ""}`));
}
