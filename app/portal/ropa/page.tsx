import Link from "next/link";
import { requireContact } from "@/lib/auth";
import { q } from "@/lib/db";
import { LAWFUL_BASIS } from "@/lib/templates";
import { Empty, Flash } from "@/components/ui";
import { answersOf } from "@/lib/data";
import { list } from "@/lib/questionnaire";
import { departmentOptions } from "@/lib/ropa-fields";
import { DeptBar } from "@/components/ropa-dept";

/** The client's record of processing: it can edit entries and add new ones (new ones wait for the DPCO's review). */
export default async function PortalRopa({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const u = await requireContact();
  const sp = await searchParams;
  const dept = (sp.dept ?? "").trim().slice(0, 120);
  const rows = await q("select * from ropa_entries where client_id = $1 and state in ('active','proposed')" + (dept ? " and lower(department) = lower($2)" : "") + " order by department nulls last, purpose", dept ? [u.client_id, dept] : [u.client_id]);
  const used = (await q<{ department: string }>("select distinct department from ropa_entries where client_id = $1 and department is not null and state <> 'archived' order by 1", [u.client_id])).map((r) => r.department);
  const options = departmentOptions(used, list((await answersOf(u.client_id!)).org_departments));
  return (
    <>
      <p><Link href="/portal">Back to home</Link></p>
      <h1 style={{ fontSize: 24 }}>Your data inventory</h1>
      <p className="meta">What personal data your organisation processes, why, and how it is protected. This is your record of processing activities (RoPA), kept by {u.firm_name}. Keep it up to date: open an activity to change it, or add one. {u.firm_name} is told about every change.</p>
      <Flash sp={sp} />
      <DeptBar base="/portal/ropa" options={options} dept={dept} exportBase={`/export?kind=ropa&client=${u.client_id}`} addHref="/portal/ropa/new" />
      {rows.length === 0 ? <Empty><p>{dept ? <>Nothing recorded for {dept} yet. Use &quot;Add entry for {dept}&quot; above.</> : <>Nothing recorded yet. Add your first processing activity above, or wait for {u.firm_name} to set it up.</>}</p></Empty> : (
        <table className="register">
          <thead><tr><th>Purpose</th><th>Department</th><th>Lawful basis</th><th>Whose data</th><th>What data</th><th>Shared with</th><th>Sent outside Nigeria</th><th>Kept for</th><th></th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id}>
              <td><b>{r.purpose}</b>{r.involves_sensitive && <div className="meta">Includes sensitive data</div>}</td>
              <td data-label="Department">{r.department ?? "—"}</td>
              <td data-label="Lawful basis">{r.lawful_basis ? LAWFUL_BASIS[r.lawful_basis] : "—"}</td>
              <td data-label="Whose data" className="small">{r.data_subjects ?? "—"}</td>
              <td data-label="What data" className="small">{r.data_categories ?? "—"}</td>
              <td data-label="Shared with" className="small">{r.recipients ?? "—"}</td>
              <td data-label="Sent outside Nigeria">{r.has_transfer ? (r.transfer_safeguard ? `Yes. Safeguard: ${r.transfer_safeguard}` : "Yes") : "No"}</td>
              <td data-label="Kept for">{r.retention_period ?? "—"}</td>
              <td><Link className="btn secondary" href={`/portal/ropa/${r.id}`}>Edit</Link></td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </>
  );
}
