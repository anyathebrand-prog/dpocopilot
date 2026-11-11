import Link from "next/link";
import { redirect } from "next/navigation";
import { requireContact } from "@/lib/auth";
import { one } from "@/lib/db";
import { LAWFUL_BASIS } from "@/lib/templates";
import { answersOf } from "@/lib/data";
import { list } from "@/lib/questionnaire";
import { ROPA_TEXT, departmentOptions } from "@/lib/ropa-fields";
import { q } from "@/lib/db";
import { DeptInput } from "@/components/ropa-dept";
import { Flash, Field, Hidden } from "@/components/ui";
import { Submit } from "@/components/client";
import { saveClientRopa } from "../actions";

/** Client edits one processing activity in its RoPA, or adds a new one. */
export default async function PortalRopaEntry({ params, searchParams }: { params: Promise<{ entryId: string }>; searchParams: Promise<Record<string, string>> }) {
  const u = await requireContact();
  const { entryId } = await params;
  const sp = await searchParams;
  const isNew = entryId === "new";
  const e = isNew ? null : await one("select * from ropa_entries where id = $1 and client_id = $2 and state <> 'archived'", [/^[0-9a-f-]{36}$/.test(entryId) ? entryId : null, u.client_id]);
  if (!isNew && !e) redirect("/portal/ropa");
  const used = (await q<{ department: string }>("select distinct department from ropa_entries where client_id = $1 and department is not null", [u.client_id])).map((r) => r.department);
  const depts = departmentOptions(list((await answersOf(u.client_id!)).org_departments), used);
  const preDept = isNew && typeof sp.dept === "string" ? sp.dept.slice(0, 120) : null;
  return (
    <>
      <p><Link href="/portal/ropa">Back to data inventory</Link></p>
      <h1 style={{ fontSize: 24 }}>{isNew ? "Add a processing activity" : e!.purpose}</h1>
      <Flash sp={sp} />
      <p className="meta">{isNew ? "It is added" : "Changes save"} straight to your record and {u.firm_name} is told.</p>
      <form action={saveClientRopa} className="panel" style={{ maxWidth: 760 }}>
        <Hidden values={{ id: e?.id }} />
        <Field label="Purpose" required help="What the data is used for, e.g. Payroll."><input name="purpose" defaultValue={e?.purpose ?? ""} required /></Field>
        <Field label="Department" help="Pick one or type any department, e.g. Support."><DeptInput options={depts} value={e?.department ?? preDept} /></Field>
        <Field label="Lawful basis" help="Why you are allowed to process it. Ask your DPCO if unsure.">
          <select name="lawful_basis" defaultValue={e?.lawful_basis ?? ""}><option value="">Not sure</option>{Object.entries(LAWFUL_BASIS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        </Field>
        {ROPA_TEXT.map(([k, l, help]) => <Field key={k} label={l} help={help}>{k === "security_measures" ? <textarea name={k} defaultValue={e?.[k] ?? ""} /> : <input name={k} defaultValue={e?.[k] ?? ""} />}</Field>)}
        <label className="check"><input type="checkbox" name="involves_sensitive" defaultChecked={e?.involves_sensitive} />Includes sensitive data (health, religion, biometrics, etc.)</label>
        <label className="check"><input type="checkbox" name="has_transfer" defaultChecked={e?.has_transfer} />Data is sent outside the country</label>
        <Field label="Transfer safeguard" help="If sent abroad: how it is protected (e.g. contract clauses)."><textarea name="transfer_safeguard" defaultValue={e?.transfer_safeguard ?? ""} /></Field>
        <div className="row"><Submit>{isNew ? "Add activity" : "Save changes"}</Submit><Link className="btn secondary" href="/portal/ropa">Cancel</Link></div>
      </form>
    </>
  );
}
