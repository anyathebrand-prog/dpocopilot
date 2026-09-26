import Link from "next/link";
import { redirect } from "next/navigation";
import { requireClient, audit } from "@/lib/auth";
import { q, tx } from "@/lib/db";
import { str, all, flash } from "@/lib/form";
import { Field, Hidden, Empty, Flash } from "@/components/ui";
import { Submit } from "@/components/client";

async function create(fd: FormData) {
  "use server";
  const { user, client } = await requireClient(str(fd, "client_id"), { write: true });
  const title = str(fd, "title"), ropa = all(fd, "ropa");
  const self = `/app/clients/${client.id}/dpias/new`;
  if (!title) redirect(flash(self, "Enter a title.", "error"));
  if (!ropa.length) redirect(flash(self, "Select at least one processing activity.", "error"));
  const valid = await q("select id from ropa_entries where client_id = $1 and id = any($2::uuid[])", [client.id, ropa]);
  if (valid.length !== ropa.length) redirect("/forbidden");
  const id = await tx(async (t) => {
    const d = await t.query<{ id: string }>("insert into dpias (firm_id, client_id, title, created_by) values ($1,$2,$3,$4) returning id", [client.firm_id, client.id, title, user.id]);
    for (const r of ropa) await t.query("insert into dpia_ropa (dpia_id, ropa_entry_id) values ($1,$2)", [d.rows[0].id, r]);
    await t.query("insert into content_versions (firm_id, client_id, parent_type, parent_id, version_no, body, created_by) values ($1,$2,'dpia',$3,1,'{}',$4)", [client.firm_id, client.id, d.rows[0].id, user.id]);
    await audit(user, "create", "dpia", d.rows[0].id, { client_id: client.id }, t);
    return d.rows[0].id;
  });
  redirect(`/app/clients/${client.id}/dpias/${id}?ok=DPIA+started`);
}

export default async function NewDpia({ params, searchParams }: { params: Promise<{ clientId: string }>; searchParams: Promise<Record<string, string>> }) {
  const { clientId } = await params;
  const sp = await searchParams;
  await requireClient(clientId, { write: true });
  const ropa = await q("select id, purpose, involves_sensitive, is_high_risk from ropa_entries where client_id = $1 and state = 'active' order by purpose", [clientId]);
  return (
    <>
      <h2 style={{ marginTop: 0 }}>Start DPIA</h2>
      <Flash sp={sp} />
      {ropa.length === 0 ? <Empty><p>Add RoPA entries first. A DPIA must cover at least one processing activity.</p><Link className="btn" href={`/app/clients/${clientId}/ropa`}>Open RoPA</Link></Empty> : (
        <form action={create} style={{ maxWidth: 640 }}>
          <Hidden values={{ client_id: clientId }} />
          <Field label="Title" required><input name="title" required defaultValue={ropa.find((r) => r.id === sp.ropa)?.purpose ?? ""} /></Field>
          <fieldset>
            <legend>Processing activities covered (required)</legend>
            {ropa.map((r) => (
              <label key={r.id} className="check"><input type="checkbox" name="ropa" value={r.id} defaultChecked={r.id === sp.ropa} />{r.purpose}
                {(r.involves_sensitive || r.is_high_risk) && <span className="meta"> · {r.involves_sensitive ? "sensitive data" : "high risk"}</span>}</label>
            ))}
            <p className="why">Select at least one activity to create the DPIA.</p>
          </fieldset>
          <div className="row"><Submit>Create DPIA</Submit><Link className="btn secondary" href={`/app/clients/${clientId}/dpias`}>Cancel</Link></div>
        </form>
      )}
    </>
  );
}
