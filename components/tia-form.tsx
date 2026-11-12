"use client";
// Cross-border transfer risk assessment: seven stages on one form, with a live summary. Ratings, the decision and the
// document checklist recalculate as the form changes (lib/tia-model.ts); the server recalculates the same way on save.
import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { CATEGORIES, SCHEDULE5, CONCERN, DOC_GROUPS, MECHANISMS, RATINGS, RATING_COLOR, ACTION, MEANING, assess, docList, carDisclosure, type Rating } from "@/lib/tia-model";
import { RatingBadge } from "@/components/tpra-form";

type Act = (fd: FormData) => void | Promise<void>;
type Doc = { i: number; status: string; files: { id: string; name: string; kb: number }[] };
type Task = { id: string; gap: string; action: string | null; owner: string | null; deadline: string | null; status: string; priority: string | null };
type Copilot = { at: string; source: string; summary: string; schedule5: { key: string; finding: string; concern: string }[]; categories: { key: string; rating: Rating; residual: Rating; reason: string }[]; mitigations: { action: string; risk: string; priority: string }[]; verify: string[] };
export type TiaProps = {
  id: string; status: string; answers: Record<string, string>; ropaIds: string[]; history: { at: string; by: string; what: string }[];
  nextReview: string | null; approver: string | null; approvedAt: string | null; signedName: string | null; signedAt: string | null; requestedAt: string | null;
  docs: Doc[]; tasks: Task[]; ropa: { id: string; purpose: string; department: string | null }[]; readOnly: boolean; canApprove: boolean;
  accept: string; dpiaHref: string; reportHref: string; requestHref: string; legacy: [string, string][];
  actions: { save: Act; approve: Act; requestDocs: Act; copilot: Act; addMeasures: Act; narrative: Act; reassess: Act };
};

const STAGES = ["Transfer details", "Documents", "Country assessment", "Risk profile", "Mitigation plan", "Rating and CAR", "Sign-off and review"];
const fmt = (iso: string | null) => (iso ? new Date(iso.length === 10 ? iso + "T00:00:00Z" : iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");

function Btn({ children, action, secondary }: { children: ReactNode; action: Act; secondary?: boolean }) {
  const { pending } = useFormStatus();
  return <button className={`btn${secondary ? " secondary" : ""}`} formAction={action} disabled={pending} aria-busy={pending}>{pending ? "Working…" : children}</button>;
}
const Dot = ({ r }: { r: string | null }) => <span title={r ?? "Not rated"} style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: r ? RATING_COLOR[r as Rating] ?? "#5f6878" : "rgba(255,255,255,0.2)" }} />;

