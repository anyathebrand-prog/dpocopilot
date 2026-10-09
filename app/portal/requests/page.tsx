import Link from "next/link";
import { redirect } from "next/navigation";
import { requireContact, audit, send } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { answersOf } from "@/lib/data";
import { list } from "@/lib/questionnaire";
import { storeFile, ACCEPT } from "@/lib/files";
import { requesterEmail } from "@/lib/dsar";
import { fmtDate, fmtWAT, todayWAT } from "@/lib/rules";
import { str, opt, flash } from "@/lib/form";
import { Flash, Field, Hidden, Empty, Deadline } from "@/components/ui";
import { Submit } from "@/components/client";

const TYPE: Record<string, string> = { access: "Access", rectification: "Correction", erasure: "Deletion", objection: "Objection", portability: "Portability" };
const STATUS: [string, string][] = [["not_verified", "Not yet verified"], ["verified", "Identity verified"], ["failed", "Could not verify"]];
const METHODS = ["Government ID (NIN slip, passport, driver's licence, voter's card)", "Staff or student ID card", "Confirmation from the email or phone on our records", "Signed in to our portal or app", "In person, ID seen", "Other (see notes)"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const back = "/portal/requests";

async function load(fd: FormData) {
  const u = await requireContact();
  const d = await one("select d.*, c.name as client_name, c.firm_id from dsars d join clients c on c.id = d.client_id where d.id = $1 and d.client_id = $2 and d.status = 'open'", [/^[0-9a-f-]{36}$/.test(str(fd, "id")) ? str(fd, "id") : null, u.client_id]);
  if (!d) redirect("/forbidden");
  return { u, d };
}

/** Identity check and the executing department; a newly assigned department (or a new email for it) is emailed to act promptly. */
async function save(fd: FormData) {
  "use server";
  const { u, d } = await load(fd);
  const status = str(fd, "id_status"), method = opt(fd, "id_method"), dept = opt(fd, "department"), deptEmail = opt(fd, "department_email")?.toLowerCase() ?? null;
  if (!STATUS.some(([k]) => k === status)) redirect(flash(back, "Choose the identity check result.", "error"));
  if (status !== "not_verified" && !method) redirect(flash(back, "Say how you checked their identity.", "error"));
  if (method && !METHODS.includes(method)) redirect(flash(back, "Choose how you checked their identity.", "error"));
  if (dept && !list((await answersOf(u.client_id!)).org_departments).includes(dept)) redirect(flash(back, "Choose a department from the list.", "error"));
  if (dept && (!deptEmail || !EMAIL.test(deptEmail))) redirect(flash(back, `Enter ${dept}'s email so they can be asked to act on the request.`, "error"));
  await q(`update dsars set id_status = $2, id_method = $3, id_notes = $4, department = $5, department_email = $7,
      id_checked_by = case when $2 = 'not_verified' then null else $6::uuid end, id_checked_at = case when $2 = 'not_verified' then null else now() end where id = $1`,
    [d.id, status, method, opt(fd, "id_notes"), dept, u.id, dept ? deptEmail : null]);
  let note = "Saved";
  if (dept && (dept !== d.department || deptEmail !== d.department_email)) {
    const text = `Dear ${dept} team,\n\nA data subject request has been assigned to your department. Please attend to it promptly so that ${d.client_name} responds within the period required by the Nigeria Data Protection Act, 2023.\n\nRequest: ${TYPE[d.request_type] ?? d.request_type}\nRequester: ${d.requester_name}\nReceived: ${fmtDate(d.received_on)}\nResponse due by: ${fmtDate(d.deadline_on)}\nIdentity check: ${STATUS.find(([k]) => k === status)![1]}${d.details ? `\nDetails: ${d.details}` : ""}\n\nPlease reply to the Data Protection Officer when the request has been carried out.`;
    await send("email", deptEmail!, "dsar_department_assignment", `Data subject request assigned to ${dept} (due ${fmtDate(d.deadline_on)})`, { body: text });
    await q("update dsars set department_notified_at = now() where id = $1", [d.id]);
    note = `Saved. ${dept} has been emailed to attend to the request promptly.`;
  }
  await audit(u, "update", "dsar", d.id, { client_id: d.client_id, details: { id_status: status, department: dept } });
  redirect(flash(back, note));
}

/** Evidence of response attached and submitted: the request closes and the requester is emailed with the evidence. */
async function complete(fd: FormData) {
  "use server";
  const { u, d } = await load(fd);
  const to = (opt(fd, "requester_email") ?? "").toLowerCase();
  if (d.id_status !== "verified") redirect(flash(back, "Verify the requester's identity before sending the response.", "error"));
  if (!EMAIL.test(to)) redirect(flash(back, "Enter the requester's email address to send the response to.", "error"));
  const files = fd.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) redirect(flash(back, "Attach the evidence of response.", "error"));
  const ids: string[] = [];
  for (const f of files) {
    const r = await storeFile(u, { id: d.client_id, firm_id: d.firm_id }, f, null);
    if ("error" in r) redirect(flash(back, r.error, "error"));
    await q("update files set dsar_id = $2 where id = $1", [r.id, d.id]);
    ids.push(r.id);
  }
  const message = opt(fd, "message");
  const text = `Dear ${d.requester_name},\n\nFurther to your ${(TYPE[d.request_type] ?? d.request_type).toLowerCase()} request received on ${fmtDate(d.received_on)}, we write to confirm that your request has been completed, consistent with the requirements of the Nigeria Data Protection Act, 2023 and our internal policy.${message ? `\n\n${message}` : ""}\n\nEvidence of the action taken is attached (${files.map((f) => f.name).join(", ")}).\n\nIf you have any concerns about how your request was handled, you may contact our Data Protection Officer, and you also have the right to complain to the Nigeria Data Protection Commission.\n\nYours faithfully,\n${d.client_name}`;
  await send("email", to, "dsar_completed", `Your data subject request has been completed (${files.length} attachment${files.length === 1 ? "" : "s"})`, { body: text, attachments: ids });
  await q("update dsars set requester_email = $2, status = 'closed', closed_at = now(), response_sent_at = now(), response_sent_method = 'email' where id = $1", [d.id, to]);
  await audit(u, "update", "dsar", d.id, { client_id: d.client_id, details: { completed: true, evidence: ids.length } });
  redirect(flash(back, `Response sent to ${to} with ${files.length} attachment${files.length === 1 ? "" : "s"}. The request is completed.`));
}

