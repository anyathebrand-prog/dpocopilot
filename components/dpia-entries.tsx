"use client";
import { useState } from "react";

type Row = { title: string; system: string; dept: string; key?: number };
let seq = 0;

/** DPIA entries on the Start DPIA form: one DPIA per system or process, with "+ Add entry" for more. */
export function DpiaEntries({ initial, departments, docs, accept }: { initial: Row; departments: string[]; docs: string[]; accept: string }) {
  const [rows, setRows] = useState<Row[]>([{ ...initial, key: seq++ }]);
  const set = (i: number, k: keyof Row, v: string) => setRows((r) => r.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  return (
    <div>
      <datalist id="dpia-depts">{departments.map((d) => <option key={d} value={d} />)}</datalist>
      {rows.map((r, i) => (
        <fieldset key={r.key} className="panel" style={{ marginBottom: 12 }}>
          <legend style={{ fontWeight: 600 }}>Entry {i + 1}{rows.length > 1 && <button type="button" className="btn quiet" style={{ marginLeft: 8 }} aria-label={`Remove entry ${i + 1}`} onClick={() => setRows((x) => x.filter((_, j) => j !== i))}>Remove</button>}</legend>
          <label className="field"><span>Title<span className="req" aria-hidden="true"> *</span></span>
            <input name="title" value={r.title} onChange={(e) => set(i, "title", e.target.value)} required={i === 0} placeholder="e.g. DPIA for the customer helpdesk" /></label>
          <div className="row">
            <label className="field" style={{ flex: 1 }}><span>System name</span><span className="help">The system being assessed.</span>
              <input name="system" value={r.system} onChange={(e) => set(i, "system", e.target.value)} placeholder="Input system name, e.g. Zendesk, Oracle EBS, CCTV" /></label>
            <label className="field" style={{ flex: 1 }}><span>Department</span><span className="help">Its RoPA activities are linked automatically.</span>
              <input name="dept" list="dpia-depts" value={r.dept} onChange={(e) => set(i, "dept", e.target.value)} placeholder="Pick or type" /></label>
          </div>
          <label className="field"><span>Upload documents</span>
            <span className="help">Upload these documents: {docs.join("; ")}. PDF, Word, Excel or images; you can add more later.</span>
            <input type="file" name={`docs${i}`} multiple accept={accept} /></label>
        </fieldset>
      ))}
      <button type="button" className="btn secondary" style={{ marginTop: 8 }} onClick={() => setRows((x) => [...x, { title: "", system: "", dept: "", key: seq++ }])}>+ Add entry</button>
      <p className="meta">Each entry becomes its own DPIA, one per system.</p>
    </div>
  );
}
