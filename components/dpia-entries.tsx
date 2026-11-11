"use client";
import { useState } from "react";

type Row = { title: string; dept: string };

/** DPIA entries on the Start DPIA form: one DPIA per system or process, with "+ Add entry" for more. */
export function DpiaEntries({ initial, departments }: { initial: Row; departments: string[] }) {
  const [rows, setRows] = useState<Row[]>([initial]);
  const set = (i: number, k: keyof Row, v: string) => setRows((r) => r.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  return (
    <div>
      <datalist id="dpia-depts">{departments.map((d) => <option key={d} value={d} />)}</datalist>
      <table className="register">
        <thead><tr><th style={{ width: 36 }}>#</th><th>System or process assessed<span className="req" aria-hidden="true"> *</span></th><th>Department</th><th style={{ width: 40 }}></th></tr></thead>
        <tbody>{rows.map((r, i) => (
          <tr key={i}>
            <td className="num">{i + 1}</td>
            <td data-label="System or process"><input name="title" value={r.title} onChange={(e) => set(i, "title", e.target.value)} required={i === 0} placeholder="e.g. Customer CRM, CCTV, Payroll system" aria-label={`Entry ${i + 1} title`} /></td>
            <td data-label="Department"><input name="dept" list="dpia-depts" value={r.dept} onChange={(e) => set(i, "dept", e.target.value)} placeholder="Pick or type" aria-label={`Entry ${i + 1} department`} /></td>
            <td>{rows.length > 1 && <button type="button" className="btn quiet" aria-label={`Remove entry ${i + 1}`} onClick={() => setRows((x) => x.filter((_, j) => j !== i))}>×</button>}</td>
          </tr>
        ))}</tbody>
      </table>
      <button type="button" className="btn secondary" style={{ marginTop: 8 }} onClick={() => setRows((x) => [...x, { title: "", dept: "" }])}>+ Add entry</button>
      <p className="meta">Each entry becomes its own DPIA. Its department&apos;s RoPA activities are linked automatically.</p>
    </div>
  );
}