export default async function VerifyRequests({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const u = await requireContact();
  const sp = await searchParams;
  const rows = await q("select * from dsars where client_id = $1 and status = 'open' order by deadline_on", [u.client_id]);
  const done = await q(`select d.*, (select coalesce(json_agg(json_build_object('id', f.id, 'name', f.original_name)), '[]') from files f where f.dsar_id = d.id) as evidence
    from dsars d where d.client_id = $1 and d.status = 'closed' and d.response_sent_at is not null order by d.response_sent_at desc limit 20`, [u.client_id]);
  const depts = list((await answersOf(u.client_id!)).org_departments);
  return (
    <>
      <h1 style={{ fontSize: 24 }}>Verify &amp; assign requests</h1>
      <p>Confirm the person is who they say they are, assign the department that will carry out the request, then send the response with evidence.</p>
      <Flash sp={sp} />
      {rows.length === 0 ? <Empty><p>No open requests. <Link href="/portal/log-request">Log a data request</Link>.</p></Empty> : rows.map((d) => (
        <section key={d.id} className="panel" style={{ marginBottom: 16 }}>
          <div className="spread" style={{ alignItems: "flex-start" }}>
            <div><h3 style={{ margin: 0 }}>{d.requester_name} · {TYPE[d.request_type] ?? d.request_type}</h3>
              <div className="meta">Received {fmtDate(d.received_on)}{d.requester_contact ? ` · ${d.requester_contact}` : ""}</div>
              {d.details && <p className="small" style={{ margin: "6px 0 0" }}>{d.details}</p>}</div>
            <Deadline due={d.deadline_on} dateOnly />
          </div>

          <form action={save} style={{ marginTop: 12 }}>
            <Hidden values={{ id: d.id }} />
            <h3 style={{ fontSize: 16 }}>1. Verify identity and assign</h3>
            <div className="row" style={{ alignItems: "flex-end" }}>
              <Field label="Identity check" required><select name="id_status" defaultValue={d.id_status}>{STATUS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
              <Field label="How you checked"><select name="id_method" defaultValue={d.id_method ?? ""}><option value="">–</option>{METHODS.map((m) => <option key={m}>{m}</option>)}</select></Field>
            </div>
            <Field label="Notes on the check" help="e.g. matched NIN slip to the name and date of birth we hold. Don't record the ID number itself."><textarea name="id_notes" rows={2} defaultValue={d.id_notes ?? ""} /></Field>
            <div className="row" style={{ alignItems: "flex-end" }}>
              <Field label="Department to execute the request" help={depts.length ? undefined : "Add your departments in Onboarding answers to choose one."}>
                <select name="department" defaultValue={d.department ?? ""}><option value="">Choose…</option>{depts.map((x) => <option key={x}>{x}</option>)}</select>
              </Field>
              <Field label="Department's email" help="Needed when a department is chosen; they are emailed to act promptly."><input type="email" name="department_email" defaultValue={d.department_email ?? ""} placeholder="e.g. finance@yourorg.ng" /></Field>
            </div>
            {d.department_notified_at && <p className="meta">{d.department} emailed {fmtWAT(d.department_notified_at)}.</p>}
            <Submit className="btn secondary">Save</Submit>
          </form>

          <form action={complete} style={{ marginTop: 20 }}>
            <Hidden values={{ id: d.id }} />
            <h3 style={{ fontSize: 16 }}>2. Respond to the requester</h3>
            {d.id_status !== "verified" ? <p className="meta">Verify the requester&apos;s identity first.</p> : (
              <>
                <Field label="Requester's email" required><input type="email" name="requester_email" required defaultValue={d.requester_email ?? requesterEmail(d.requester_contact) ?? ""} /></Field>
                <Field label="Evidence of response" required help="e.g. the copy of data provided, confirmation of deletion or correction. PDF, Word, Excel or images."><input type="file" name="file" multiple required accept={ACCEPT} /></Field>
                <Field label="Message to the requester (optional)"><textarea name="message" rows={2} /></Field>
                <Submit>Submit</Submit>
              </>
            )}
          </form>
        </section>
      ))}

      {done.length > 0 && (
        <>
          <h2 style={{ fontSize: 18 }}>Completed requests</h2>
          <table className="register">
            <thead><tr><th>Requester</th><th>Request</th><th>Department</th><th>Completed</th><th>Evidence sent</th></tr></thead>
            <tbody>{done.map((d) => (
              <tr key={d.id}>
                <td>{d.requester_name}<div className="meta">{d.requester_email}</div></td>
                <td data-label="Request">{TYPE[d.request_type] ?? d.request_type}</td>
                <td data-label="Department">{d.department ?? "—"}</td>
                <td data-label="Completed" className="small">{fmtWAT(d.response_sent_at)}{d.closed_at && new Date(d.closed_at).toISOString().slice(0, 10) > String(d.deadline_on) ? <b> (late)</b> : ""}</td>
                <td data-label="Evidence" className="small">{(d.evidence as { id: string; name: string }[]).map((f) => <div key={f.id}><a href={`/files/${f.id}`}>{f.name}</a></div>)}</td>
              </tr>
            ))}</tbody>
          </table>
        </>
      )}
      <p className="caption" style={{ marginTop: 16 }}>Today is {fmtDate(todayWAT())}. Responses are due within the period set by the NDPA.</p>
    </>
  );
}
