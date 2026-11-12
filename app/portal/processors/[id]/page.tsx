import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import { requireContact, audit, send, notifyTeam, clientIp } from "@/lib/auth";
import { q, one, tx } from "@/lib/db";
import { newOtp, sha256 } from "@/lib/crypto";
import { str, flash } from "@/lib/form";
import { storeFile, ACCEPT } from "@/lib/files";
import { documentText } from "@/lib/dpia-docs";
import { fmtDate, todayWAT } from "@/lib/rules";
import { asModel, score, REQUIREMENTS, DOMAINS } from "@/lib/tpra-model";
import { loadTpra, evidenceState, logEvent } from "@/lib/tpra";
import { Flash, Field, Hidden, Banner } from "@/components/ui";
import { Submit } from "@/components/client";
import { INSTALL } from "@/lib/install";
import { RatingBadge } from "@/components/tpra-form";

// The client's view of one processor assessment: upload the requested evidence, then sign off the approved decision
// with a typed name and a one-time email code (the same strength as document sign-off).

async function load(id: string) {
  const u = await requireContact();
  const d = /^[0-9a-f-]{36}$/.test(id) ? await loadTpra(id) : null;
  if (!d || d.a.client_id !== u.client_id || !(d.a.status === "approved" || d.a.evidence_requested_at)) redirect("/forbidden");
  return { u, d, self: `/portal/processors/${d.a.id}` };
}
/** What the client signs: the decision as approved. Any change after approval reopens the assessment. */
const signed = (a: Record<string, any>) => { const r = score(a.answers, asModel(a.model)); return JSON.stringify({ id: a.id, rating: a.rating, residual: r.residual, decision: a.outcome, conditions: a.answers.conditions ?? "", approved_at: a.approved_at }); };

async function upload(fd: FormData) {
  "use server";
  const { u, d, self } = await load(str(fd, "id"));
  if ((await one("select archived_at from clients where id = $1", [u.client_id]))?.archived_at) redirect("/forbidden");
  const client = (await one<{ id: string; firm_id: string }>("select id, firm_id from clients where id = $1", [u.client_id]))!;
  let n = 0;
  for (let i = 0; i < 12; i++) for (const f of fd.getAll(`ev_file_${i}`)) {
    if (!(f instanceof File) || !f.size) continue;
    const up = await storeFile(u, client, f, null);
    if ("error" in up) redirect(flash(self, `A file failed to upload: ${up.error}`, "error"));
    await q("update files set assessment_id = $2, evidence_item = $3, text_content = $4 where id = $1", [up.id, d.a.id, i, (await documentText(f)) || null]);
    await q("insert into tpra_evidence (assessment_id, item, status) values ($1,$2,'received') on conflict (assessment_id, item) do update set status = 'received'", [d.a.id, i]);
    n++;
  }
  if (!n) redirect(flash(self, "Choose at least one file.", "error"));
  await logEvent(d.a.id, `${u.name} (client)`, `${n} evidence file${n > 1 ? "s" : ""} uploaded in the portal`);
  await audit(u, "upload", "tpra_evidence", d.a.id, { client_id: d.a.client_id, details: { files: n } });
  await notifyTeam(d.a.firm_id, d.a.client_id, "evidence_submitted", `${n} document${n > 1 ? "s" : ""} uploaded for processor ${d.a.answers.vendor || d.a.title}`, `/app/clients/${d.a.client_id}/assessments/tpra/${d.a.id}`);
  redirect(flash(self, `Uploaded ${n} file${n > 1 ? "s" : ""}. Your DPCO has been told.`));
}

