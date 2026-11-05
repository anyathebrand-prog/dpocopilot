import { requireFirm } from "@/lib/auth";
import { auditFilings } from "@/lib/ndpc";
import { findFilings } from "@/lib/ndpc-match";
import { PageHead, Field, Banner } from "@/components/ui";

/** Check a prospect against NDPC's public list of organisations that filed a compliance audit, for recent audit years. */
export default async function Verify({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireFirm();
  const sp = await searchParams;
  const query = (sp.q ?? "").trim().slice(0, 120);
  const last = new Date().getFullYear() - 1, years = [last, last - 1, last - 2];
  let results: { year: number; matches: ReturnType<typeof findFilings>; total: number }[] = [], error = "";
  if (query.length >= 3) {
    try { results = await Promise.all(years.map(async (year) => { const list = await auditFilings(year); return { year, matches: findFilings(list, query), total: list.length }; })); }
    catch (e) { console.error("[ndpc]", e); error = "Couldn't reach the NDPC website just now. Try again in a few minutes."; }
  }
  const prev = results.find((r) => r.year === last);
  return (
    <>
      <PageHead title="NDPC compliance check" sub="See whether a company filed its NDPA compliance audit with the NDPC, using the NDPC's public list of audited organisations." />
      <form className="panel row" style={{ maxWidth: 720, alignItems: "flex-end" }}>
        <Field label="Company name" required><input name="q" defaultValue={query} minLength={3} required placeholder="e.g. Interswitch" style={{ width: 360 }} /></Field>
        <button className="btn">Check</button>
      </form>
      {query && query.length < 3 && <p className="meta">Enter at least 3 letters.</p>}
      {error && <Banner kind="error">{error}</Banner>}
      {prev && (
        prev.matches.length
          ? <Banner kind="ok"><b>Filed for {last}.</b> {prev.matches[0].exact ? "An exact match" : "A likely match"} appears in the NDPC&apos;s {last} audit list. Check the name below is the right company.</Banner>
          : <Banner kind="warn"><b>Not found for {last}.</b> No organisation matching &ldquo;{query}&rdquo; is in the NDPC&apos;s {last} audit list ({prev.total.toLocaleString()} organisations). It may have filed under another name, so try its registered name; otherwise it may not have filed — a prospect.</Banner>
      )}
      {results.map((r) => (
        <section key={r.year} style={{ marginTop: 16 }}>
          <h2 style={{ fontSize: 18 }}>{r.year} audit filings <span className="meta" style={{ fontSize: 14 }}>{r.matches.length ? `${r.matches.length} match${r.matches.length === 1 ? "" : "es"}` : "no match"} · {r.total.toLocaleString()} organisations listed</span></h2>
          {r.matches.length > 0 && (
            <table className="register">
              <thead><tr><th>Organisation (as listed by NDPC)</th><th>NDPC reference</th><th>Match</th></tr></thead>
              <tbody>{r.matches.map((m) => <tr key={m.ref + m.name}><td>{m.name}</td><td data-label="NDPC reference" className="small">{m.ref}</td><td data-label="Match" className="small">{m.exact ? "Exact" : "Similar name"}</td></tr>)}</tbody>
            </table>
          )}
        </section>
      ))}
      <p className="caption" style={{ marginTop: 24 }}>Source: <a href="https://services.ndpc.gov.ng/repo/?flp=audit" target="_blank" rel="noreferrer">NDPC audit filings repository</a>. The list shows organisations that filed a compliance audit return; it is not a certificate of compliance. Refreshed from NDPC every 12 hours.</p>
    </>
  );
}
