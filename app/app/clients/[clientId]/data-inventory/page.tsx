import Link from "next/link";
import { redirect } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { requireClient, audit, canApprove } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { answersOf } from "@/lib/data";
import { evaluateMI, fmtWAT, type Criterion } from "@/lib/rules";
import { str, flash } from "@/lib/form";
import { Flash, Field, Hidden, Empty, Banner } from "@/components/ui";
import { Submit } from "@/components/client";

const TYPES: [string, string][] = [["data_subject", "Data subjects"], ["data_category", "Data categories"], ["purpose", "Purposes"], ["system", "Systems and storage"], ["recipient", "Recipients"], ["transfer", "Transfers outside Nigeria"]];
const path = (id: string) => `/app/clients/${id}/data-inventory`;

async function addItem(fd: FormData) {
  "use server";
  const { user, client } = await requireClient(str(fd, "client_id"), { write: true });
  const type = str(fd, "item_type"), name = str(fd, "name");
  if (!TYPES.some(([t]) => t === type) || !name) redirect(flash(path(client.id), "Choose a type and enter a name.", "error"));
  const r = await one("insert into inventory_items (firm_id, client_id, item_type, name, is_sensitive, source) values ($1,$2,$3,$4,$5,'manual') returning id", [client.firm_id, client.id, type, name, fd.get("sensitive") === "on"]);
  await audit(user, "create", "inventory_item", r!.id, { client_id: client.id });
  redirect(flash(path(client.id), "Item added"));
}

async function archiveItem(fd: FormData) {
  "use server";
  const { user, client } = await requireClient(str(fd, "client_id"), { write: true });
  await q("update inventory_items set archived_at = now() where id = $1 and client_id = $2", [str(fd, "item_id"), client.id]);
  await audit(user, "archive", "inventory_item", str(fd, "item_id"), { client_id: client.id });
  redirect(flash(path(client.id), "Item archived"));
}

async function recheck(fd: FormData) {
  "use server";
  const { user, client } = await requireClient(str(fd, "client_id"), { write: true });
  const criteria = await q<Criterion>("select description, question_key, op, value, source_ref from mi_criteria where status = 'published' order by position");
  const version = (await one("select to_char(max(published_at) at time zone 'Africa/Lagos', 'YYYY-MM-DD HH24:MI') as v from publish_events"))?.v ?? "v0-seed";
  const mi = evaluateMI(criteria, await answersOf(client.id));
  await q("insert into mi_assessments (firm_id, client_id, result, reasoning, criteria_version) values ($1,$2,$3,$4,$5)", [client.firm_id, client.id, mi.result, JSON.stringify(mi.reasoning), version]);
  await audit(user, "create", "mi_assessment", client.id, { client_id: client.id, details: { result: mi.result } });
  redirect(flash(path(client.id), "Indicator re-checked against current criteria"));
}

async function classify(fd: FormData) {
  "use server";
  const { user, client } = await requireClient(str(fd, "client_id"), { write: true });
  if (!canApprove(user)) redirect(flash(path(client.id), "Only a Lead Consultant or Firm Admin can set the classification.", "error"));
  const cls = str(fd, "mi_class");
  if (!["major_importance", "not_major_importance"].includes(cls)) redirect(flash(path(client.id), "Choose a classification.", "error"));
  await q("update clients set mi_class = $2, classified_by = $3, classified_at = now(), status = 'active' where id = $1", [client.id, cls, user.id]);
  await audit(user, "classify", "client", client.id, { client_id: client.id, details: { mi_class: cls } });
  redirect(flash(path(client.id), "Classification saved"));
}

