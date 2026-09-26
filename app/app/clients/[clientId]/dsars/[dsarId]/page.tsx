import Link from "next/link";
import { redirect } from "next/navigation";
import { requireClient, audit } from "@/lib/auth";
import { q, one, tx } from "@/lib/db";
import { latestVersion, loadCtx } from "@/lib/data";
import { saveBody } from "@/lib/content";
import { draft } from "@/lib/ai";
import { dsarResponse, DSAR_TYPES } from "@/lib/templates";
import { fmtDate, fmtWAT, parseWATLocal, nowWATLocal } from "@/lib/rules";
import { str, opt, flash } from "@/lib/form";
import { Flash, Field, Hidden, Chip, Doc, Deadline, Seal, Banner } from "@/components/ui";
import { Submit, Confirm } from "@/components/client";
import { ReviewBar } from "@/components/workflow";

async function ctx(fd: FormData) {
  const d = await one("select * from dsars where id = $1", [str(fd, "dsar_id")]);
  if (!d) redirect("/forbidden");
  const { user, client } = await requireClient(d.client_id, { write: true });
  return { d, user, client, back: `/app/clients/${d.client_id}/dsars/${d.id}` };
}

async function setIdentity(fd: FormData) {
  "use server";
  const { d, user, back } = await ctx(fd);
  const s = str(fd, "id_status");
  if (!["not_verified", "verified", "failed"].includes(s)) redirect(back);
  await q("update dsars set id_status = $2 where id = $1", [d.id, s]);
  await audit(user, "update", "dsar", d.id, { client_id: d.client_id, details: { id_status: s } });
  redirect(flash(back, "Identity verification updated"));
}

async function draftResponse(fd: FormData) {
  "use server";
  const { d, user, client, back } = await ctx(fd);
  if (await one("select 1 from content_versions where parent_type = 'dsar' and parent_id = $1", [d.id])) redirect(back);
  const ids = (await q("select ropa_entry_id from dsar_ropa where dsar_id = $1", [d.id])).map((r) => r.ropa_entry_id);
  const c = await loadCtx(client.id, ids.length ? ids : undefined);
  let text: string;
  try { text = await draft(user, client.id, "DSAR response", dsarResponse(c.orgName, d as any, c.ropa), { request: d, ropa: c.ropa }); }
  catch (e) { redirect(flash(back, (e as Error).message, "error")); }
  await tx(async (t) => {
    await t.query("insert into content_versions (firm_id, client_id, parent_type, parent_id, version_no, body, ai_generated, created_by) values ($1,$2,'dsar',$3,1,$4,true,$5)", [d.firm_id, d.client_id, d.id, text, user.id]);
    await audit(user, "create", "dsar_response", d.id, { client_id: d.client_id }, t);
  });
  redirect(flash(back, "Response drafted. It is an AI draft until approved."));
}

async function recordSent(fd: FormData) {
  "use server";
  const { d, user, back } = await ctx(fd);
  const v = await latestVersion("dsar", d.id);
  if (!v || !["approved", "awaiting_client_signoff", "client_signed_off"].includes(v.status)) redirect(flash(back, "Approve the response before recording it as sent.", "error"));
  const at = parseWATLocal(str(fd, "sent_at"));
  if (!at || +at > Date.now() + 60_000) redirect(flash(back, "Enter when it was sent (not in the future).", "error"));
  await q("update dsars set response_sent_at = $2, response_sent_method = $3 where id = $1", [d.id, at, opt(fd, "method")]);
  await audit(user, "update", "dsar", d.id, { client_id: d.client_id, details: { response_sent: true } });
  redirect(flash(back, "Response recorded as sent"));
}

async function closeDsar(fd: FormData) {
  "use server";
  const { d, user, back } = await ctx(fd);
  await q("update dsars set status = 'closed', closed_at = now() where id = $1", [d.id]);
  await audit(user, "update", "dsar", d.id, { client_id: d.client_id, details: { closed: true } });
  redirect(flash(back, "Request closed. It stays on record."));
}