async function sendCode(fd: FormData) {
  "use server";
  const { u, d, self } = await load(str(fd, "id"));
  if (d.a.status !== "approved" || d.a.client_signed_at) redirect(flash(self, "This assessment does not need signing.", "error"));
  const recent = await one<{ n: number }>("select count(*)::int as n from otp_challenges where user_id = $1 and created_at > now() - interval '15 minutes'", [u.id]);
  if (recent!.n >= 5) redirect(flash(self, "Too many codes requested. Wait 15 minutes and try again.", "error"));
  const code = newOtp();
  await q("insert into otp_challenges (user_id, assessment_id, code_hash, expires_at) values ($1,$2,$3, now() + interval '10 minutes')", [u.id, d.a.id, sha256(`${d.a.id}:${code}`)]);
  await send("email", u.email, "otp", `Your ${INSTALL.name} signing code is ${code}. It expires in 10 minutes.`);
  redirect(flash(self, `We sent a 6-digit code to ${u.email}. It expires in 10 minutes.`));
}

async function sign(fd: FormData) {
  "use server";
  const { u, d, self } = await load(str(fd, "id"));
  const name = str(fd, "typed_name"), code = str(fd, "code");
  if (d.a.status !== "approved" || d.a.client_signed_at) redirect(flash(self, "This assessment does not need signing.", "error"));
  if (name.length < 2) redirect(flash(self, "Type your full name.", "error"));
  if (fd.get("consent") !== "on") redirect(flash(self, "Tick the box to confirm you are signing.", "error"));
  const ch = await one("select * from otp_challenges where user_id = $1 and assessment_id = $2 and consumed_at is null order by created_at desc limit 1", [u.id, d.a.id]);
  if (!ch || +ch.expires_at < Date.now()) redirect(flash(self, "Your code has expired. Send a new code.", "error"));
  if (ch.attempts >= 5) redirect(flash(self, "Too many wrong codes. Request a new code later.", "error"));
  await q("update otp_challenges set attempts = attempts + 1 where id = $1", [ch.id]);
  if (ch.code_hash !== sha256(`${d.a.id}:${code}`)) redirect(flash(self, `That code is wrong. ${4 - ch.attempts} attempt${4 - ch.attempts === 1 ? "" : "s"} left.`, "error"));
  const h = await headers();
  await tx(async (t) => {
    await t.query("update otp_challenges set consumed_at = now() where id = $1", [ch.id]);
    await t.query("update assessments set client_signed_at = now(), client_signed_name = $2, client_signed_by = $3, client_signed_sha = $4 where id = $1 and status = 'approved' and client_signed_at is null", [d.a.id, name, u.id, sha256(signed(d.a))]);
    await audit(u, "sign", "assessment_tpra", d.a.id, { client_id: d.a.client_id, details: { ip: await clientIp(), user_agent: h.get("user-agent") } }, t);
  });
  await logEvent(d.a.id, `${name} (client)`, "Client signed off the decision (typed name and email code)");
  await notifyTeam(d.a.firm_id, d.a.client_id, "signed_off", `Processor assessment for ${d.a.answers.vendor || d.a.title} was signed by ${name}`, `/app/clients/${d.a.client_id}/assessments/tpra/${d.a.id}`);
  redirect(flash("/portal/processors", `Signed. Your sign-off of ${d.a.answers.vendor || d.a.title} is recorded.`));
}