export default function TiaForm(p: TiaProps) {
  const form = useRef<HTMLFormElement>(null);
  const [stage, setStage] = useState(0);
  const [ans, setAns] = useState<Record<string, string>>(p.answers);
  const read = useCallback(() => {
    if (!form.current) return;
    const fd = new FormData(form.current), o: Record<string, string> = {};
    fd.forEach((v, k) => { if (typeof v === "string") o[k] = v; });
    setAns(o);
  }, []);
  useEffect(read, [read]);
  const r = assess(ans);
  const docs = docList(ans);
  const cp: Copilot | null = (() => { try { return JSON.parse(p.answers.copilot || "null"); } catch { return null; } })();
  const ro = p.readOnly, a = p.answers;
  const t = (k: string, label: string, ph?: string, help?: string, rows = 2) => (
    <label className="field"><span>{label}</span>{help && <span className="help">{help}</span>}<textarea name={k} rows={rows} defaultValue={a[k] ?? ""} placeholder={ph} /></label>
  );
  const i = (k: string, label: string, ph?: string, help?: string) => (
    <label className="field"><span>{label}</span>{help && <span className="help">{help}</span>}<input name={k} defaultValue={a[k] ?? ""} placeholder={ph} /></label>
  );
  const s = (k: string, label: string, opts: string[], help?: string) => (
    <label className="field"><span>{label}</span>{help && <span className="help">{help}</span>}<select name={k} defaultValue={a[k] ?? ""} style={{ width: "auto" }}><option value="">–</option>{opts.map((o) => <option key={o}>{o}</option>)}</select></label>
  );
  const show = (n: number) => ({ hidden: stage !== n });
  const setVal = (name: string, v: string) => { const el = form.current?.elements.namedItem(name) as HTMLSelectElement | HTMLTextAreaElement | null; if (el) el.value = v; };
  const useRatings = () => { for (const c of cp?.categories ?? []) { setVal(`c_${c.key}`, c.rating); setVal(`cr_${c.key}`, c.residual); if (!(form.current?.elements.namedItem(`cn_${c.key}`) as HTMLTextAreaElement)?.value) setVal(`cn_${c.key}`, c.reason); } read(); };
  const useS5 = () => { for (const f of cp?.schedule5 ?? []) { setVal(`s5_${f.key}`, f.concern); if (!(form.current?.elements.namedItem(`s5n_${f.key}`) as HTMLTextAreaElement)?.value) setVal(`s5n_${f.key}`, f.finding); } read(); };
  const dstate = (n: number) => p.docs.find((d) => d.i === n);
  const needed = docs.filter((d) => d.needed);
  const received = needed.filter((d) => (dstate(d.i)?.status ?? "outstanding") === "received").length;
  const car = carDisclosure([{ answers: ans, status: p.status }]);

  return (
    <form ref={form} action={p.actions.save} onInput={read} onChange={read}>
      <input type="hidden" name="id" value={p.id} />
      <div className="tpra-grid">
        <div>
          <nav className="tpra-steps" aria-label="Assessment stages">
            {STAGES.map((n, k) => <button type="button" key={n} className={k === stage ? "on" : ""} aria-current={k === stage ? "step" : undefined} onClick={() => setStage(k)}><b>{k + 1}</b> {n}</button>)}
          </nav>
          <fieldset disabled={ro} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>

            <section className="panel" {...show(0)}>
              <h3>1. Transfer details</h3>
              <p className="meta">What leaves Nigeria, to whom, where, why, and the mechanism relied on (NDPA ss.41–43, GAID Art. 45).</p>
              <div className="tpra-two">
                {i("recipient", "Recipient", "The foreign company or entity, e.g. CloudHost Ireland Ltd")}
                {s("recipient_role", "Recipient's role", ["Data processor", "Data controller", "Joint controller", "Group company", "Sub-processor"])}
                {i("destination", "Destination country or countries", "e.g. Ireland; United States")}
                {s("sensitive", "Sensitive personal data involved?", ["No", "Yes – sensitive personal data", "Yes – children's data", "Yes – both"])}
                {i("subjects_count", "Approximate number of data subjects", "e.g. 12000")}
                {i("frequency", "Frequency", "e.g. Continuous (hosted), daily sync, one-off migration")}
              </div>
              {t("data", "Categories of personal data transferred", "e.g. Names, phone numbers, BVNs and ID documents of customers")}
              {t("purpose", "Purpose of the transfer", "e.g. Hosting of the core banking platform and its backups")}
              {t("systems", "Systems, applications and cloud platforms involved", "e.g. Core banking platform on AWS eu-west-1; Salesforce CRM")}
              {t("subprocessors", "Sub-processors known, with locations", "Other companies the recipient passes the data to, e.g. AWS (Ireland), Twilio (USA). Write Unknown if not disclosed.")}
              {i("business_owner", "Business owner (client side)", "Who manages this transfer, e.g. Head of IT")}
              <h4 style={{ marginBottom: 4 }}>Transfer mechanism</h4>
              <div className="tpra-two">
                <label className="field"><span>Mechanism relied on</span>
                  <select name="mechanism" defaultValue={a.mechanism ?? ""}><option value="">–</option>{MECHANISMS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}</select></label>
                {s("adequacy_decision", "NDPC adequacy decision for the destination?", ["Yes", "No", "Unknown"])}
                {s("consent_obtained", "Explicit data subject consent obtained?", ["Yes", "No", "Not applicable"], "Flagged where there is no adequacy decision.")}
              </div>
              {t("mechanism_notes", "Mechanism details and evidence", "e.g. EU SCCs (module 2) signed 3 March 2026, Annex II security measures attached")}
              {r.flags.map((f, k) => <p key={k} className="tpra-alert" style={{ marginTop: 8 }}>{f}</p>)}
              <input type="hidden" name="ropa_present" value="1" />
              <fieldset className="field"><legend>Linked processing activities (RoPA)</legend>
                {p.ropa.length ? (
                  <div className="tpra-ropa"><table>
                    <thead><tr><th style={{ width: 36 }}><span className="sr-only">Select</span></th><th>Activity</th><th>Department</th></tr></thead>
                    <tbody>{p.ropa.map((x) => <tr key={x.id}><td><input type="checkbox" name="ropa_ids" value={x.id} id={`tr-${x.id}`} defaultChecked={p.ropaIds.includes(x.id)} /></td><td><label htmlFor={`tr-${x.id}`}>{x.purpose}</label></td><td className="small">{x.department || "—"}</td></tr>)}</tbody>
                  </table></div>
                ) : <p className="meta">No active RoPA entries yet.</p>}
                <span className="help">On approval, each linked activity is marked as transferring outside Nigeria, with this mechanism.</span>
              </fieldset>
              {p.legacy.length > 0 && <details className="small" style={{ marginTop: 8 }}><summary>Answers from the earlier form</summary><dl className="kv">{p.legacy.map(([k, v]) => <Fragment key={k}><dt>{k}</dt><dd>{v}</dd></Fragment>)}</dl></details>}
            </section>

            <section className="panel" {...show(1)}>
              <div className="spread"><h3>2. Documents</h3><span className="meta">{received} of {needed.length} required received</span></div>
              <p className="meta">Request these four groups during CAR readiness. Items marked &ldquo;where applicable&rdquo; depend on the mechanism and the data. Files upload when you save; the client can also upload them in the portal under Transfers.</p>
              {(Object.keys(DOC_GROUPS) as (keyof typeof DOC_GROUPS)[]).map((g) => (
                <div key={g} style={{ marginBottom: 12 }}>
                  <h4 style={{ margin: "12px 0 4px" }}>{g}. {DOC_GROUPS[g]}</h4>
                  <div className="tpra-ev">
                    {docs.filter((d) => d.group === g).map((d) => {
                      const st = dstate(d.i);
                      return (
                        <div key={d.i} className={`tpra-ev-row${d.needed ? "" : " off"}`}>
                          <div><b>{d.name}</b>{!d.needed && <span className="meta" style={{ display: "block" }}>Not needed for this transfer</span>}
                            {st?.files.map((f) => <a key={f.id} href={`/files/${f.id}`} style={{ display: "block" }} className="small">{f.name} <span className="meta">({f.kb} KB)</span></a>)}</div>
                          <div className="tpra-ev-ctl">
                            <select name={`ev_status_${d.i}`} defaultValue={st?.status ?? "outstanding"} aria-label={`${d.name} status`}><option value="outstanding">Outstanding</option><option value="received">Received</option><option value="not_applicable">Not applicable</option></select>
                            <input type="file" name={`ev_file_${d.i}`} multiple accept={p.accept} aria-label={`Upload ${d.name}`} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="row" style={{ marginTop: 12 }}>
                {!ro && <Btn action={p.actions.requestDocs} secondary>{p.requestedAt ? "Send the request again" : "Request documents from the client"}</Btn>}
                <a className="btn secondary" href={p.requestHref} target="_blank" rel="noreferrer">Document request (PDF)</a>
                {p.requestedAt && <span className="meta">Requested {fmt(p.requestedAt)}.</span>}
              </div>
            </section>

            <section className="panel" {...show(2)}>
              <div className="spread"><h3>3. Country assessment</h3><span className="meta">GAID Schedule 5</span></div>
              <p className="meta">Test the destination, not just the documents. Record what you found and the level of concern.</p>
              {cp && <div className="row" style={{ marginBottom: 8 }}><button type="button" className="btn secondary" onClick={useS5} disabled={ro}>Use the copilot&apos;s concerns</button><span className="meta">Fills empty findings; your text is kept.</span></div>}
              {SCHEDULE5.map((f) => {
                const sg = cp?.schedule5.find((x) => x.key === f.key);
                return (
                  <div key={f.key} className="tpra-domain">
                    <div className="spread"><b>{f.label}</b>
                      <select name={`s5_${f.key}`} defaultValue={a[`s5_${f.key}`] ?? ""} style={{ width: "auto" }} aria-label={`${f.label} concern`}><option value="">Concern –</option>{CONCERN.map((c) => <option key={c}>{c}</option>)}</select></div>
                    <span className="meta">{f.question}</span>
                    <textarea name={`s5n_${f.key}`} rows={2} defaultValue={a[`s5n_${f.key}`] ?? ""} placeholder="Finding, with the source relied on" aria-label={`${f.label} finding`} />
                    {sg && <p className="small tpra-sg"><b>Copilot: {sg.concern}</b> · {sg.finding}</p>}
                  </div>
                );
              })}
            </section>

            <section className="panel" {...show(3)}>
              <h3>4. Risk profile</h3>
              <p className="meta">Rate each category Low, Medium, High or Critical before mitigation (inherent) and once the mitigation plan is in place (residual). These are organisational ratings, not official NDPC country ratings.</p>
              {cp && <div className="row" style={{ marginBottom: 8 }}><button type="button" className="btn secondary" onClick={useRatings} disabled={ro}>Use the copilot&apos;s ratings</button><span className="meta">Fills the selects and empty reasons; check them, then save.</span></div>}
              {CATEGORIES.map((c, n) => {
                const sg = cp?.categories.find((x) => x.key === c.key);
                return (
                  <div key={c.key} className="tpra-domain">
                    <div className="tia-cat-head"><b>{n + 1}. {c.label}</b>
                      <span className="tia-cat-sel">
                        <select name={`c_${c.key}`} defaultValue={a[`c_${c.key}`] ?? ""} style={{ width: "auto" }} aria-label={`${c.label} inherent`}><option value="">Inherent –</option>{RATINGS.map((x) => <option key={x}>{x}</option>)}</select>
                        <select name={`cr_${c.key}`} defaultValue={a[`cr_${c.key}`] ?? ""} style={{ width: "auto" }} aria-label={`${c.label} residual`}><option value="">Residual –</option>{RATINGS.map((x) => <option key={x}>{x}</option>)}</select>
                      </span></div>
                    <span className="meta">{c.assesses}. Typical risks: {c.risks}.</span>
                    <textarea name={`cn_${c.key}`} rows={2} defaultValue={a[`cn_${c.key}`] ?? ""} placeholder={`Reason, e.g. ${c.example}`} aria-label={`${c.label} reason`} />
                    {sg && <p className="small tpra-sg"><b>Copilot: {sg.rating} → {sg.residual}</b> · {sg.reason}</p>}
                  </div>
                );
              })}
              <p><b>Overall inherent {r.inherentOverall ?? "–"} · residual {r.residualRating ?? "–"}</b> <span className="meta">The overall rating is the highest category rating.</span></p>
            </section>

            <section className="panel" {...show(4)}>
              <h3>5. Mitigation plan</h3>
              <p className="meta">Each measure tied to the risk it addresses, with an owner, priority and deadline.</p>
              {cp?.mitigations.length ? <div className="row" style={{ marginBottom: 8 }}>{!ro && <Btn action={p.actions.addMeasures} secondary>Add the copilot&apos;s {cp.mitigations.length} suggested measures</Btn>}<span className="meta">Measures already in the plan are skipped.</span></div> : null}
              <div className="tia-plan">
                {[...p.tasks.map((x) => ({ ...x, pre: `t_${x.id}_` })), ...(p.tasks.length ? [0] : [0, 1, 2]).map((n) => ({ id: `new${n}`, gap: "", action: "", owner: "", deadline: "", status: "open", priority: "Medium", pre: `tn_${n}_` }))].map((x) => (
                  <div key={x.id} className={`tia-plan-r${x.id.startsWith("new") ? " new" : ""}`}>
                    <label className="tia-plan-action"><span>{x.id.startsWith("new") ? "New measure" : "Action"}</span><input name={`${x.pre}action`} defaultValue={x.action ?? ""} placeholder={x.id.startsWith("new") ? "e.g. Encrypt the data in transit and at rest" : ""} /></label>
                    <label className="tia-plan-risk"><span>Risk addressed</span><select name={`${x.pre}gap`} defaultValue={x.gap || "General"}><option>General</option>{CATEGORIES.map((c) => <option key={c.key}>{c.label}</option>)}{x.gap && x.gap !== "General" && !CATEGORIES.some((c) => c.label === x.gap) ? <option>{x.gap}</option> : null}</select></label>
                    <label><span>Owner</span><input name={`${x.pre}owner`} defaultValue={x.owner ?? ""} placeholder="e.g. Head of IT" /></label>
                    <label><span>Priority</span><select name={`${x.pre}priority`} defaultValue={x.priority ?? "Medium"}><option>High</option><option>Medium</option><option>Low</option></select></label>
                    <label><span>Deadline</span><input type="date" name={`${x.pre}deadline`} defaultValue={x.deadline ?? ""} /></label>
                    <label><span>Status</span><select name={`${x.pre}status`} defaultValue={x.status}><option value="open">Open</option><option value="in_progress">In progress</option><option value="done">Done</option></select></label>
                    {!x.id.startsWith("new") && <label className="check small tia-plan-del"><input type="checkbox" name={`${x.pre}del`} />Remove</label>}
                  </div>
                ))}
              </div>
              {r.dpiaPrompt && <p className="tpra-alert" style={{ marginTop: 12 }}>A DPIA in GAID Schedule 4 format is required: the transfer is {r.rating} and involves sensitive or high-risk processing. <a href={p.dpiaHref}>Start a DPIA</a></p>}
            </section>

            <section className="panel" {...show(5)}>
              <h3>6. Rating and CAR disclosure</h3>
              {r.knockout && <p className="tpra-alert">{r.knockout}: the rating is Critical.</p>}
              <table className="tia-matrix"><thead><tr><th>Rating</th><th>Meaning</th><th>Recommended action</th></tr></thead>
                <tbody>{RATINGS.map((x) => <tr key={x} className={x === r.rating ? "on" : ""}><td><RatingBadge rating={x} /></td><td>{MEANING[x]}</td><td>{ACTION[x]}</td></tr>)}</tbody></table>
              <label className="check" style={{ marginTop: 12 }}><input type="checkbox" name="high_risk" defaultChecked={!!a.high_risk} />The processing is high-risk (large-scale monitoring, new technology, profiling with significant effects)</label>
              <div className="tpra-two" style={{ marginTop: 8 }}>
                {s("override_rating", "Override the inherent rating", RATINGS, "Leave blank to use the highest category rating.")}
                {t("override_reason", "Reason for the override (required when overriding)", "Why the calculated rating does not fit")}
              </div>
              {t("narrative", "Transfer summary (printed in the report)", "A short summary: what is transferred, to whom and where, the mechanism, the ratings and the action", "Draft it from the ratings, then edit.", 4)}
              {!ro && <Btn action={p.actions.narrative} secondary>Draft the summary</Btn>}
              <h4 style={{ marginBottom: 4 }}>CAR disclosure (GAID Schedule 2)</h4>
              <dl className="kv tia-car">
                <dt>Transfers outside Nigeria</dt><dd>{car.transfers ? "Yes" : "Not recorded"}</dd>
                <dt>Categories</dt><dd>{ans.data || "–"} · {r.sensitive ? "sensitive" : "non-sensitive"}</dd>
                <dt>Legal ground</dt><dd>{r.mechanism?.label ?? "–"}</dd>
                <dt>Documented and assessed</dt><dd>{p.status === "approved" ? "Yes, approved" : "In progress"}</dd>
                <dt>Receiving countries</dt><dd>{car.countries.join(", ") || "–"}</dd>
              </dl>
              {cp?.verify.length ? <><h4 style={{ marginBottom: 4 }}>Items to verify</h4><ul className="small">{cp.verify.map((v, k) => <li key={k}>{v}</li>)}</ul></> : null}
            </section>

            <section className="panel" {...show(6)}>
              <h3>7. Sign-off and review</h3>
              <ol className="tpra-sign">
                <li><b>Lead Consultant approval.</b> {p.status === "approved" ? <>Approved{p.approver ? ` by ${p.approver}` : ""}{p.approvedAt ? ` on ${fmt(p.approvedAt)}` : ""}.</> : r.rating && r.residualRating ? <>Ready to approve: inherent <b>{r.rating}</b>, residual <b>{r.residualRating}</b>. {r.action}.</> : "Record the mechanism and rate all eight categories, inherent and residual, first."}
                  {!ro && p.status !== "approved" && (p.canApprove ? <div style={{ marginTop: 8 }}><Btn action={p.actions.approve}>Approve and send to the client</Btn></div> : <span className="meta"> Only a Lead Consultant or Firm Admin can approve.</span>)}</li>
                <li><b>Management approval of residual risk.</b> {p.signedAt ? <>Approved by {p.signedName} on {fmt(p.signedAt)} (typed name and email code).</> : p.status === "approved" ? "Waiting for the client's management to approve in the portal." : "After approval, the client's management approves the residual risk in the portal."}</li>
              </ol>
              {t("residual_acceptance", "Residual risk accepted, and on what conditions", "e.g. Residual risk Medium accepted subject to SCCs being signed by 31 January and quarterly access reviews")}
              <p>Next review: <b>{p.nextReview ? fmt(p.nextReview) : "Set on approval"}</b>{r.reviewMonths ? <span className="meta"> · every {r.reviewMonths} months at {r.residualRating ?? r.rating}</span> : null}</p>
              <p className="meta">Reassess when the destination, recipient or mechanism changes, the destination&apos;s law changes, or a breach is reported.</p>
              {!ro && p.status === "approved" && (
                <div className="row" style={{ alignItems: "flex-end" }}>
                  <label className="field" style={{ margin: 0 }}><span>Reason</span><select name="reassess_reason" style={{ width: "auto" }}>{["Scheduled review", "New destination or recipient", "Mechanism changed", "Change in destination law", "Reported breach", "Other"].map((o) => <option key={o}>{o}</option>)}</select></label>
                  <Btn action={p.actions.reassess} secondary>Start reassessment</Btn>
                </div>
              )}
              <a className="btn secondary" href={p.reportHref} target="_blank" rel="noreferrer" style={{ marginTop: 12 }}>Transfer Risk Assessment report (PDF)</a>
              <h4>Review log</h4>
              {p.history.length ? <ul className="small">{[...p.history].reverse().map((h, k) => <li key={k}>{fmt(h.at)} · {h.what} <span className="meta">({h.by})</span></li>)}</ul> : <p className="meta">Nothing logged yet.</p>}
            </section>

            <div className="row" style={{ marginTop: 16, justifyContent: "space-between" }}>
              <button type="button" className="btn quiet" disabled={stage === 0} onClick={() => setStage(stage - 1)}>← Back</button>
              {!ro && <Btn action={p.actions.save}>Save</Btn>}
              <button type="button" className="btn quiet" disabled={stage === STAGES.length - 1} onClick={() => setStage(stage + 1)}>Next →</button>
            </div>
          </fieldset>
        </div>

        <aside className="panel tpra-summary" aria-label="Transfer summary">
          <span className="meta">Transfer risk</span>
          <div className="tia-ratings"><div><span className="meta">Inherent</span><RatingBadge rating={r.rating} />{r.overridden && <span className="chip review">Overridden</span>}</div><div><span className="meta">Residual</span><RatingBadge rating={r.residualRating} /></div></div>
          {r.knockout && <p className="tpra-alert">{r.knockout}</p>}
          <dl className="kv">
            <dt>Destination</dt><dd>{ans.destination || "–"}</dd>
            <dt>Mechanism</dt><dd>{r.mechanism?.label ?? "–"}</dd>
            <dt>Documents</dt><dd>{received} of {needed.length} received</dd>
            <dt>Schedule 5</dt><dd>{r.concerns.filter(Boolean).length ? `${r.s5High} high of ${r.concerns.filter(Boolean).length} assessed` : "–"}</dd>
            <dt>Action</dt><dd>{r.action ?? "–"}</dd>
          </dl>
          <div className="tia-profile" aria-label="Risk profile, inherent then residual">
            {CATEGORIES.map((c, n) => <div key={c.key}><span>{c.label}</span><Dot r={r.inherent[n]} /><Dot r={r.residual[n]} /></div>)}
          </div>
          {r.flags.length > 0 && <p className="small" style={{ marginTop: 10 }}><b>{r.flags.length} flag{r.flags.length > 1 ? "s" : ""}</b> under Transfer details.</p>}
          {r.dpiaPrompt && <p className="small"><b>DPIA required.</b></p>}
          <div className="tpra-copilot">
            <b>Copilot</b>
            <p className="meta" style={{ margin: "4px 0 8px" }}>Reads the details and documents, then suggests Schedule 5 concerns, category ratings and measures. It never changes a rating.</p>
            {cp && <p className="small" style={{ margin: "0 0 8px" }}>{cp.summary}</p>}
            {!ro && <Btn action={p.actions.copilot} secondary>{cp ? "Run again" : "Run the copilot"}</Btn>}
            {cp && <p className="meta" style={{ margin: "6px 0 0" }}>Last run {fmt(cp.at)} · {cp.source === "ai" ? "AI gateway" : "rule-based reading"}</p>}
          </div>
        </aside>
      </div>
    </form>
  );
}