export default async function DsarDetail({ params, searchParams }: { params: Promise<{ clientId: string; dsarId: string }>; searchParams: Promise<Record<string, string>> }) {
  const { clientId, dsarId } = await params;
  const sp = await searchParams;
  const { user, client } = await requireClient(clientId);
  const d = await one("select * from dsars where id = $1 and client_id = $2", [/^[0-9a-f-]{36}$/.test(dsarId) ? dsarId : null, clientId]);
  if (!d) redirect("/forbidden");
  const ropa = await q("select r.id, r.purpose from dsar_ropa x join ropa_entries r on r.id = x.ropa_entry_id where x.dsar_id = $1", [d.id]);
  const v = await latestVersion("dsar", d.id);
  const ro = !!client.archived_at || d.status === "closed";
  const back = `/app/clients/${clientId}/dsars/${d.id}`;
  const h = <Hidden values={{ dsar_id: d.id }} />;
  const approved = v && ["approved", "awaiting_client_signoff", "client_signed_off"].includes(v.status);
  return (
    <>
      <nav className="meta" aria-label="Breadcrumb"><Link href={`/app/clients/${clientId}/dsars`}>DSARs</Link> / {d.requester_name}</nav>
      <h2 style={{ marginTop: 8 }}>{DSAR_TYPES[d.request_type]} <Chip status={d.status} /></h2>
      <Flash sp={sp} />
      {d.status === "open" && <Deadline due={d.deadline_on} dateOnly soonHours={7 * 24} prefix="Response due" />}
      {d.source === "portal" && <Banner>Logged by the client through the portal.</Banner>}
      <div className="with-rail" style={{ marginTop: 24 }}>
        <div>
          <dl className="kv">
            <dt>Requester</dt><dd>{d.requester_name}{d.requester_contact && ` · ${d.requester_contact}`}</dd>
            <dt>Received</dt><dd>{fmtDate(d.received_on)} ({d.period_days}-day period)</dd>
            <dt>Details</dt><dd>{d.details ?? "—"}</dd>
            <dt>Related activities</dt><dd>{ropa.length ? ropa.map((r) => r.purpose).join(", ") : "None linked"}</dd>
            {d.response_sent_at && <><dt>Response sent</dt><dd>{fmtWAT(d.response_sent_at)} {d.response_sent_method && `by ${d.response_sent_method}`}</dd></>}
          </dl>
          <h3>Response</h3>
          {!v ? (!ro ? <form action={draftResponse}>{h}<p className="meta">Drafts a response from the request and the client&apos;s data map.</p><Submit>Draft response with AI</Submit></form> : <p className="meta">No response drafted.</p>) : (
            <>
              <Seal v={v} />
              {v.status === "draft" && !ro ? (
                <form action={saveBody}><Hidden values={{ id: v.id, back }} />
                  <textarea name="body" className="doc-edit" defaultValue={v.body} aria-label="Response text" />
                  <Submit className="btn secondary">Save draft</Submit>
                </form>
              ) : <Doc body={v.body} className={v.status === "draft" ? "draft" : ""} />}
            </>
          )}
        </div>
        <aside>
          {v && !ro && <ReviewBar v={v} user={user} back={back} />}
          <form action={setIdentity} className="panel">{h}
            <h3>Identity verification</h3>
            <fieldset disabled={ro}>
              <select name="id_status" defaultValue={d.id_status} aria-label="Identity verification status"><option value="not_verified">Not yet verified</option><option value="verified">Verified</option><option value="failed">Could not verify</option></select>
              <div style={{ marginTop: 8 }}><Submit className="btn secondary">Save</Submit></div>
            </fieldset>
          </form>
          {!ro && !d.response_sent_at && (
            <form action={recordSent} className="panel">{h}
              <h3>Record response as sent</h3>
              <fieldset disabled={!approved}>
                <Field label="Sent at (WAT)" required><input type="datetime-local" name="sent_at" max={nowWATLocal()} required /></Field>
                <Field label="How it was sent"><input name="method" placeholder="Email, letter" /></Field>
                <Submit className="btn secondary">Record as sent</Submit>
              </fieldset>
              {!approved && <p className="why">The response must be approved first.</p>}
            </form>
          )}
          {!ro && <section className="panel"><Confirm action={closeDsar} title="Close this request?" body="It stays on record as evidence for the client's file." label="Close request" danger={false}>{h}</Confirm></section>}
        </aside>
      </div>
    </>
  );
}
