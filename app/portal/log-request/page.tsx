import Link from "next/link";
import { redirect } from "next/navigation";
import { requireContact } from "@/lib/auth";
import { one } from "@/lib/db";
import { createDsar } from "@/lib/dsar";
import { todayWAT } from "@/lib/rules";
import { str, opt, flash } from "@/lib/form";
import { Flash, Field } from "@/components/ui";
import { Submit } from "@/components/client";

const TYPES: [string, string, string][] = [
  ["access", "Access", "They want a copy of the personal data you hold about them."],
  ["rectification", "Correction", "They say some of their data is wrong and want it fixed."],
  ["erasure", "Deletion", "They want you to delete their data."],
  ["objection", "Objection", "They want you to stop using their data for something, such as marketing."],
  ["portability", "Portability", "They want their data in a format they can take elsewhere."],
];

async function log(fd: FormData) {
  "use server";
  const u = await requireContact();
  const client = await one("select id, firm_id, name, archived_at from clients where id = $1", [u.client_id]);
  if (client!.archived_at) redirect("/portal");
  const type = str(fd, "request_type"), received = str(fd, "received_on"), name = str(fd, "requester_name");
  if (!TYPES.some(([k]) => k === type)) redirect(flash("/portal/log-request", "Choose what the person is asking for.", "error"));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(received) || received > todayWAT()) redirect(flash("/portal/log-request", "Enter the date you received it (not in the future).", "error"));
  if (!name) redirect(flash("/portal/log-request", "Enter the person's name.", "error"));
  await createDsar(u, client as any, { request_type: type, received_on: received, requester_name: name, requester_contact: opt(fd, "requester_contact"), details: opt(fd, "details") }, "portal");
  redirect(flash("/portal", "Request logged. Your DPCO will help you respond on time."));
}

export default async function LogRequest({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireContact();
  const sp = await searchParams;
  return (
    <>
      <p><Link href="/portal">Back to home</Link></p>
      <h1 style={{ fontSize: 24 }}>Log a data subject request</h1>
      <p>Use this when someone asks your organisation about their personal data.</p>
      <Flash sp={sp} />
      <form action={log}>
        <fieldset>
          <legend>What are they asking for? (required)</legend>
          {TYPES.map(([k, l, help]) => <label key={k} className="check"><input type="radio" name="request_type" value={k} required /><span><b>{l}</b><br /><span className="meta">{help}</span></span></label>)}
        </fieldset>
        <Field label="Date you received it" required><input type="date" name="received_on" max={todayWAT()} defaultValue={todayWAT()} required /></Field>
        <Field label="Their name" required><input name="requester_name" required /></Field>
        <Field label="Their email or phone"><input name="requester_contact" /></Field>
        <Field label="Anything else we should know"><textarea name="details" /></Field>
        <div className="sticky-bar"><Submit>Send request</Submit></div>
      </form>
    </>
  );
}
