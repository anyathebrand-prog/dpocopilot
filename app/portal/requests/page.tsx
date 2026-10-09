import Link from "next/link";
import { redirect } from "next/navigation";
import { requireContact, audit } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { answersOf } from "@/lib/data";
import { list } from "@/lib/questionnaire";
import { fmtDate, fmtWAT } from "@/lib/rules";
import { str, opt, flash } from "@/lib/form";
import { Flash, Field, Hidden, Empty, Deadline } from "@/components/ui";
import { Submit } from "@/components/client";

const TYPE: Record<string, string> = { access: "Access", rectification: "Correction", erasure: "Deletion", objection: "Objection", portability: "Portability" };
const STATUS: [string, string][] = [["not_verified", "Not yet verified"], ["verified", "Identity verified"], ["failed", "Could not verify"]];
const METHODS = ["Government ID (NIN slip, passport, driver's licence, voter's card)", "Staff or student ID card", "Confirmation from the email or phone on our records", "Signed in to our portal or app", "In person, ID seen", "Other (see notes)"];

/** Client contact records the requester's identity check and the department that will carry out the request. */
async function save(fd: FormData) {
  "use server";
  const u = await requireContact();
  const d = await one("select id, client_id from dsars where id = $1 and client_id = $2 and status = 'open'", [/^[0-9a-f-]{36}$/.test(str(fd, "id")) ? str(fd, "id") : null, u.client_id]);
  if (!d) redirect("/forbidden");
  const back = "/portal/requests", status = str(fd, "id_status"), method = opt(fd, "id_method"), dept = opt(fd, "department");
  if (!STATUS.some(([k]) => k === status)) redirect(flash(back, "Choose the identity check result.", "error"));
  if (status !== "not_verified" && !method) redirect(flash(back, "Say how you checked their identity.", "error"));
  if (method && !METHODS.includes(method)) redirect(flash(back, "Choose how you checked their identity.", "error"));
  const depts = list((await answersOf(u.client_id!)).org_departments);
  if (dept && !depts.includes(dept)) redirect(flash(back, "Choose a department from the list.", "error"));
  await q(`update dsars set id_status = $2, id_method = $3, id_notes = $4, department = $5,
      id_checked_by = case when $2 = 'not_verified' then null else $6::uuid end, id_checked_at = case when $2 = 'not_verified' then null else now() end where id = $1`,
    [d.id, status, method, opt(fd, "id_notes"), dept, u.id]);
  await audit(u, "update", "dsar", d.id, { client_id: d.client_id, details: { id_status: status, department: dept } });
  redirect(flash(back, "Saved"));
}

export default async function VerifyRequests({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const u = await requireContact();
  const sp = await searchParams;
  const rows = await q("select * from dsars where client_id = $1 and status = 'open' order by deadline_on", [u.client_id]);
  const depts = list((await answersOf(u.client_id!)).org_departments);
  return (
    <>
      <h1 style={{ fontSize: 24 }}>Verify &amp; assign requests</h1>
      <p>Before acting on a data subject request, confirm the person is who they say they are, then choose the department that will carry it out.</p>
      <Flash sp={sp} />
      {rows.length === 0 ? <Empty><p>No open requests. <Link href="/portal/log-request">Log a data request</Link>.</p></Empty> : rows.map((d) => (
        <form key={d.id} action={save} className="panel" style={{ marginBottom: 16 }}>
          <Hidden values={{ id: d.id }} />
          <div className="spread" style={{ alignItems: "flex-start" }}>
            <div><h3 style={{ margin: 0 }}>{d.requester_name} · {TYPE[d.request_type] ?? d.request_type}</h3>
              <div className="meta">Received {fmtDate(d.received_on)}{d.requester_contact ? ` · ${d.requester_contact}` : ""}</div>
              {d.details && <p className="small" style={{ margin: "6px 0 0" }}>{d.details}</p>}</div>
            <Deadline due={d.deadline_on} dateOnly />
          </div>
          <div className="row" style={{ alignItems: "flex-end", marginTop: 12 }}>
            <Field label="Identity check" required><select name="id_status" defaultValue={d.id_status}>{STATUS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
            <Field label="How you checked"><select name="id_method" defaultValue={d.id_method ?? ""}><option value="">–</option>{METHODS.map((m) => <option key={m}>{m}</option>)}</select></Field>
          </div>
          <Field label="Notes on the check" help="e.g. matched NIN slip to the name and date of birth we hold. Don't record the ID number itself."><textarea name="id_notes" rows={2} defaultValue={d.id_notes ?? ""} /></Field>
          <Field label="Department to execute the request" help={depts.length ? undefined : "Add your departments in Onboarding answers to choose one."}>
            <select name="department" defaultValue={d.department ?? ""}><option value="">Choose…</option>{depts.map((x) => <option key={x}>{x}</option>)}</select>
          </Field>
          {d.id_checked_at && <p className="meta">Last checked {fmtWAT(d.id_checked_at)}.</p>}
          <Submit>Save</Submit>
        </form>
      ))}
    </>
  );
}
