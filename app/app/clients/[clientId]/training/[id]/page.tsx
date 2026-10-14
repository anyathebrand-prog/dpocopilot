import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireClient, audit } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { str, opt, flash } from "@/lib/form";
import { storeFile, ACCEPT } from "@/lib/files";
import { TRAININGS, EVIDENCE_KINDS, sessionDates, type TrainingKind } from "@/lib/training";
import { fmtWAT, fmtDate, todayWAT } from "@/lib/rules";
import { Flash, Field, Hidden, Chip } from "@/components/ui";
import { Submit } from "@/components/client";

async function load(fd: FormData) {
  const t = await one("select * from trainings where id = $1", [/^[0-9a-f-]{36}$/.test(str(fd, "id")) ? str(fd, "id") : null]);
  if (!t) redirect("/forbidden");
  const { user, client } = await requireClient(t.client_id, { write: true });
  return { t, user, client, back: `/app/clients/${t.client_id}/training/${t.id}` };
}
const count = (v: string) => (v === "" ? null : Number.isInteger(Number(v)) && Number(v) >= 0 ? Number(v) : NaN);

async function save(fd: FormData) {
  "use server";
  const { t, user, back } = await load(fd);
  const starts = str(fd, "starts_on"), ends = opt(fd, "ends_on"), planned = count(str(fd, "planned_participants"));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(starts) || (ends && ends < starts)) redirect(flash(back, "Check the dates.", "error"));
  if (Number.isNaN(planned)) redirect(flash(back, "Enter the number of participants as a whole number.", "error"));
  await q(`update trainings set title = $2, starts_on = $3, ends_on = $4, start_time = $5, mode = $6, venue = $7, facilitator = $8, audience = $9, planned_participants = $10, notes = $11, updated_at = now() where id = $1`,
    [t.id, opt(fd, "title"), starts, ends, opt(fd, "start_time"), opt(fd, "mode"), opt(fd, "venue"), opt(fd, "facilitator"), opt(fd, "audience"), planned, opt(fd, "notes")]);
  await audit(user, "update", "training", t.id, { client_id: t.client_id });
  redirect(flash(back, "Saved"));
}

async function complete(fd: FormData) {
  "use server";
  const { t, user, back } = await load(fd);
  const actual = count(str(fd, "actual_participants")), on = str(fd, "completed_on") || todayWAT();
  if (actual === null || Number.isNaN(actual)) redirect(flash(back, "Enter how many people attended.", "error"));
  await q("update trainings set status = 'completed', actual_participants = $2, completed_on = $3, updated_at = now() where id = $1", [t.id, actual, on]);
  await audit(user, "update", "training", t.id, { client_id: t.client_id, details: { status: "completed", actual } });
  redirect(flash(back, "Marked as held. Now attach the evidence below."));
}

async function setStatus(fd: FormData) {
  "use server";
  const { t, user, back } = await load(fd);
  const status = str(fd, "status");
  if (!["scheduled", "cancelled"].includes(status)) redirect("/forbidden");
  await q("update trainings set status = $2, completed_on = null, updated_at = now() where id = $1", [t.id, status]);
  await audit(user, "update", "training", t.id, { client_id: t.client_id, details: { status } });
  redirect(flash(back, status === "cancelled" ? "Training cancelled" : "Training reopened"));
}

async function upload(fd: FormData) {
  "use server";
  const { t, user, client, back } = await load(fd);
  const kind = str(fd, "evidence_kind");
  if (!(kind in EVIDENCE_KINDS)) redirect(flash(back, "Choose what the files are.", "error"));
  const files = fd.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) redirect(flash(back, "Choose at least one file.", "error"));
  for (const f of files) {
    const r = await storeFile(user, client as { id: string; firm_id: string }, f, null);
    if ("error" in r) redirect(flash(back, r.error, "error"));
    await q("update files set training_id = $2, evidence_kind = $3 where id = $1", [r.id, t.id, kind]);
  }
  await audit(user, "update", "training", t.id, { client_id: t.client_id, details: { evidence: files.length, kind } });
  redirect(flash(back, `${files.length} file${files.length === 1 ? "" : "s"} attached`));
}

