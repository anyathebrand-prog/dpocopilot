import Link from "next/link";
import { requireClient, clientBase } from "@/lib/auth";
import { q } from "@/lib/db";
import { todayWAT, fmtDate } from "@/lib/rules";
import { RATINGS, RATING_COLOR } from "@/lib/tpra-model";
import { createTpra, importTpra } from "@/lib/tpra-actions";
import { Flash, Field, Hidden, Chip, Empty } from "@/components/ui";
import { Submit } from "@/components/client";
import { RatingBadge } from "@/components/tpra-form";

/** "payroll provider,, auditors,, cloud host." → "Payroll provider, auditors, cloud host" (duplicates and empty items dropped). */
const recipients = (s: string | null) => {
  const seen = new Set<string>();
  const out = String(s ?? "").split(/[,;\n]+/).map((x) => x.trim().replace(/\.+$/, "")).filter((x) => x && !seen.has(x.toLowerCase()) && seen.add(x.toLowerCase()));
  const t = out.join(", ");
  return t ? t[0].toUpperCase() + t.slice(1) : "";
};

const STATUS: [string, string][] = [["draft", "Draft"], ["approved", "Approved, awaiting client"], ["signed", "Client signed"], ["due", "Review due"]];

/** Processor register: every processor the client uses, with its rating, DPA status and next review. */
export default async function TpraRegister({ clientId, sp }: { clientId: string; sp: Record<string, string> }) {
  const { client } = await requireClient(clientId, { portal: true });
  const B = await clientBase(clientId);
  const today = todayWAT();
  const rows = await q(`select a.id, a.title, a.status, a.rating, a.residual, a.answers, to_char(a.next_review, 'YYYY-MM-DD') as next_review, a.client_signed_at, a.assessment_year,
      (select count(*)::int from tpra_evidence e where e.assessment_id = a.id and e.expires_on < $2::date) as expired,
      (select count(*)::int from tpra_tasks t where t.assessment_id = a.id and t.status <> 'done') as open_tasks
    from assessments a where a.client_id = $1 and a.kind = 'tpra' order by a.updated_at desc`, [clientId, today]);
  const ropa = await q("select id, purpose, recipients from ropa_entries where client_id = $1 and state = 'active' order by purpose", [clientId]);
  const st = (r: any) => (r.client_signed_at ? "signed" : r.status);
  const due = (r: any) => (!!r.next_review && r.next_review <= today) || r.expired > 0;
  const shown = rows.filter((r) => (!sp.rating || r.rating === sp.rating || (sp.rating === "none" && !r.rating)) && (!sp.status || (sp.status === "due" ? due(r) : st(r) === sp.status)));
  const counts = Object.fromEntries(RATINGS.map((k) => [k, rows.filter((r) => r.rating === k).length]));
  const b = `${B}/assessments/tpra`;
  const link = (k: string, v: string) => { const p = new URLSearchParams({ ...(sp.rating ? { rating: sp.rating } : {}), ...(sp.status ? { status: sp.status } : {}) }); if (v) p.set(k, v); else p.delete(k); const s = p.toString(); return s ? `${b}?${s}` : b; };
  const unassessed = ropa.filter((r) => r.recipients?.trim()).length;
  return (
    <>
      <div className="spread"><h2 style={{ marginTop: 0 }}>Processor register</h2>
        <div className="row"><a className="btn secondary" href={`/export?kind=tpra-register&client=${clientId}&format=xlsx`}>Export register (Excel)</a></div></div>
      <p className="meta">Data Processor Third-Party Risk Assessments under NDPA s.29 and the GAID. Each processor is scored on six impact factors and six control domains: residual risk = Impact × Likelihood, with knock-outs forcing Critical.</p>
      <Flash sp={sp} />
      <div className="tpra-stats">
        {RATINGS.map((k) => <Link key={k} href={link("rating", sp.rating === k ? "" : k)} className={`tpra-stat${sp.rating === k ? " on" : ""}`} style={{ borderTop: `5px solid ${RATING_COLOR[k]}` }}><span>{k}</span><b className="num">{counts[k]}</b></Link>)}
        <Link href={link("status", sp.status === "due" ? "" : "due")} className={`tpra-stat${sp.status === "due" ? " on" : ""}`}><span>Review due</span><b className="num">{rows.filter(due).length}</b></Link>
      </div>
      <form method="get" className="row" style={{ alignItems: "flex-end", marginBottom: 12 }} aria-label="Filter">
        <label className="small">Rating <select name="rating" defaultValue={sp.rating ?? ""} style={{ display: "block", width: "auto" }}><option value="">All</option>{RATINGS.map((k) => <option key={k}>{k}</option>)}<option value="none">Not rated</option></select></label>
        <label className="small">Status <select name="status" defaultValue={sp.status ?? ""} style={{ display: "block", width: "auto" }}><option value="">All</option>{STATUS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <button className="btn secondary">Filter</button>{(sp.rating || sp.status) && <Link href={b} className="btn quiet">Clear</Link>}
      </form>
      {shown.length === 0 ? <Empty><p>{rows.length ? "No processors match the filter." : "No processors in the register yet."}</p>{!rows.length && unassessed > 0 && <p className="meta">{unassessed} RoPA activit{unassessed === 1 ? "y names" : "ies name"} recipients: add each processor below.</p>}</Empty> : (
        <table className="register">
          <thead><tr><th>Processor</th><th>Service</th><th>Hosting</th><th>Rating</th><th>DPA</th><th>Next review</th><th>Status</th></tr></thead>
          <tbody>{shown.map((r) => (
            <tr key={r.id}>
              <td><Link href={`${b}/${r.id}`}><b>{r.answers.vendor || r.title}</b></Link>{r.open_tasks > 0 && <span className="meta" style={{ display: "block" }}>{r.open_tasks} open task{r.open_tasks > 1 ? "s" : ""}</span>}</td>
              <td data-label="Service" className="small">{r.answers.service || "—"}</td>
              <td data-label="Hosting" className="small">{r.answers.location || "—"}{r.answers.leaves_nigeria === "Yes" && <span className="meta" style={{ display: "block" }}>Data leaves Nigeria</span>}</td>
              <td data-label="Rating"><RatingBadge rating={r.rating} />{r.residual ? <span className="meta"> {r.residual}</span> : null}</td>
              <td data-label="DPA" className="small">{r.answers.dpa_status || "Not started"}</td>
              <td data-label="Next review" className="small">{r.next_review ? <>{fmtDate(r.next_review)}{r.next_review <= today && <> <span className="chip overdue">Due</span></>}</> : r.rating === "Critical" && r.status === "approved" ? "Before data is shared" : "—"}{r.expired > 0 && <span className="chip overdue" style={{ marginLeft: 4 }}>Evidence expired</span>}</td>
              <td data-label="Status"><Chip status={st(r) === "signed" ? "client_signed_off" : st(r) === "approved" ? "awaiting_client_signoff" : "draft"} /></td>
            </tr>
          ))}</tbody>
        </table>
      )}
      {!client.archived_at && (
        <div className="row" style={{ alignItems: "flex-start", gap: 16, marginTop: 24 }}>
          <form action={createTpra} className="panel" style={{ flex: "1 1 380px", maxWidth: 560 }}>
            <Hidden values={{ client_id: clientId }} />
            <h3 style={{ marginTop: 0 }}>Add a processor</h3>
            <Field label="Processor name" required><input name="name" required /></Field>
            <Field label="Service"><input name="service" placeholder="e.g. Payroll processing, cloud hosting, SMS delivery" /></Field>
            <Field label="Country of hosting"><input name="location" placeholder="e.g. Nigeria, or AWS eu-west-1 (Ireland)" /></Field>
            <fieldset className="field"><legend>Processing activities it supports (RoPA)</legend>
              {ropa.length ? (
                <div className="tpra-ropa">
                  <table>
                    <thead><tr><th style={{ width: 36 }}><span className="sr-only">Select</span></th><th>Activity</th><th>Recipients</th></tr></thead>
                    <tbody>{ropa.map((r) => (
                      <tr key={r.id}>
                        <td><input type="checkbox" name="ropa_ids" value={r.id} id={`ropa-${r.id}`} /></td>
                        <td><label htmlFor={`ropa-${r.id}`}>{r.purpose}</label></td>
                        <td className="small">{recipients(r.recipients) || "—"}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              ) : <p className="meta">No active RoPA entries yet.</p>}
              <span className="help">Pre-fills the data, sensitivity and transfer factors from these activities.</span>
            </fieldset>
            <Field label="Year" required><input type="number" name="year" min={2019} max={2100} required defaultValue={new Date().getFullYear()} style={{ width: 140 }} /></Field>
            <Submit>Add and assess</Submit>
          </form>
          <form action={importTpra} className="panel" style={{ flex: "1 1 280px", maxWidth: 420 }}>
            <Hidden values={{ client_id: clientId }} />
            <h3 style={{ marginTop: 0 }}>Import processors</h3>
            <p className="meta">A CSV or Excel file with a header row. Columns: <b>Processor</b> (required), Service, Country, DPO contact, Sub-processors. Names already in the register are skipped.</p>
            <input type="file" name="file" accept=".csv,.xlsx" required />
            <div style={{ marginTop: 12 }}><Submit className="btn secondary">Import</Submit></div>
          </form>
        </div>
      )}
    </>
  );
}
