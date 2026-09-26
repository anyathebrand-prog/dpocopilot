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
      <PageHead title="CAR checklist template" sub="New items are added to every client's checklist as Missing, marked New item. Retiring an item leaves existing client checklists unchanged." />
      <Flash sp={sp} />
      {Object.entries(CAR_CATEGORIES).map(([k, l]) => (
        <section key={k}>
          <h3>{l}</h3>
          {items.filter((i) => i.category_key === k).map((i) => (
            <form key={i.id} action={retireCarItem} className="rule-row">
              <Hidden values={{ id: i.id }} />
              <span>{i.text} {i.auto_link_rule && <span className="meta">(auto-links platform records)</span>}</span>
              <span className="row"><Chip status={i.status === "published" ? "approved" : "draft"} />{i.retire_pending && <span className="chip progress">Retire on publish</span>}
                <Submit className="btn quiet">{i.status === "draft" ? "Remove draft" : i.retire_pending ? "Keep" : "Retire"}</Submit></span>
            </form>
          ))}
        </section>
      ))}
      <form action={addCarItem} className="panel" style={{ marginTop: 32, maxWidth: 640 }}>
        <h3>Add an item</h3>
        <Field label="Category"><select name="category_key">{Object.entries(CAR_CATEGORIES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
        <Field label="Item" required><input name="text" required /></Field>
        <Submit>Save as draft</Submit>
      </form>
    </>
  );
}