export default async function TrainingSession({ params, searchParams }: { params: Promise<{ clientId: string; id: string }>; searchParams: Promise<Record<string, string>> }) {
  const { clientId, id } = await params;
  const sp = await searchParams;
  const { client } = await requireClient(clientId);
  const t = await one("select * from trainings where id = $1 and client_id = $2", [/^[0-9a-f-]{36}$/.test(id) ? id : null, clientId]);
  if (!t) notFound();
  const files = await q("select f.*, u.name as uploader from files f join users u on u.id = f.uploaded_by where f.training_id = $1 order by f.evidence_kind, f.created_at", [t.id]);
  const T = TRAININGS[t.kind as TrainingKind], ro = !!client.archived_at, h = <Hidden values={{ id: t.id }} />;
  return (
    <>
      <nav className="meta" aria-label="Breadcrumb"><Link href={`/app/clients/${clientId}/training?year=${t.starts_on.slice(0, 4)}`}>Capacity building plan</Link> / {T.name}</nav>
      <h2 style={{ marginTop: 8 }}>{T.name} <span className="meta" style={{ fontSize: "0.7em" }}>· {sessionDates(t)}</span> {t.status === "completed" ? <Chip status="complete" /> : <span className="small">{t.status === "cancelled" ? "Cancelled" : "Scheduled"}</span>}</h2>
      <p className="meta">{T.audience}. {T.about}</p>
      <Flash sp={sp} />
      <div className="with-rail">
        <div>
          <h3>Evidence of training</h3>
          {files.length === 0 ? <p className="meta">No evidence attached yet.</p> : (
            <table className="register">
              <thead><tr><th>File</th><th>Type</th><th>Uploaded</th></tr></thead>
              <tbody>{files.map((f) => (
                <tr key={f.id}>
                  <td><a href={`/files/${f.id}`}>{f.original_name}</a> <span className="meta">({Math.ceil(Number(f.size_bytes) / 1024)} KB)</span></td>
                  <td data-label="Type" className="small">{EVIDENCE_KINDS[f.evidence_kind as keyof typeof EVIDENCE_KINDS] ?? "Other"}</td>
                  <td data-label="Uploaded" className="small">{f.uploader}, {fmtWAT(f.created_at)}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
          {!ro && (
            <form action={upload} className="panel" style={{ marginTop: 16 }}>{h}
              <Field label="What are these files?"><select name="evidence_kind" defaultValue="photo">{Object.entries(EVIDENCE_KINDS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
              <Field label="Files" help="Schedules, attendance registers, materials and certificates (PDF, Word, Excel), pictures (JPG, PNG) up to 25 MB each, videos (MP4, MOV, WebM) up to 100 MB each.">
                <input type="file" name="file" multiple accept={ACCEPT} />
              </Field>
              <Submit className="btn secondary">Attach evidence</Submit>
            </form>
          )}
          {!ro && t.status === "scheduled" && (
            <form action={complete} className="panel" style={{ marginTop: 16 }}>{h}
              <h3 style={{ marginTop: 0 }}>Record that it was held</h3>
              <div className="row" style={{ alignItems: "flex-end" }}>
                <Field label="Number who attended" required><input type="number" name="actual_participants" min={0} required defaultValue={t.planned_participants ?? ""} style={{ width: 140 }} /></Field>
                <Field label="Date held"><input type="date" name="completed_on" defaultValue={t.ends_on ?? t.starts_on} /></Field>
                <Submit>Mark as held</Submit>
              </div>
            </form>
          )}
          {t.status === "completed" && <p className="meta" style={{ marginTop: 12 }}>Held {t.completed_on ? fmtDate(t.completed_on) : ""} · {t.actual_participants} of {t.planned_participants ?? "?"} participants attended.</p>}
        </div>
        <aside>
          <form action={save} className="panel">{h}
            <h3 style={{ marginTop: 0 }}>Schedule</h3>
            <fieldset disabled={ro}>
              <Field label="Session title"><input name="title" defaultValue={t.title ?? ""} /></Field>
              <Field label="Start date" required><input type="date" name="starts_on" required defaultValue={t.starts_on} /></Field>
              <Field label="End date"><input type="date" name="ends_on" defaultValue={t.ends_on ?? ""} /></Field>
              <Field label="Time"><input type="time" name="start_time" defaultValue={t.start_time ?? ""} /></Field>
              <Field label="Number of participants"><input type="number" name="planned_participants" min={0} defaultValue={t.planned_participants ?? ""} /></Field>
              <Field label="Mode"><select name="mode" defaultValue={t.mode ?? ""}><option value="">–</option><option>In person</option><option>Virtual</option><option>Hybrid</option></select></Field>
              <Field label="Venue or link"><input name="venue" defaultValue={t.venue ?? ""} /></Field>
              <Field label="Facilitator"><input name="facilitator" defaultValue={t.facilitator ?? ""} /></Field>
              <Field label="Participants / departments"><input name="audience" defaultValue={t.audience ?? ""} /></Field>
              <Field label="Notes"><textarea name="notes" rows={2} defaultValue={t.notes ?? ""} /></Field>
              {!ro && <Submit className="btn secondary">Save</Submit>}
            </fieldset>
          </form>
          {!ro && <form action={setStatus} style={{ marginTop: 8 }}>{h}<Hidden values={{ status: t.status === "scheduled" ? "cancelled" : "scheduled" }} /><Submit className="btn secondary">{t.status === "scheduled" ? "Cancel training" : "Reopen as scheduled"}</Submit></form>}
        </aside>
      </div>
    </>
  );
}
