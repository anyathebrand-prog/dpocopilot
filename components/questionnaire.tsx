import Link from "next/link";
import { SECTIONS, missingRequired, type Answers } from "@/lib/questionnaire";
import { saveSection, completeQuestionnaire } from "@/lib/onboarding";
import { Field, Hidden } from "./ui";
import { Submit } from "./client";

/** One section per view, numbered; save-and-resume (FR3.2). Shared by firm view (F05) and portal (P02). */
export function Questionnaire({ answers, s, base, clientId, readOnly, portal, updatedByFirm = [] }: {
  answers: Answers; s: number; base: string; clientId?: string; readOnly?: boolean; portal?: boolean; updatedByFirm?: string[];
}) {
  const i = Math.max(0, Math.min(SECTIONS.length - 1, s || 0));
  const section = SECTIONS[i];
  const missing = missingRequired(answers);
  const h = <Hidden values={{ client_id: clientId, s: String(i) }} />;
  const val = (k: string) => answers[k];
  return (
    <div className={portal ? "" : "with-rail"} style={portal ? {} : { gridTemplateColumns: "220px 1fr" }}>
      {!portal && (
        <ol className="meta" style={{ paddingLeft: 20, margin: 0 }}>
          {SECTIONS.map((x, n) => <li key={x.key} style={{ padding: "4px 0" }}><Link href={`${base}?s=${n}`} aria-current={n === i ? "step" : undefined} style={{ fontWeight: n === i ? 700 : 400 }}>{x.title}</Link></li>)}
        </ol>
      )}
      <form action={saveSection}>
        {h}
        <p className="meta">Section {i + 1} of {SECTIONS.length}</p>
        <h2 style={{ marginTop: 0 }}>{section.title}</h2>
        <fieldset disabled={readOnly}>
          {section.questions.map((qn) => {
            const v = val(qn.key);
            const byFirm = portal && updatedByFirm.includes(qn.key) ? " (updated by your DPCO)" : "";
            if (qn.type === "multi") return (
              <fieldset key={qn.key}>
                <legend>{qn.label}{qn.required && " (required)"}{byFirm}</legend>
                {qn.help && <p className="meta">{qn.help}</p>}
                {qn.options!.map((o) => <label key={o.value} className="check"><input type="checkbox" name={qn.key} value={o.value} defaultChecked={Array.isArray(v) && v.includes(o.value)} />{o.label}</label>)}
              </fieldset>
            );
            if (qn.type === "yesno") return (
              <fieldset key={qn.key}>
                <legend>{qn.label}{qn.required && " (required)"}{byFirm}</legend>
                {qn.help && <p className="meta">{qn.help}</p>}
                {["yes", "no"].map((o) => <label key={o} className="check"><input type="radio" name={qn.key} value={o} defaultChecked={v === o} />{o === "yes" ? "Yes" : "No"}</label>)}
              </fieldset>
            );
            return (
              <Field key={qn.key} label={qn.label + byFirm} help={qn.help} required={qn.required}>
                {qn.type === "select" ? (
                  <select name={qn.key} defaultValue={(v as string) ?? ""}><option value="">Choose…</option>{qn.options!.map((o) => <option key={o.value}>{o.value}</option>)}</select>
                ) : qn.type === "textarea" || qn.type === "list" ? (
                  <textarea name={qn.key} defaultValue={Array.isArray(v) ? v.join("\n") : (v as string) ?? ""} />
                ) : (
                  <input name={qn.key} type={qn.type === "number" ? "number" : "text"} inputMode={qn.type === "number" ? "numeric" : undefined} min={qn.type === "number" ? 0 : undefined} defaultValue={(v as string) ?? ""} />
                )}
              </Field>
            );
          })}
          <div className={portal ? "sticky-bar" : "row"}>
            <div className="row">
              <Submit>{i < SECTIONS.length - 1 ? "Save and continue" : "Save"}</Submit>
              {portal && <Submit className="btn secondary" name="go" value="exit">Save and exit</Submit>}
            </div>
          </div>
        </fieldset>
      </form>
      {!readOnly && i === SECTIONS.length - 1 && (
        <form action={completeQuestionnaire} className="panel" style={{ gridColumn: portal ? undefined : "2", marginTop: 24 }}>
          {h}
          <h3>{portal ? "Send your answers" : "Mark complete"}</h3>
          {missing.length ? (
            <>
              <p className="why">These required questions still need an answer:</p>
              <ul>{missing.map((m) => <li key={m.key}><Link href={`${base}?s=${SECTIONS.findIndex((x) => x.questions.includes(m))}`}>{m.label}</Link></li>)}</ul>
              <Submit disabled>{portal ? "Submit answers" : "Mark complete"}</Submit>
            </>
          ) : (
            <>
              <p>{portal ? "Your DPCO will review your answers." : "This builds the data inventory, proposes RoPA entries and checks major-importance status."}</p>
              <Submit>{portal ? "Submit answers" : "Mark complete"}</Submit>
            </>
          )}
        </form>
      )}
    </div>
  );
}
