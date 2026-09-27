import Link from "next/link";
import { redirect } from "next/navigation";
import { requireContact } from "@/lib/auth";
import { one } from "@/lib/db";
import { createBreach, reference } from "@/lib/breach";
import { parseWATLocal, nowWATLocal } from "@/lib/rules";
import { str, opt, flash } from "@/lib/form";
import { Flash, Field } from "@/components/ui";
import { Submit } from "@/components/client";

async function report(fd: FormData) {
  "use server";
  const u = await requireContact();
  const client = await one("select id, firm_id, name, archived_at from clients where id = $1", [u.client_id]);
  if (client!.archived_at) redirect("/portal");
  const aware = parseWATLocal(str(fd, "aware_at"));
  if (!aware || +aware > Date.now() + 60_000) redirect(flash("/portal/report-breach", "Enter when you found out, as a date and time (not in the future).", "error"));
  const what = str(fd, "description");
  if (!what) redirect(flash("/portal/report-breach", "Tell us what happened.", "error"));
  const id = await createBreach(u, client as any, {
    aware_at: aware, description: what, data_affected: opt(fd, "affected"), subjects_affected: null, est_count: null,
    containment: opt(fd, "done"), severity: null, notification_required: "unknown", reporter_phone: opt(fd, "phone"),
  }, "portal");
  redirect(flash("/portal", `Your DPCO has been alerted. Reference ${reference(id)}. They will contact you shortly.`));
}

export default async function ReportBreach({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireContact();
  const sp = await searchParams;
  return (
    <>
      <p><Link href="/portal">Back to home</Link></p>
      <h1 style={{ fontSize: 24 }}>Report a breach</h1>
      <p>Tell us as soon as you suspect personal data has been lost, stolen, seen by the wrong people or changed without permission. You don&apos;t need all the details yet.</p>
      <Flash sp={sp} />
      <form action={report}>
        <Field label="When did you find out? (WAT)" required><input type="datetime-local" name="aware_at" max={nowWATLocal()} defaultValue={nowWATLocal()} required /></Field>
        <Field label="What happened?" required><textarea name="description" required /></Field>
        <Field label="What personal data and which people may be affected?"><textarea name="affected" /></Field>
        <Field label="What have you done so far?"><textarea name="done" /></Field>
        <Field label="A phone number we can reach you on"><input type="tel" name="phone" autoComplete="tel" /></Field>
        <div className="sticky-bar"><Submit className="btn danger">Send report</Submit></div>
      </form>
    </>
  );
}
