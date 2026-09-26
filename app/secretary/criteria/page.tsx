import { q } from "@/lib/db";
import { addCriterion, retireCriterion } from "@/lib/secretary";
import { ALL_QUESTIONS } from "@/lib/questionnaire";
import { Flash, Field, Hidden, Chip, PageHead } from "@/components/ui";
import { Submit } from "@/components/client";

const OPS: Record<string, string> = { gte: "Answer is at least", yes: "Answer is Yes", includes: "Answer includes" };

export default async function Criteria({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const rows = await q("select * from mi_criteria where status <> 'retired' order by position");
  const questions = ALL_QUESTIONS.filter((x) => ["number", "yesno", "multi", "select"].includes(x.type));
  return (
    <>
      <PageHead title="Major-importance criteria" sub="A client is flagged as likely of major importance when any published criterion is met. Lead Consultants make the final call." />
      <Flash sp={sp} />
      <table className="register">
        <thead><tr><th>Criterion</th><th>Rule</th><th>Source</th><th>Status</th><th></th></tr></thead>
        <tbody>{rows.map((c) => (
          <tr key={c.id}>
            <td>{c.description}</td>
            <td data-label="Rule" className="small">{ALL_QUESTIONS.find((x) => x.key === c.question_key)?.label ?? c.question_key}: {OPS[c.op]} {c.value}</td>
            <td data-label="Source" className="small">{c.source_ref}</td>
            <td data-label="Status"><Chip status={c.status === "published" ? "approved" : "draft"} />{c.retire_pending && <span className="chip progress">Retire on publish</span>}</td>
            <td><form action={retireCriterion}><Hidden values={{ id: c.id }} /><Submit className="btn quiet">{c.status === "draft" ? "Remove draft" : c.retire_pending ? "Keep" : "Retire"}</Submit></form></td>
          </tr>
        ))}</tbody>
      </table>
      <form action={addCriterion} className="panel" style={{ marginTop: 32, maxWidth: 640 }}>
        <h3>Add a criterion</h3>
        <Field label="Description" required><input name="description" required /></Field>
        <Field label="Questionnaire answer it checks"><select name="question_key">{questions.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}</select></Field>
        <Field label="Rule"><select name="op">{Object.entries(OPS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
        <Field label="Value" help="A number for 'at least', or an option for 'includes'. Leave empty for Yes."><input name="value" /></Field>
        <Field label="Source (required)" help="Cite the library document and section, e.g. NDPC GAID 2025, Art. 8."><input name="source_ref" required /></Field>
        <Submit>Save as draft</Submit>
      </form>
    </>
  );
}
