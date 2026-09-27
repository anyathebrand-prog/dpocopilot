import Link from "next/link";
import { redirect } from "next/navigation";
import { requireClient, audit } from "@/lib/auth";
import { q, one, tx } from "@/lib/db";
import { latestVersion, loadCtx } from "@/lib/data";
import { saveBody } from "@/lib/content";
import { draft } from "@/lib/ai";
import { breachNotice } from "@/lib/templates";
import { breachFor, reference } from "@/lib/breach";
import { fmtWAT, parseWATLocal, nowWATLocal } from "@/lib/rules";
import { str, opt, flash } from "@/lib/form";
import { Flash, Field, Hidden, Chip, Doc, Banner, Seal } from "@/components/ui";
import { Submit, Countdown, Confirm } from "@/components/client";
import { ReviewBar } from "@/components/workflow";

async function ctx(fd: FormData) {
  const b = await one("select * from breaches where id = $1", [str(fd, "breach_id")]);
  if (!b) redirect("/forbidden");
  const { user, client } = await requireClient(b.client_id, { write: true });
  return { b, user, client, back: `/app/clients/${b.client_id}/breaches/${b.id}` };
}

async function update(fd: FormData) {
  "use server";
  const { b, user, back } = await ctx(fd);
  const nr = str(fd, "notification_required");
  const reason = opt(fd, "not_required_reason");
  if (nr === "no" && !reason) redirect(flash(back, "Give the reason notification isn't required.", "error"));
  await q(`update breaches set description = $2, data_affected = $3, subjects_affected = $4, est_count = $5, containment = $6, remediation = $7, severity = $8,
    notification_required = $9, not_required_reason = $10 where id = $1`, [b.id, str(fd, "description") || b.description, opt(fd, "data_affected"), opt(fd, "subjects_affected"),
    str(fd, "est_count") ? Math.max(0, Number(str(fd, "est_count"))) : null, opt(fd, "containment"), opt(fd, "remediation"),
    ["low", "medium", "high"].includes(str(fd, "severity")) ? str(fd, "severity") : null, ["yes", "no", "unknown"].includes(nr) ? nr : "unknown", nr === "no" ? reason : null]);
  await audit(user, "update", "breach", b.id, { client_id: b.client_id });
  redirect(flash(back, "Incident updated"));
}

async function generate(fd: FormData) {
  "use server";
  const { b, user, client, back } = await ctx(fd);
  const org = (await loadCtx(client.id)).orgName;
  for (const audience of ["regulator", "data_subjects"]) {
    if (await one("select 1 from breach_notifications where breach_id = $1 and audience = $2", [b.id, audience])) continue;
    let text: string;
    try { text = await draft(user, client.id, `breach notification to ${audience}`, breachNotice(audience, org, b as any), b); }
    catch (e) { redirect(flash(back, (e as Error).message, "error")); }
    await tx(async (t) => {
      const n = await t.query<{ id: string }>("insert into breach_notifications (firm_id, client_id, breach_id, audience) values ($1,$2,$3,$4) returning id", [b.firm_id, b.client_id, b.id, audience]);
      await t.query("insert into content_versions (firm_id, client_id, parent_type, parent_id, version_no, body, ai_generated, created_by) values ($1,$2,'breach_notification',$3,1,$4,true,$5)", [b.firm_id, b.client_id, n.rows[0].id, text, user.id]);
      await audit(user, "create", "breach_notification", n.rows[0].id, { client_id: b.client_id, details: { audience } }, t);
    });
  }
  redirect(flash(back, "Notification drafts ready. They are AI drafts until approved."));
}

async function recordSent(fd: FormData) {
  "use server";
  const { b, user, back } = await ctx(fd);
  const n = await one("select * from breach_notifications where id = $1 and breach_id = $2", [str(fd, "notification_id"), b.id]);
  const v = n && await latestVersion("breach_notification", n.id);
  if (!v || !["approved", "awaiting_client_signoff", "client_signed_off"].includes(v.status)) redirect(flash(back, "Approve the notification before recording it as sent.", "error"));
  const at = parseWATLocal(str(fd, "sent_at"));
  if (!at || +at > Date.now() + 60_000) redirect(flash(back, "Enter when it was sent (not in the future).", "error"));
  await q("update breach_notifications set sent_at = $2, sent_method = $3, sent_to = $4, recorded_by = $5 where id = $1", [n.id, at, opt(fd, "sent_method"), opt(fd, "sent_to"), user.id]);
  await audit(user, "update", "breach_notification", n.id, { client_id: b.client_id, details: { recorded_sent: true } });
  redirect(flash(back, "Recorded as sent"));
}

async function close(fd: FormData) {
  "use server";
  const { b, user, back } = await ctx(fd);
  await q("update breaches set status = 'closed' where id = $1", [b.id]);
  await audit(user, "update", "breach", b.id, { client_id: b.client_id, details: { closed: true } });
  redirect(flash(back, "Incident closed"));
}

