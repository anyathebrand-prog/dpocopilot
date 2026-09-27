import { q } from "@/lib/db";
import { addDocument, retireDocument } from "@/lib/secretary";
import { Flash, Field, Hidden, Chip, PageHead } from "@/components/ui";
import { Submit } from "@/components/client";

export default async function Library({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const docs = await q("select d.*, (select count(*)::int from reg_sections s where s.document_id = d.id) as sections from reg_documents d order by d.status, d.title");
  const open = /^[0-9a-f-]{36}$/.test(sp.doc ?? "") ? await q("select section_ref, heading, body from reg_sections where document_id = $1 order by position", [sp.doc]) : [];
  return (
    <>
      <PageHead title="Regulatory library" sub="Sources for Q&A answers, criteria citations and NDPA mappings." />
      <Flash sp={sp} />
      <table className="register">
        <thead><tr><th>Document</th><th>Type</th><th>Version</th><th>Status</th><th className="num">Sections</th><th></th></tr></thead>
        <tbody>{docs.map((d) => (
          <tr key={d.id}>
            <td><a href={`?doc=${d.id}`}>{d.title}</a></td>
            <td data-label="Type">{d.doc_type}</td>
            <td data-label="Version">{d.version_label}</td>
            <td data-label="Status"><Chip status={d.status === "published" ? "approved" : d.status === "draft" ? "draft" : "archived"} /> {d.retire_pending && <span className="chip progress">Retire on publish</span>}</td>
            <td data-label="Sections" className="num">{d.sections}</td>
            <td>{d.status !== "retired" && <form action={retireDocument}><Hidden values={{ id: d.id }} /><Submit className="btn quiet">{d.status === "draft" ? "Remove draft" : d.retire_pending ? "Keep" : "Retire"}</Submit></form>}</td>
          </tr>
        ))}</tbody>
      </table>
      {open.length > 0 && (
        <section className="panel" style={{ marginTop: 16 }}>
          <h3>Extracted sections</h3>
          {open.map((s, i) => <details key={i}><summary><b>{s.section_ref}</b> {s.heading}</summary><p className="small" style={{ fontFamily: "var(--serif)" }}>{s.body}</p></details>)}
        </section>
      )}
      <form action={addDocument} className="panel" style={{ marginTop: 32, maxWidth: 760 }}>
        <h3>Add a source document</h3>
        <p className="meta">To publish a new version, add it here and retire the old one. Answers already given keep citing the old version.</p>
        <Field label="Title" required><input name="title" required placeholder="Nigeria Data Protection Act 2023" /></Field>
        <Field label="Type"><select name="doc_type"><option value="act">Act</option><option value="regulation">Regulation</option><option value="directive">Directive</option><option value="guidance">Guidance</option><option value="other">Other</option></select></Field>
        <Field label="Version label" required><input name="version_label" required placeholder="Gazette 2023" /></Field>
        <Field label="Source text" help='Paste the official text. Each line starting with "Section", "Article", "Part", "Regulation" or "Schedule" starts a new citable section.' required>
          <textarea name="text" required style={{ minHeight: 280 }} />
        </Field>
        <Submit>Save as draft</Submit>
      </form>
    </>
  );
}
