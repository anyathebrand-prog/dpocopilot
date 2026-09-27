import Link from "next/link";
import { redirect } from "next/navigation";
import { requireClient } from "@/lib/auth";
import { q } from "@/lib/db";
import { createDsar } from "@/lib/dsar";
import { setting } from "@/lib/data";
import { DSAR_TYPES } from "@/lib/templates";
import { todayWAT } from "@/lib/rules";
import { str, opt, all, flash } from "@/lib/form";
import { Field, Hidden, Flash } from "@/components/ui";
import { Submit } from "@/components/client";

async function log(fd: FormData) {
  "use server";
  const { user, client } = await requireClient(str(fd, "client_id"), { write: true });
  const self = `/app/clients/${client.id}/dsars/new`;
  const type = str(fd, "request_type"), received = str(fd, "received_on"), name = str(fd, "requester_name");
  if (!DSAR_TYPES[type]) redirect(flash(self, "Choose the request type.", "error"));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(received) || received > todayWAT()) redirect(flash(self, "Enter the date received (not in the future).", "error"));
  if (!name) redirect(flash(self, "Enter the requester's name.", "error"));
  const id = await createDsar(user, client as any, { request_type: type, received_on: received, requester_name: name, requester_contact: opt(fd, "requester_contact"), details: opt(fd, "details"),
    id_status: ["verified", "failed"].includes(str(fd, "id_status")) ? str(fd, "id_status") : "not_verified", ropa: all(fd, "ropa") }, "firm");
  redirect(`/app/clients/${client.id}/dsars/${id}?ok=Request+logged`);
}

export default async function NewDsar({ params, searchParams }: { params: Promise<{ clientId: string }>; searchParams: Promise<Record<string, string>> }) {
  const { clientId } = await params;
  const sp = await searchParams;
  await requireClient(clientId, { write: true });
  const ropa = await q("select id, purpose from ropa_entries where client_id = $1 and state = 'active' order by purpose", [clientId]);
  const days = await setting("dsar_response_days");
  return (
    <>
      <h2 style={{ marginTop: 0 }}>Log data subject request</h2>
      <Flash sp={sp} />
      <form action={log} style={{ maxWidth: 640 }}>
        <Hidden values={{ client_id: clientId }} />
        <fieldset>
          <legend>Request type (required)</legend>
          {Object.entries(DSAR_TYPES).map(([k, l]) => <label key={k} className="check"><input type="radio" name="request_type" value={k} required />{l}</label>)}
        </fieldset>
        <Field label="Date received" help={`The response is due ${days} days after this date.`} required><input type="date" name="received_on" max={todayWAT()} defaultValue={todayWAT()} required /></Field>
        <Field label="Requester's name" required><input name="requester_name" required /></Field>
        <Field label="Requester's email or phone"><input name="requester_contact" /></Field>
        <Field label="Details"><textarea name="details" /></Field>
        <Field label="Identity verification"><select name="id_status" defaultValue="not_verified"><option value="not_verified">Not yet verified</option><option value="verified">Verified</option><option value="failed">Could not verify</option></select></Field>
        {ropa.length > 0 && (
          <fieldset><legend>Related processing activities</legend>
            {ropa.map((r) => <label key={r.id} className="check"><input type="checkbox" name="ropa" value={r.id} />{r.purpose}</label>)}
          </fieldset>
        )}
        <div className="row"><Submit>Save request</Submit><Link className="btn secondary" href={`/app/clients/${clientId}/dsars`}>Cancel</Link></div>
      </form>
    </>
  );
}