export default async function BreachDetail({ params, searchParams }: { params: Promise<{ clientId: string; incidentId: string }>; searchParams: Promise<Record<string, string>> }) {
  const { clientId, incidentId } = await params;
  const sp = await searchParams;
  const { user, client } = await requireClient(clientId);
  const b = await breachFor(incidentId, clientId);
  if (!b) redirect("/forbidden");
  const reporter = await one("select name from users where id = $1", [b.reported_by]);
  const notes = await q("select * from breach_notifications where breach_id = $1 order by audience = 'regulator' desc", [b.id]);
  const versions = Object.fromEntries(await Promise.all(notes.map(async (n) => [n.id, (await latestVersion("breach_notification", n.id))!] as const)));
  const ndpcSent = notes.find((n) => n.audience === "regulator")?.sent_at;
  const ro = !!client.archived_at || b.status === "closed";
  const back = `/app/clients/${clientId}/breaches/${b.id}`;
  const h = <Hidden values={{ breach_id: b.id }} />;
  return (
    <>
      <nav className="meta" aria-label="Breadcrumb"><Link href={`/app/clients/${clientId}/breaches`}>Breaches</Link> / {reference(b.id)}</nav>
      <h2 style={{ marginTop: 8 }}>Breach {reference(b.id)} <Chip status={b.status === "closed" ? "closed" : "open"} /></h2>
      <Flash sp={sp} />
      {b.reported_via === "portal" && <Banner kind="breach">Reported by {reporter?.name} via the client portal at {fmtWAT(b.created_at)}{b.reporter_phone && `. Contact number: ${b.reporter_phone}`}.</Banner>}

      <section className="panel" style={{ marginBottom: 24 }}>
        {ndpcSent ? <p><b>NDPC notified</b> {fmtWAT(ndpcSent)}</p> : b.notification_required === "no" ? <p><b>Notification not required.</b> {b.not_required_reason}</p> : (
          <>
            <Countdown due={b.deadline_at.toISOString()} />
            <p style={{ margin: 0 }}>Notify NDPC by <b>{fmtWAT(b.deadline_at)}</b></p>
            {+b.deadline_at < Date.now() && <p className="why" style={{ color: "var(--red-700)" }}>The 72-hour deadline has passed. Notify as soon as possible and record why it was late.</p>}
          </>
        )}
        <p className="caption">Aware since {fmtWAT(b.aware_at)}. DPO Copilot never submits to the NDPC; record what you send.</p>
      </section>

      <div className="with-rail">
        <div>
          <h3>Notifications</h3>
          {notes.length === 0 ? (
            !ro && b.notification_required !== "no" ? (
              <form action={generate}>{h}<p>Draft a notification to the NDPC and one to affected people from the incident details.</p><Submit>Generate notification drafts</Submit></form>
            ) : <p className="meta">No notifications drafted.</p>
          ) : notes.map((n) => {
            const v = versions[n.id];
            const approved = ["approved", "awaiting_client_signoff", "client_signed_off"].includes(v.status);
            return (
              <section key={n.id} style={{ marginBottom: 32 }}>
                <h4 style={{ fontSize: 18, margin: "16px 0 8px" }}>{n.audience === "regulator" ? "To the NDPC" : "To affected people"} <Chip status={v.status} ai={v.ai_generated} /></h4>
                <Seal v={v} />
                {v.status === "draft" && !ro ? (
                  <form action={saveBody}><Hidden values={{ id: v.id, back }} />
                    <textarea name="body" className="doc-edit" defaultValue={v.body} aria-label="Notification text" />
                    <Submit className="btn secondary">Save draft</Submit>
                  </form>
                ) : <Doc body={v.body} className={v.status === "draft" ? "draft" : ""} />}
                {!ro && <div style={{ marginTop: 12 }}><ReviewBar v={v} user={user} back={back} /></div>}
                {n.sent_at ? <p className="panel" style={{ marginTop: 12 }}>Sent {fmtWAT(n.sent_at)} by {n.sent_method ?? "—"} to {n.sent_to ?? "—"}.</p> : !ro && (
                  <form action={recordSent} className="panel" style={{ marginTop: 12 }}>{h}
                    <input type="hidden" name="notification_id" value={n.id} />
                    <h4 style={{ marginTop: 0 }}>Record as sent</h4>
                    <fieldset disabled={!approved}>
                      <Field label="Sent at (WAT)" required><input type="datetime-local" name="sent_at" max={nowWATLocal()} required /></Field>
                      <Field label="How it was sent"><input name="sent_method" placeholder="Email, portal, letter" /></Field>
                      <Field label="Sent to"><input name="sent_to" /></Field>
                      <Submit className="btn secondary">Record as sent</Submit>
                    </fieldset>
                    {!approved && <p className="why">Approve this notification first.</p>}
                  </form>
                )}
              </section>
            );
          })}
        </div>
        <aside>
          <form action={update} className="panel">{h}
            <h3>Incident details</h3>
            <fieldset disabled={ro}>
              <Field label="What happened"><textarea name="description" defaultValue={b.description} /></Field>
              <Field label="Personal data affected"><textarea name="data_affected" defaultValue={b.data_affected ?? ""} /></Field>
              <Field label="People affected"><input name="subjects_affected" defaultValue={b.subjects_affected ?? ""} /></Field>
              <Field label="Estimated number affected"><input type="number" min={0} name="est_count" defaultValue={b.est_count ?? ""} /></Field>
              <Field label="Containment"><textarea name="containment" defaultValue={b.containment ?? ""} /></Field>
              <Field label="Remediation actions"><textarea name="remediation" defaultValue={b.remediation ?? ""} /></Field>
              <Field label="Severity"><select name="severity" defaultValue={b.severity ?? ""}><option value="">Not yet assessed</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></Field>
              <Field label="NDPC notification required?"><select name="notification_required" defaultValue={b.notification_required}><option value="unknown">Not yet known</option><option value="yes">Yes</option><option value="no">No</option></select></Field>
              <Field label="If not required, why?"><textarea name="not_required_reason" defaultValue={b.not_required_reason ?? ""} /></Field>
              <Submit className="btn secondary">Save incident</Submit>
            </fieldset>
          </form>
          {!ro && <section className="panel"><Confirm action={close} title="Close this incident?" body="It stays on record and can still be viewed and exported." label="Close incident" danger={false}>{h}</Confirm></section>}
        </aside>
      </div>
    </>
  );
}
