import Link from "next/link";
import { redirect } from "next/navigation";
import { requireClient, audit, send } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { CAR_CATEGORIES } from "@/lib/rules";
import { str, opt, flash } from "@/lib/form";
import { Flash, Field, Hidden, Chip, Empty, Deadline } from "@/components/ui";
import { Submit } from "@/components/client";

async function createRequest(fd: FormData) {
  "use server";
  const { user, client } = await requireClient(str(fd, "client_id"), { write: true });
  const title = str(fd, "title");
  const b = `/app/clients/${client.id}/evidence`;
  if (!title) redirect(flash(`${b}?new=1`, "Enter a title.", "error"));
  const item = opt(fd, "car_item_id");
  if (item && !(await one("select 1 from client_car_items where id = $1 and client_id = $2", [item, client.id]))) redirect("/forbidden");
  const r = await one("insert into evidence_requests (firm_id, client_id, title, description, due_on, car_item_id, created_by) values ($1,$2,$3,$4,$5,$6,$7) returning id",
    [client.firm_id, client.id, title, opt(fd, "description"), opt(fd, "due_on"), item, user.id]);
  await audit(user, "create", "evidence_request", r!.id, { client_id: client.id });
  for (const c of await q("select email from client_contacts where client_id = $1 and status = 'active'", [client.id]))
    await send("email", c.email, "evidence_request", "Your DPCO has asked for a document. Log in to the portal to upload it.");
  redirect(flash(b, "Evidence requested. The client sees it in their portal."));
}

export default async function Evidence({ params, searchParams }: { params: Promise<{ clientId: string }>; searchParams: Promise<Record<string, string>> }) {
  const { clientId } = await params;
  const sp = await searchParams;
  const { client } = await requireClient(clientId);
  const b = `/app/clients/${clientId}/evidence`;
  const rows = await q(`select e.*, i.category_key, i.item_text, (select count(*)::int from files f where f.evidence_request_id = e.id) as files
    from evidence_requests e left join client_car_items i on i.id = e.car_item_id where e.client_id = $1
    order by coalesce(i.category_key, 'zz'), e.created_at desc`, [clientId]);
  const items = await q("select id, category_key, item_text from client_car_items where client_id = $1 order by category_key, position", [clientId]);
  const groups = [...Object.keys(CAR_CATEGORIES), null];
  return (
    <>
      <h2 style={{ marginTop: 0 }}>Evidence requests</h2>
      <Flash sp={sp} />
      {!client.archived_at && (
        <details className="group" open={!!sp.new || !!sp.item}>
          <summary>New evidence request</summary>
          <form action={createRequest} style={{ maxWidth: 640 }}>
            <Hidden values={{ client_id: clientId }} />
            <Field label="Title" required><input name="title" required defaultValue={items.find((i) => i.id === sp.item)?.item_text ?? ""} /></Field>
            <Field label="What you need" help="The client sees this."><textarea name="description" /></Field>
            <Field label="Due date"><input type="date" name="due_on" /></Field>
            <Field label="CAR checklist item">
              <select name="car_item_id" defaultValue={sp.item ?? ""}>
                <option value="">None</option>
                {Object.entries(CAR_CATEGORIES).map(([k, l]) => <optgroup key={k} label={l}>{items.filter((i) => i.category_key === k).map((i) => <option key={i.id} value={i.id}>{i.item_text}</option>)}</optgroup>)}
              </select>
            </Field>
            <Submit>Request evidence</Submit>
          </form>
        </details>
      )}
      {rows.length === 0 ? <Empty><p>No evidence requested yet.</p></Empty> : groups.map((g) => {
        const rs = rows.filter((r) => (r.category_key ?? null) === g);
        return rs.length ? (
          <section key={g ?? "none"}>
            <h3>{g ? CAR_CATEGORIES[g] : "Not linked to a checklist item"}</h3>
            <table className="register">
              <thead><tr><th>Request</th><th>Status</th><th>Due</th><th className="num">Files</th></tr></thead>
              <tbody>{rs.map((r) => (
                <tr key={r.id}>
                  <td><Link href={`${b}/${r.id}`}>{r.title}</Link>{r.item_text && <div className="meta" style={{ fontWeight: 400 }}>{r.item_text}</div>}</td>
                  <td data-label="Status"><Chip status={r.status} /></td>
                  <td data-label="Due">{r.due_on && ["open", "rejected"].includes(r.status) ? <Deadline due={r.due_on} dateOnly /> : "—"}</td>
                  <td data-label="Files" className="num">{r.files}</td>
                </tr>
              ))}</tbody>
            </table>
          </section>
        ) : null;
      })}
    </>
  );
}
