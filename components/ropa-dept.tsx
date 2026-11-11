import Link from "next/link";

/** Department for a RoPA entry: pick from the list or type any department. */
export function DeptInput({ options, value }: { options: string[]; value?: string | null }) {
  return (
    <>
      <input name="department" list="ropa-depts" defaultValue={value ?? ""} placeholder="Pick or type a department, e.g. Support" maxLength={120} />
      <datalist id="ropa-depts">{options.map((d) => <option key={d} value={d} />)}</datalist>
    </>
  );
}

/** Department picker on a RoPA list: filter the list, generate that department's RoPA, or add an entry for it. */
export function DeptBar({ base, options, dept, exportBase, addHref, extra }: { base: string; options: string[]; dept: string; exportBase: string; addHref?: string; extra?: Record<string, string> }) {
  const d = dept ? `&dept=${encodeURIComponent(dept)}` : "";
  return (
    <div className="panel" style={{ margin: "8px 0 16px" }}>
      <form method="get" action={base} className="row" style={{ alignItems: "flex-end", gap: 8 }}>
        {Object.entries(extra ?? {}).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
        <label className="field" style={{ margin: 0 }}><span>Department</span>
          <input name="dept" list="ropa-dept-filter" defaultValue={dept} placeholder="All departments" style={{ minWidth: 220 }} />
          <datalist id="ropa-dept-filter">{options.map((o) => <option key={o} value={o} />)}</datalist>
        </label>
        <button className="btn secondary">Show</button>
        {dept && <Link href={base + (extra && Object.keys(extra).length ? `?${new URLSearchParams(extra)}` : "")}>All departments</Link>}
      </form>
      <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <span className="meta">{dept ? <>RoPA for <b>{dept}</b>:</> : "Whole RoPA:"}</span>
        <a className="btn secondary" href={`${exportBase}&format=pdf${d}`} target="_blank">PDF</a>
        <a className="btn secondary" href={`${exportBase}&format=doc${d}`}>Word</a>
        <a className="btn secondary" href={`${exportBase}&format=xlsx${d}`}>Excel</a>
        {addHref && <Link className="btn" href={addHref + (dept ? `?dept=${encodeURIComponent(dept)}` : "")}>{dept ? `Add entry for ${dept}` : "Add entry"}</Link>}
      </div>
    </div>
  );
}
