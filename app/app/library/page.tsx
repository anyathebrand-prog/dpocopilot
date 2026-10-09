import Link from "next/link";
import { requireFirm } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { PageHead, Empty } from "@/components/ui";

const TYPE: Record<string, string> = { act: "Act", regulation: "Regulation", directive: "Directive", guidance: "Guidance", other: "Other" };

/** Read-only view of the published regulatory library (maintained by the Secretary), with PDF/Word downloads. */
export default async function FirmLibrary({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireFirm();
  const sp = await searchParams;
  const docs = await q("select d.*, (select count(*)::int from reg_sections s where s.document_id = d.id) as sections from reg_documents d where d.status = 'published' order by d.doc_type, d.title");
  const doc = /^[0-9a-f-]{36}$/.test(sp.doc ?? "") ? await one("select * from reg_documents where id = $1 and status = 'published'", [sp.doc]) : null;
  const sections = doc ? await q("select section_ref, heading, body from reg_sections where document_id = $1 order by position", [doc.id]) : [];
  const exp = (id: string, f: string) => `/export?kind=library&id=${id}&format=${f}`;
  return (
    <>
      <PageHead title="Regulatory library" sub="The NDPA, NDPC directives and guidance that Ask answers from. Maintained and published by DPO Copilot." />
      {docs.length === 0 ? <Empty><p>No documents published yet.</p></Empty> : (
        <table className="register">
          <thead><tr><th>Document</th><th>Type</th><th>Version</th><th className="num">Sections</th><th></th></tr></thead>
          <tbody>{docs.map((d) => (
            <tr key={d.id}>
              <td><Link href={`/app/library?doc=${d.id}`}>{d.title}</Link></td>
              <td data-label="Type">{TYPE[d.doc_type] ?? d.doc_type}</td>
              <td data-label="Version" className="small">{d.version_label}</td>
              <td data-label="Sections" className="num">{d.sections}</td>
              <td className="row" style={{ gap: 6 }}><a className="btn secondary" href={exp(d.id, "pdf")} target="_blank">PDF</a><a className="btn secondary" href={exp(d.id, "doc")}>Word</a></td>
            </tr>
          ))}</tbody>
        </table>
      )}
      {doc && (
        <section className="panel" style={{ marginTop: 16 }}>
          <div className="spread"><h2 style={{ margin: 0 }}>{doc.title} <span className="meta" style={{ fontSize: "0.6em" }}>{doc.version_label}</span></h2>
            <div className="row"><a className="btn" href={exp(doc.id, "pdf")} target="_blank">Download PDF</a><a className="btn secondary" href={exp(doc.id, "doc")}>Word</a></div></div>
          {sections.map((s, i) => <details key={i}><summary><b>{s.section_ref}</b> {s.heading}</summary><p className="small" style={{ fontFamily: "var(--serif)", whiteSpace: "pre-wrap" }}>{s.body}</p></details>)}
        </section>
      )}
      <p className="caption" style={{ marginTop: 16 }}>Guidance, not legal advice. Check the official gazetted text before relying on any provision.</p>
    </>
  );
}