export default async function Inventory({ params, searchParams }: { params: Promise<{ clientId: string }>; searchParams: Promise<Record<string, string>> }) {
  const { clientId } = await params;
  const sp = await searchParams;
  const { user, client } = await requireClient(clientId);
  const ro = !!client.archived_at;
  const items = await q("select * from inventory_items where client_id = $1 and archived_at is null order by item_type, name", [clientId]);
  const mi = await one("select * from mi_assessments where client_id = $1 order by created_at desc limit 1", [clientId]);
  const newer = mi && await one("select 1 from publish_events where published_at > $1", [mi.created_at]);
  const classifier = client.classified_by && await one("select name from users where id = $1", [client.classified_by]);
  const h = <Hidden values={{ client_id: clientId }} />;
  return (
    <>
      <h2 style={{ marginTop: 0 }}>Data inventory</h2>
      <Flash sp={sp} />
      <section className="panel" aria-labelledby="mi" style={{ marginBottom: 32 }}>
        <h3 id="mi">Major-importance indicator</h3>
        {!mi ? <p className="meta">Complete the onboarding questionnaire to see the indicator.</p> : (
          <>
            {newer && <Banner kind="warn">The criteria have been updated since this check. <form action={recheck} className="inline-form">{h}<Submit className="btn quiet">Re-check indicator</Submit></form></Banner>}
            <p><b>{mi.result === "likely" ? "Likely a data controller or processor of major importance" : "Unlikely to be of major importance"}</b></p>
            <ul>
              {mi.reasoning.map((r: any, i: number) => (
                <li key={i}>{r.met ? "Met" : "Not met"}: {r.description} <span className="meta">(answer: {String(r.answer ?? "none")}; source: {r.source_ref})</span></li>
              ))}
            </ul>
            <p className="caption">Checked {fmtWAT(mi.created_at)} against criteria version {mi.criteria_version}. Guidance, not legal advice.</p>
            <form action={classify}>{h}
              <fieldset disabled={ro || !canApprove(user)}>
                <legend>Final classification</legend>
                <label className="check"><input type="radio" name="mi_class" value="major_importance" defaultChecked={client.mi_class === "major_importance"} />Data controller or processor of major importance</label>
                <label className="check"><input type="radio" name="mi_class" value="not_major_importance" defaultChecked={client.mi_class === "not_major_importance"} />Not of major importance</label>
                {client.classified_at && <p className="caption">Set by {classifier?.name}, {fmtWAT(client.classified_at)}</p>}
                <Submit className="btn secondary">Save classification</Submit>
              </fieldset>
              {!canApprove(user) && <p className="why">Only a Lead Consultant can finalise the classification.</p>}
            </form>
          </>
        )}
      </section>

      {items.length === 0 ? <Empty><p>No inventory yet. It is built when the onboarding questionnaire is completed.</p><Link className="btn" href={`/app/clients/${clientId}/onboarding`}>Open onboarding</Link></Empty> :
        TYPES.map(([t, label]) => {
          const rows = items.filter((i) => i.item_type === t);
          return rows.length ? (
            <section key={t}>
              <h3>{label}</h3>
              <table className="register">
                <tbody>{rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}{r.is_sensitive && <span className="chip progress" style={{ marginLeft: 8 }}><TriangleAlert aria-hidden />Sensitive</span>}</td>
                    <td className="meta" data-label="Source">{r.source}</td>
                    <td style={{ width: 1 }}>{!ro && <form action={archiveItem}>{h}<input type="hidden" name="item_id" value={r.id} /><Submit className="btn quiet">Archive</Submit></form>}</td>
                  </tr>))}
                </tbody>
              </table>
            </section>
          ) : null;
        })}

      {!ro && (
        <form action={addItem} className="panel" style={{ marginTop: 32, maxWidth: 640 }}>{h}
          <h3>Add an item</h3>
          <Field label="Type"><select name="item_type">{TYPES.map(([t, l]) => <option key={t} value={t}>{l}</option>)}</select></Field>
          <Field label="Name" required><input name="name" required /></Field>
          <label className="check"><input type="checkbox" name="sensitive" />Sensitive personal data</label>
          <Submit className="btn secondary">Add item</Submit>
        </form>
      )}
      <p style={{ marginTop: 24 }}><Link href={`/app/clients/${clientId}/ropa`}>Review proposed RoPA entries</Link></p>
    </>
  );
}
