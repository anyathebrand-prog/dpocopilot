import { q } from "@/lib/db";
import { addCarItem, retireCarItem } from "@/lib/secretary";
import { CAR_CATEGORIES } from "@/lib/rules";
import { Flash, Field, Hidden, Chip, PageHead } from "@/components/ui";
import { Submit } from "@/components/client";

export default async function CarTemplate({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const items = await q("select * from car_template_items where status <> 'retired' order by category_key, position");
  return (
    <>
      <PageHead title="CAR checklist template" sub="The NDP Audit Questionnaire (GAID Schedule 2). New items are added to every client's active-year checklist as Missing, marked New item. Retiring an item leaves existing client checklists unchanged." />
      <Flash sp={sp} />
      {Object.entries(CAR_CATEGORIES).map(([k, l]) => (
        <section key={k}>
          <h3>{l}</h3>
          {items.filter((i) => i.category_key === k).map((i, n, list) => (
            <div key={i.id}>
            {i.section && i.section !== list[n - 1]?.section && <h4 style={{ margin: "12px 0 6px" }}>{i.section}</h4>}
            <form action={retireCarItem} className="rule-row">
              <Hidden values={{ id: i.id }} />
              <span>{i.text} {i.priority && <span className="meta">· {i.priority} priority</span>} {i.auto_link_rule && <span className="meta">(auto-links platform records)</span>}</span>
              <span className="row"><Chip status={i.status === "published" ? "approved" : "draft"} />{i.retire_pending && <span className="chip progress">Retire on publish</span>}
                <Submit className="btn quiet">{i.status === "draft" ? "Remove draft" : i.retire_pending ? "Keep" : "Retire"}</Submit></span>
            </form>
            </div>
          ))}
        </section>
      ))}
      <form action={addCarItem} className="panel" style={{ marginTop: 32, maxWidth: 640 }}>
        <h3>Add an item</h3>
        <Field label="Part"><select name="category_key">{Object.entries(CAR_CATEGORIES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
        <Field label="Sub-section" help="Optional, e.g. Legitimate interest assessment."><input name="section" /></Field>
        <Field label="Question" required><input name="text" required /></Field>
        <Field label="Priority / impact"><select name="priority" defaultValue="high"><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></Field>
        <Submit>Save as draft</Submit>
      </form>
    </>
  );
}
