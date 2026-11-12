import Link from "next/link";
import { requireClient, clientBase } from "@/lib/auth";
import { q } from "@/lib/db";
import { todayWAT, fmtDate } from "@/lib/rules";
import { list } from "@/lib/questionnaire";
import { answersOf } from "@/lib/data";
import { RATINGS, RATING_COLOR, assess, carDisclosure, mechanismLabel } from "@/lib/tia-model";
import { createTia } from "@/lib/tia-actions";
import { Flash, Field, Hidden, Chip, Empty } from "@/components/ui";
import { Submit } from "@/components/client";
import { RatingBadge } from "@/components/tpra-form";

/** Cross-Border Data Transfer Register: every transfer of personal data outside Nigeria, its mechanism and risk, and the CAR disclosure. */
export default async function TiaRegister({ clientId, sp }: { clientId: string; sp: Record<string, string> }) {
  const { client } = await requireClient(clientId, { portal: true });
  const B = await clientBase(clientId);
  const today = todayWAT();
  const rows = (await q(`select a.id, a.title, a.status, a.answers, to_char(a.next_review, 'YYYY-MM-DD') as next_review, a.client_signed_at, a.assessment_year,
      (select count(*)::int from tpra_tasks t where t.assessment_id = a.id and t.status <> 'done') as open_tasks
    from assessments a where a.client_id = $1 and a.kind = 'tia' order by a.updated_at desc`, [clientId]) ).map((x) => Object.assign(x, { r: assess(x.answers) }));
  const ropa = await q("select id, purpose, department, has_transfer from ropa_entries where client_id = $1 and state = 'active' order by has_transfer desc, purpose", [clientId]);
  const countries = list((await answersOf(clientId)).transfer_countries);
  const st = (x: any) => (x.client_signed_at ? "signed" : x.status);
  const due = (x: any) => !!x.next_review && x.next_review <= today;
  const shown = rows.filter((x) => (!sp.rating || x.r.rating === sp.rating) && (!sp.status || (sp.status === "due" ? due(x) : st(x) === sp.status)));
  const b = `${B}/assessments/tia`;
  const link = (k: string, v: string) => { const p = new URLSearchParams({ ...(sp.rating ? { rating: sp.rating } : {}), ...(sp.status ? { status: sp.status } : {}) }); if (v) p.set(k, v); else p.delete(k); const s = p.toString(); return s ? `${b}?${s}` : b; };
  const car = carDisclosure(rows.map((x) => ({ answers: x.answers, status: x.status })));
  const unassessed = ropa.filter((r) => r.has_transfer).length;
  return (
    <>
      <div className="spread"><h2 style={{ marginTop: 0 }}>Cross-border transfer register</h2>
        <div className="row">
          <a className="btn secondary" href={`/export?kind=tia-request&client=${clientId}&format=pdf`} target="_blank" rel="noreferrer">Generate Transfer Readiness Document</a>
          <a className="btn secondary" href={`/export?kind=tia-register&client=${clientId}&format=xlsx`}>Export register (Excel)</a>
        </div></div>
      <p className="meta">Cross-Border Data Transfer Risk Assessments under NDPA Part VIII (ss.41–43), GAID Art. 45 and Schedule 5. Each transfer is tested on the destination and the recipient, rated on eight risk categories before and after mitigation, and approved by the client&apos;s management.</p>
      <Flash sp={sp} />
      <div className="tpra-stats">
        {RATINGS.map((k) => <Link key={k} href={link("rating", sp.rating === k ? "" : k)} className={`tpra-stat${sp.rating === k ? " on" : ""}`} style={{ borderTop: `5px solid ${RATING_COLOR[k]}` }}><span>{k}</span><b className="num">{rows.filter((x) => x.r.rating === k).length}</b></Link>)}
        <Link href={link("status", sp.status === "due" ? "" : "due")} className={`tpra-stat${sp.status === "due" ? " on" : ""}`}><span>Review due</span><b className="num">{rows.filter(due).length}</b></Link>
      </div>

      <section className="panel" style={{ marginBottom: 16 }}>
        <div className="spread"><b>CAR disclosure (GAID Schedule 2)</b><span className="meta">From the transfers below</span></div>
        <dl className="kv tia-car">
          <dt>Transfers personal data outside Nigeria</dt><dd>{car.transfers ? "Yes" : countries.length ? "Yes (from onboarding; not yet assessed)" : "None recorded"}</dd>
          <dt>Categories transferred</dt><dd>{car.categories.length ? `${car.categories.slice(0, 8).join(", ")}${car.categories.length > 8 ? "…" : ""}` : "–"}{car.transfers ? ` · ${car.sensitive ? "includes sensitive personal data" : "non-sensitive"}` : ""}</dd>
          <dt>Legal grounds</dt><dd>{car.grounds.join("; ") || "–"}</dd>
          <dt>Documented and assessed</dt><dd>{car.n ? `${car.documented} of ${car.n} transfers approved` : "–"}</dd>
          <dt>Receiving countries</dt><dd>{(car.countries.length ? car.countries : countries).join(", ") || "–"}</dd>
        </dl>
      </section>

      <form method="get" className="row" style={{ alignItems: "flex-end", marginBottom: 12 }} aria-label="Filter">
        <label className="small">Rating <select name="rating" defaultValue={sp.rating ?? ""} style={{ display: "block", width: "auto" }}><option value="">All</option>{RATINGS.map((k) => <option key={k}>{k}</option>)}</select></label>
        <label className="small">Status <select name="status" defaultValue={sp.status ?? ""} style={{ display: "block", width: "auto" }}><option value="">All</option><option value="draft">Draft</option><option value="approved">Approved, awaiting client</option><option value="signed">Approved by management</option><option value="due">Review due</option></select></label>
        <button className="btn secondary">Filter</button>{(sp.rating || sp.status) && <Link href={b} className="btn quiet">Clear</Link>}
      </form>
      {shown.length === 0 ? <Empty><p>{rows.length ? "No transfers match the filter." : "No transfers in the register yet."}</p>{!rows.length && unassessed > 0 && <p className="meta">{unassessed} RoPA activit{unassessed === 1 ? "y transfers" : "ies transfer"} data outside Nigeria: add each transfer below.</p>}</Empty> : (
        <table className="register">
          <thead><tr><th>Recipient</th><th>Destination</th><th>Data</th><th>Mechanism</th><th>Inherent</th><th>Residual</th><th>Next review</th><th>Status</th></tr></thead>
          <tbody>{shown.map((x) => (
            <tr key={x.id}>
              <td><Link href={`${b}/${x.id}`}><b>{x.answers.recipient || x.title}</b></Link>{x.open_tasks > 0 && <span className="meta" style={{ display: "block" }}>{x.open_tasks} open measure{x.open_tasks > 1 ? "s" : ""}</span>}</td>
              <td data-label="Destination" className="small">{x.answers.destination || "—"}</td>
              <td data-label="Data" className="small">{x.answers.data || "—"}{/^yes/i.test(x.answers.sensitive ?? "") && <span className="meta" style={{ display: "block" }}>Sensitive</span>}</td>
              <td data-label="Mechanism" className="small">{mechanismLabel(x.answers.mechanism) || "—"}</td>
              <td data-label="Inherent"><RatingBadge rating={x.r.rating} /></td>
              <td data-label="Residual"><RatingBadge rating={x.r.residualRating} /></td>
              <td data-label="Next review" className="small">{x.next_review ? <>{fmtDate(x.next_review)}{due(x) && <> <span className="chip overdue">Due</span></>}</> : "—"}</td>
              <td data-label="Status"><Chip status={st(x) === "signed" ? "client_signed_off" : st(x) === "approved" ? "awaiting_client_signoff" : "draft"} /></td>
            </tr>
          ))}</tbody>
        </table>
      )}
      {!client.archived_at && (
        <form action={createTia} className="panel" style={{ marginTop: 24, maxWidth: 640 }}>
          <Hidden values={{ client_id: clientId }} />
          <h3 style={{ marginTop: 0 }}>Add a transfer</h3>
          <div className="tpra-two">
            <Field label="Recipient" required><input name="recipient" required placeholder="e.g. CloudHost Ireland Ltd" /></Field>
            <Field label="Destination country" required><input name="destination" required defaultValue={countries[0] ?? ""} placeholder="e.g. Ireland" /></Field>
          </div>
          <Field label="Purpose"><input name="purpose" placeholder="e.g. Hosting of customer records" /></Field>
          <fieldset className="field"><legend>Processing activities involved (RoPA)</legend>
            {ropa.length ? (
              <div className="tpra-ropa"><table>
                <thead><tr><th style={{ width: 36 }}><span className="sr-only">Select</span></th><th>Activity</th><th>Department</th><th>Transfer</th></tr></thead>
                <tbody>{ropa.map((r) => <tr key={r.id}><td><input type="checkbox" name="ropa_ids" value={r.id} id={`nt-${r.id}`} /></td><td><label htmlFor={`nt-${r.id}`}>{r.purpose}</label></td><td className="small">{r.department || "—"}</td><td className="small">{r.has_transfer ? "Outside Nigeria" : "—"}</td></tr>)}</tbody>
              </table></div>
            ) : <p className="meta">No active RoPA entries yet.</p>}
            <span className="help">Pre-fills the data categories, sensitivity, systems and mechanism from these activities.</span>
          </fieldset>
          <Field label="Year" required><input type="number" name="year" min={2019} max={2100} required defaultValue={new Date().getFullYear()} style={{ width: 140 }} /></Field>
          <Submit>Add and assess</Submit>
        </form>
      )}
    </>
  );
}
