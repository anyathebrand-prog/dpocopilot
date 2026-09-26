import { requireFirm } from "@/lib/auth";
import { ask, type Passage } from "@/lib/ai";
import { PageHead, Banner } from "@/components/ui";
import { Submit } from "@/components/client";

const Notice = () => <p className="caption" style={{ marginTop: 8 }}>Guidance, not legal advice. Check the cited sources before relying on an answer.</p>;

export default async function Ask({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const u = await requireFirm();
  const question = ((await searchParams).q ?? "").trim().slice(0, 500);
  let result: { text: string | null; passages: Passage[] } | null = null, error: string | null = null;
  if (question) { try { result = await ask(u, question); } catch (e) { error = (e as Error).message; } }
  return (
    <>
      <PageHead title="Ask" sub="Questions about the NDPA 2023 and NDPC guidance, answered from the regulatory library." />
      <form style={{ maxWidth: 760 }}>
        <label className="field" style={{ maxWidth: "none" }}>
          <span>Your question</span>
          <textarea name="q" defaultValue={question} required style={{ minHeight: 72 }} placeholder="For example: How long do we have to notify the NDPC after a breach?" />
        </label>
        <Submit>Ask</Submit>
      </form>
      {error && <Banner kind="error">{error}</Banner>}
      {result && (
        <section style={{ marginTop: 32, maxWidth: 760 }} aria-live="polite">
          {result.passages.length === 0 ? (
            <><Banner kind="warn">The library doesn&apos;t cover this question. Try different words, or check the source documents directly.</Banner><Notice /></>
          ) : (
            <>
              {result.text ? (
                <article className="sheet"><h2 style={{ marginTop: 0 }}>Answer</h2>{result.text.split("\n").filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}</article>
              ) : (
                <p className="meta">These passages from the library match your question. (No AI model is connected, so passages are shown without a written answer.)</p>
              )}
              <Notice />
              <h3>Sources</h3>
              <ol style={{ paddingLeft: 20 }}>
                {result.passages.map((p) => (
                  <li key={p.id} style={{ marginBottom: 16 }}>
                    <b>{p.title}, {p.section_ref}{p.heading && `: ${p.heading}`}</b> <span className="meta">(version {p.version_label})</span>
                    <p className="small" style={{ fontFamily: "var(--serif)", fontSize: 16, lineHeight: "26px", marginTop: 4 }}>{p.body}</p>
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>
      )}
    </>
  );
}
