import { SECTIONS, LISTS } from "@/lib/incidents";
import { Field, Hidden } from "@/components/ui";
import { Submit } from "@/components/client";
import { saveIncident } from "./actions";

/** Every register column as a form field, grouped as in the workbook. */
export function IncidentForm({ id, data = {}, depts }: { id?: string; data?: Record<string, string>; depts: string[] }) {
  return (
    <form action={saveIncident}>
      {id && <Hidden values={{ id }} />}
      {SECTIONS.map(([title, fields]) => (
        <section key={title} className="panel" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>{title}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0 16px" }}>
            {fields.map((f) => (
              <div key={f.key} style={f.kind === "textarea" ? { gridColumn: "1 / -1" } : undefined}>
                <Field label={f.label} required={f.required}>
                  {f.list ? <select name={f.key} defaultValue={data[f.key] ?? ""} required={f.required}><option value="">–</option>{LISTS[f.list].map((o) => <option key={o}>{o}</option>)}</select>
                    : f.kind === "dept" ? <select name={f.key} defaultValue={data[f.key] ?? ""}><option value="">–</option>{depts.map((o) => <option key={o}>{o}</option>)}</select>
                    : f.kind === "textarea" ? <textarea name={f.key} rows={2} defaultValue={data[f.key] ?? ""} />
                    : <input name={f.key} type={f.kind ?? "text"} min={f.kind === "number" ? 0 : undefined} defaultValue={data[f.key] ?? ""} required={f.required} />}
                </Field>
              </div>
            ))}
          </div>
        </section>
      ))}
      <p className="caption">The NDPC deadline (Date Discovered + 72 hours), days to notify and notification status are calculated automatically. Avoid recording personal data of the affected people here.</p>
      <Submit>{id ? "Save incident" : "Log incident"}</Submit>
    </form>
  );
}
