import Link from "next/link";
import { redirect } from "next/navigation";
import { requireClient } from "@/lib/auth";
import { createBreach } from "@/lib/breach";
import { parseWATLocal, nowWATLocal } from "@/lib/rules";
import { str, opt, flash } from "@/lib/form";
import { Field, Hidden, Flash } from "@/components/ui";
import { Submit } from "@/components/client";

async function log(fd: FormData) {
  "use server";
  const { user, client } = await requireClient(str(fd, "client_id"), { write: true });
  const self = `/app/clients/${client.id}/breaches/new`;
  const aware = parseWATLocal(str(fd, "aware_at"));
  if (!aware) redirect(flash(self, "Enter when you became aware, as a date and time.", "error"));
  if (+aware > Date.now() + 60_000) redirect(flash(self, "The awareness time can't be in the future.", "error"));
  const description = str(fd, "description");
  if (!description) redirect(flash(self, "Describe what happened.", "error"));
  const nr = str(fd, "notification_required");
  const id = await createBreach(user, client as any, {
    aware_at: aware, description, data_affected: opt(fd, "data_affected"), subjects_affected: opt(fd, "subjects_affected"),
    est_count: str(fd, "est_count") ? Math.max(0, Number(str(fd, "est_count"))) : null, containment: opt(fd, "containment"),
    severity: ["low", "medium", "high"].includes(str(fd, "severity")) ? str(fd, "severity") : null,
    notification_required: ["yes", "unknown"].includes(nr) ? nr : "unknown",
  }, "firm");
  redirect(`/app/clients/${client.id}/breaches/${id}?ok=Breach+logged.+The+72-hour+countdown+has+started.`);
}

export default async function NewBreach({ params, searchParams }: { params: Promise<{ clientId: string }>; searchParams: Promise<Record<string, string>> }) {
  const { clientId } = await params;
  const sp = await searchParams;
  await requireClient(clientId, { write: true });
  return (
    <>
      <h2 style={{ marginTop: 0 }}>Log breach</h2>
      <Flash sp={sp} />
      <form action={log} style={{ maxWidth: 640 }}>
        <Hidden values={{ client_id: clientId }} />
        <Field label="When did the organisation become aware? (WAT)" help="The 72-hour NDPC deadline runs from this time." required>
          <input type="datetime-local" name="aware_at" max={nowWATLocal()} required />
        </Field>
        <Field label="What happened" required><textarea name="description" required /></Field>
        <Field label="Personal data affected"><textarea name="data_affected" /></Field>
        <Field label="People affected" help="For example: customers, staff."><input name="subjects_affected" /></Field>
        <Field label="Estimated number of people affected"><input type="number" name="est_count" min={0} inputMode="numeric" /></Field>
        <Field label="Containment actions taken"><textarea name="containment" /></Field>
        <Field label="Severity"><select name="severity" defaultValue=""><option value="">Not yet assessed</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></Field>
        <Field label="Does the NDPC need to be notified?"><select name="notification_required" defaultValue="unknown"><option value="unknown">Not yet known</option><option value="yes">Yes</option></select></Field>
        <p className="meta">To record that notification isn&apos;t required, save first, then give the reason on the breach page.</p>
        <div className="row"><Submit>Save breach</Submit><Link className="btn secondary" href={`/app/clients/${clientId}/breaches`}>Cancel</Link></div>
      </form>
    </>
  );
}