export default async function PortalProcessor({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { u, d } = await load(id);
  if (!d) notFound();
  const { a } = d, A = a.answers;
  const r = score(A, asModel(a.model));
  const ev = evidenceState(a, d.rows, d.files, todayWAT()).filter((e) => e.needed);
  const outstanding = ev.filter((e) => e.status === "outstanding" || e.expired);
  const conditions = (A.conditions ?? "").split(/\n+/).map((x: string) => x.replace(/^[-•*\d.)\s]+/, "").trim()).filter(Boolean);
  const ch = await one("select expires_at, attempts from otp_challenges where user_id = $1 and assessment_id = $2 and consumed_at is null order by created_at desc limit 1", [u.id, a.id]);
  const live = ch && +ch.expires_at > Date.now() && ch.attempts < 5;
  const h = <Hidden values={{ id: a.id }} />;
  const exp = (k: string) => `/export?kind=${k}&id=${a.id}&format=pdf`;
  return (
    <>
      <p><Link href="/portal/processors">Back to processors</Link></p>
      <h1 style={{ fontSize: 24 }}>{A.vendor || a.title}</h1>
      <p className="meta">{A.service || ""}{A.location ? ` · Hosted: ${A.location}` : ""}</p>
      <Flash sp={sp} />

      {a.status === "approved" && (
        <section className="panel">
          <div className="spread"><h2 style={{ marginTop: 0, fontSize: 18 }}>Decision</h2><RatingBadge rating={a.rating} /></div>
          <p><b>{a.outcome}</b>{r.residual != null ? <span className="meta"> · residual risk {r.impact} × {r.likelihood} = {r.residual} of 25</span> : null}</p>
          {a.rating && <p className="meta">{REQUIREMENTS[a.rating as keyof typeof REQUIREMENTS]}</p>}
          {conditions.length > 0 && <><b>Conditions of approval</b><ul>{conditions.map((c: string, i: number) => <li key={i}>{c}</li>)}</ul></>}
          {a.next_review && <p className="meta">Next review: {fmtDate(a.next_review)}</p>}
          <p><a className="btn secondary" href={exp("assessment")} target="_blank" rel="noreferrer">Read the full report (PDF)</a></p>
        </section>
      )}

      {a.status === "approved" && (a.client_signed_at ? <Banner kind="ok">Signed by {a.client_signed_name} on {fmtDate(new Date(a.client_signed_at).toISOString().slice(0, 10))}.</Banner> : (
        <section className="panel">
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Sign off this decision</h2>
          <p className="meta">Read the report first. Signing records your name, the time and a fingerprint of the decision as approved.</p>
          {!live ? <form action={sendCode}>{h}<Submit>Send me a signing code</Submit></form> : (
            <form action={sign}>{h}
              <Field label="Your full name" required><input name="typed_name" required autoComplete="name" /></Field>
              <Field label="6-digit code from your email" required><input name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required style={{ width: 160 }} /></Field>
              <label className="check"><input type="checkbox" name="consent" required />I have read the assessment and approve the decision and its conditions.</label>
              <div className="row" style={{ marginTop: 12 }}><Submit>Sign</Submit></div>
            </form>
          )}
          {live && <form action={sendCode} style={{ marginTop: 8 }}>{h}<Submit className="btn quiet">Send a new code</Submit></form>}
        </section>
      ))}

      <section className="panel">
        <div className="spread"><h2 style={{ marginTop: 0, fontSize: 18 }}>Documents about this processor</h2><span className="meta">{ev.length - outstanding.length} of {ev.length} received</span></div>
        <p className="meta">Ask {A.vendor || "the processor"} for these documents and upload them here. Where a document does not exist, tell your DPCO. <a href={exp("tpra-request")} target="_blank" rel="noreferrer">Download the request (PDF)</a></p>
        <form action={upload}>{h}
          {ev.map((e) => (
            <div key={e.i} style={{ borderTop: "1px solid rgba(255,255,255,0.12)", padding: "10px 0" }}>
              <div className="spread"><b>{e.name}</b><span className={`chip ${e.expired ? "overdue" : e.status === "received" ? "complete" : e.status === "not_applicable" ? "na" : "missing"}`}>{e.expired ? "Expired" : e.status === "received" ? "Received" : e.status === "not_applicable" ? "Not applicable" : "Outstanding"}</span></div>
              <span className="meta" style={{ display: "block" }}>{DOMAINS.find((x) => x.key === e.domain)?.label ?? "All areas"}{e.files.length ? ` · ${e.files.map((f) => f.original_name).join(", ")}` : ""}</span>
              {e.status !== "not_applicable" && <input type="file" name={`ev_file_${e.i}`} multiple accept={ACCEPT} aria-label={`Upload ${e.name}`} style={{ marginTop: 6 }} />}
            </div>
          ))}
          <div style={{ marginTop: 12 }}><Submit>Upload</Submit></div>
        </form>
      </section>
    </>
  );
}
