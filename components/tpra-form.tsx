"use client";
// Third-party risk assessment wizard: eight stages on one form. Scores, rating, decision and the evidence checklist
// recalculate live as the form changes (lib/tpra-model.ts); the server recalculates the same way on save.
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import {
  FACTORS, DOMAINS, KNOCKOUTS, DPA_CLAUSES, DPA_STATUS, SCORE_LABELS, RATINGS, IMPACT_NAMES, LIKELIHOOD_NAMES, REQUIREMENTS,
  score, checklist, asModel, RATING_COLOR, type Rating, type Result,
} from "@/lib/tpra-model";

type Act = (fd: FormData) => void | Promise<void>;
type EvItem = { i: number; name: string; domain: string; from: number; when?: string; status: string; expires_on: string | null; verdict: string | null; expired: boolean; files: { id: string; name: string; kb: number }[] };
type Task = { id: string; gap: string; action: string | null; owner: string | null; deadline: string | null; status: string };
type Suggestion = { key: string; score: number; evidence: string; gaps: string; action: string };
export type TpraProps = {
  id: string; status: string; answers: Record<string, string>; model: unknown; ropaIds: string[]; history: { at: string; by: string; what: string }[];
  nextReview: string | null; approver: string | null; approvedAt: string | null; signedName: string | null; signedAt: string | null; requestedAt: string | null;
  ev: EvItem[]; tasks: Task[]; ropa: { id: string; purpose: string; department: string | null }[]; readOnly: boolean; canApprove: boolean;
  accept: string; dpiaHref: string; reportHref: string; requestHref: string;
  actions: { save: Act; approve: Act; requestEvidence: Act; copilot: Act; narrative: Act; reassess: Act };
};

export function RatingBadge({ rating }: { rating: Rating | null | string }) {
  if (!rating || !RATINGS.includes(rating as Rating)) return <span className="chip draft">Not rated</span>;
  return <span className="chip" style={{ background: RATING_COLOR[rating as Rating], color: "#fff" }}>{rating}</span>;
}

const STAGES = ["Intake", "Inherent risk", "Evidence", "Controls", "Rating", "Treatment", "Sign-off", "Monitoring"];
const DOMAIN_LABEL: Record<string, string> = Object.fromEntries([...DOMAINS.map((d) => [d.key, d.label]), ["All", "All domains"]]);
const fmt = (iso: string | null) => (iso ? new Date(iso.length === 10 ? iso + "T00:00:00Z" : iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");

function Btn({ children, action, secondary, name, value }: { children: ReactNode; action: Act; secondary?: boolean; name?: string; value?: string }) {
  const { pending } = useFormStatus();
  return <button className={`btn${secondary ? " secondary" : ""}`} formAction={action} name={name} value={value} disabled={pending} aria-busy={pending}>{pending ? "Working…" : children}</button>;
}

/** Five by five heat map, likelihood up, impact across, with the assessment's position marked. */
export function HeatMap({ impact, likelihood, bands }: { impact: number | null; likelihood: number | null; bands: [number, number, number] }) {
  const band = (s: number): Rating => (s <= bands[0] ? "Low" : s <= bands[1] ? "Medium" : s <= bands[2] ? "High" : "Critical");
  return (
    <div role="img" aria-label={impact && likelihood ? `Heat map: impact ${impact}, likelihood ${likelihood}` : "Heat map: not yet scored"} style={{ display: "inline-grid", gridTemplateColumns: "auto repeat(5, 34px)", gap: 3, fontSize: 12 }}>
      {[5, 4, 3, 2, 1].map((l) => [
        <span key={`l${l}`} style={{ alignSelf: "center", paddingRight: 6, opacity: 0.8 }}>L{l}</span>,
        ...[1, 2, 3, 4, 5].map((i) => {
          const on = i === impact && l === likelihood;
          return <span key={`${l}-${i}`} style={{ height: 30, display: "grid", placeItems: "center", borderRadius: 4, background: RATING_COLOR[band(i * l)], color: "#fff", opacity: on ? 1 : 0.45, outline: on ? "3px solid #fff" : "none", fontWeight: on ? 700 : 400 }}>{i * l}</span>;
        }),
      ])}
      <span />{[1, 2, 3, 4, 5].map((i) => <span key={`i${i}`} style={{ textAlign: "center", opacity: 0.8 }}>I{i}</span>)}
    </div>
  );
}

export default function TpraForm(p: TpraProps) {
  const model = asModel(p.model);
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
  const r: Result = score(ans, model);
  const items = checklist(r, ans);
  const suggestions: Suggestion[] = (() => { try { return JSON.parse(p.answers.copilot || "{}").domains ?? []; } catch { return []; } })();
  const copilot = (() => { try { return JSON.parse(p.answers.copilot || "null") as { at: string; source: string; knockouts: string[] } | null; } catch { return null; } })();
  const ro = p.readOnly;
  const a = p.answers;
  const t = (k: string, label: string, help?: string, rows = 2, ph?: string) => (
    <label className="field"><span>{label}</span>{help && <span className="help">{help}</span>}<textarea name={k} rows={rows} defaultValue={a[k] ?? ""} placeholder={ph} /></label>
  );
  const s = (k: string, label: string, opts: string[], help?: string) => (
    <label className="field"><span>{label}</span>{help && <span className="help">{help}</span>}<select name={k} defaultValue={a[k] ?? ""} style={{ width: "auto" }}><option value="">–</option>{opts.map((o) => <option key={o}>{o}</option>)}</select></label>
  );
  const useSuggested = () => {
    if (!form.current) return;
    for (const sg of suggestions) { const el = form.current.elements.namedItem(`d_${sg.key}`) as HTMLSelectElement | null; if (el) el.value = String(sg.score); }
    read();
  };
  const show = (n: number) => ({ hidden: stage !== n });
  const needed = items.filter((e) => e.needed);
  const evState = (i: number) => p.ev.find((e) => e.i === i);
  const received = needed.filter((e) => (evState(e.i)?.status ?? "outstanding") === "received").length;

  return (
    <form ref={form} action={p.actions.save} onInput={read} onChange={read}>
      <input type="hidden" name="id" value={p.id} />
      <div className="tpra-grid">
        <div>
          <nav className="tpra-steps" aria-label="Assessment stages">
            {STAGES.map((n, i) => <button type="button" key={n} className={i === stage ? "on" : ""} aria-current={i === stage ? "step" : undefined} onClick={() => setStage(i)}><b>{i + 1}</b> {n}</button>)}
          </nav>
          <fieldset disabled={ro} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>

            <section className="panel" {...show(0)}>
              <h3>1. Intake</h3>
              <p className="meta">The processor, its service and the processing activities it supports.</p>
              <label className="field"><span>Processor name</span><input name="vendor" defaultValue={a.vendor ?? ""} placeholder="The company's registered name, e.g. CloudHost Ltd" /></label>
              {t("service", "Service provided and the processing it involves", undefined, 2, "e.g. Cloud hosting of the patient records system: stores, backs up and serves patient files on our behalf")}
              <div className="tpra-two">
                {s("role", "Role under the NDPA", ["Data processor", "Sub-processor", "Joint controller", "Independent controller"])}
                {s("dcpmi", "NDPC DCPMI registration", ["Registered (verified)", "Registered (not verified)", "Not registered", "Not a DCPMI", "Unknown"], "Check on NDPC check where it qualifies as a DCPMI.")}
                <label className="field"><span>Country of hosting</span><input name="location" defaultValue={a.location ?? ""} placeholder="e.g. Nigeria (Lagos); AWS eu-west-1" /></label>
                {s("leaves_nigeria", "Does personal data leave Nigeria?", ["No", "Yes"], "Hosting, support or access from outside Nigeria counts.")}
                <label className="field"><span>DPO contact</span><input name="dpo_contact" defaultValue={a.dpo_contact ?? ""} placeholder="Name, email and phone of the processor's DPO" /></label>
                <label className="field"><span>Business owner (client side)</span><input name="business_owner" defaultValue={a.business_owner ?? ""} placeholder="Who manages this processor at the client, e.g. Head of IT" /></label>
              </div>
              {t("subprocessors", "Sub-processors, with locations", "Changing this on an approved assessment logs a reassessment trigger.", 2, "Other companies the processor uses to handle the data, and where they are, e.g. AWS (Ireland) for hosting; Twilio (USA) for SMS. Write None if there are none.")}
              {t("data", "Personal data and data subjects", undefined, 2, "What personal data the processor handles and whose, e.g. names, phone numbers and medical history of patients; payroll details of staff")}
              {t("contract", "Contract reference, start and end dates", undefined, 2, "e.g. MSA-2026-014, signed 1 March 2026, runs to 28 February 2028")}
              <fieldset className="field"><legend>Linked processing activities (RoPA)</legend>
                {p.ropa.length ? p.ropa.map((x) => <label key={x.id} className="check"><input type="checkbox" name="ropa_ids" value={x.id} defaultChecked={p.ropaIds.includes(x.id)} />{x.purpose}{x.department ? <span className="meta"> · {x.department}</span> : null}</label>) : <p className="meta">No active RoPA entries yet.</p>}
                <span className="help">On approval, the processor is added to the recipients of each linked activity.</span>
              </fieldset>
            </section>

            <section className="panel" {...show(1)}>
              <h3>2. Inherent risk</h3>
              <p className="meta">Score each factor on the processing itself, before any controls.</p>
              {FACTORS.map((f, n) => (
                <fieldset key={f.key} className="tpra-factor"><legend>{f.label}</legend>
                  <div className="tpra-opts">{f.levels.map((l, i) => (
                    <label key={i} className={`tpra-opt${ans[`f_${f.key}`] === String(i + 1) ? " on" : ""}`}><input type="radio" name={`f_${f.key}`} value={i + 1} defaultChecked={a[`f_${f.key}`] === String(i + 1)} /><b>{i + 1}</b> {l}</label>
                  ))}</div>
                  {n === 0 && <span className="help">Sensitive or children&apos;s data at any scale raises Impact to at least {model.floor || "–"}.</span>}
                </fieldset>
              ))}
              <p><b>Factor total {r.factorTotal ?? "–"} / 18 → Impact {r.impact ?? "–"}{r.impact ? ` (${IMPACT_NAMES[r.impact]})` : ""}</b>{r.floored && <span className="meta"> · raised from {r.impactRaw} by the sensitive-data floor</span>}</p>
            </section>

            <section className="panel" {...show(2)}>
              <div className="spread"><h3>3. Evidence</h3><span className="meta">{received} of {needed.length} required items received · sized to Impact {r.tier}</span></div>
              <p className="meta">Impact 1–2 gets the core checklist, Impact 3 adds the security documents, Impact 4–5 gets the full checklist. Files upload when you save; the client can also upload them in the portal once you request them.</p>
              <div className="tpra-ev">
                {items.map((e) => {
                  const st = evState(e.i);
                  return (
                    <div key={e.i} className={`tpra-ev-row${e.needed ? "" : " off"}`}>
                      <div><b>{e.name}</b><span className="meta" style={{ display: "block" }}>{DOMAIN_LABEL[e.domain]} · {e.needed ? "Required" : e.when === "transfer" && r.tier >= e.from ? "Only if data leaves Nigeria" : e.when === "dcpmi" && r.tier >= e.from ? "Not needed: not a DCPMI" : `Required from Impact ${e.from}`}</span>
                        {st?.files.map((f) => <a key={f.id} href={`/files/${f.id}`} style={{ display: "block" }} className="small">{f.name} <span className="meta">({f.kb} KB)</span></a>)}
                        {st?.expired && <span className="chip overdue">Expired {fmt(st.expires_on)}: reassess</span>}
                      </div>
                      <div className="tpra-ev-ctl">
                        <select name={`ev_status_${e.i}`} defaultValue={st?.status ?? "outstanding"} aria-label="Status"><option value="outstanding">Outstanding</option><option value="received">Received</option><option value="not_applicable">Not applicable</option></select>
                        <select name={`ev_verdict_${e.i}`} defaultValue={st?.verdict ?? ""} aria-label="Reviewer verdict"><option value="">Verdict –</option><option value="accepted">Accepted</option><option value="insufficient">Insufficient</option></select>
                        <label className="small">Expires <input type="date" name={`ev_exp_${e.i}`} defaultValue={st?.expires_on ?? ""} /></label>
                        <input type="file" name={`ev_file_${e.i}`} multiple accept={p.accept} aria-label={`Upload ${e.name}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="row" style={{ marginTop: 12 }}>
                {!ro && <Btn action={p.actions.requestEvidence} secondary>{p.requestedAt ? "Send the request again" : "Request evidence from the client"}</Btn>}
                <a className="btn secondary" href={p.requestHref} target="_blank" rel="noreferrer">Evidence request (PDF)</a>
                {p.requestedAt && <span className="meta">Requested {fmt(p.requestedAt)}. The client uploads in the portal under Processors.</span>}
              </div>
            </section>

            <section className="panel" {...show(3)}>
              <h3>4. Control assessment</h3>
              <p className="meta">Score each domain from 0 to 4 against the evidence: 0 no control, 1 ad hoc, 2 documented, 3 implemented with evidence, 4 independently certified or audited.</p>
              {DOMAINS.map((d, n) => {
                const sg = suggestions.find((x) => x.key === d.key);
                return (
                  <div key={d.key} className="tpra-domain">
                    <div className="spread"><b>{d.label} <span className="meta">· weight {model.weights[d.key]}%</span></b>
                      <select name={`d_${d.key}`} defaultValue={a[`d_${d.key}`] ?? ""} style={{ width: "auto" }} aria-label={`${d.label} score`}><option value="">Score –</option>{SCORE_LABELS.map((l, i) => <option key={i} value={i}>{l}</option>)}</select></div>
                    <span className="meta">{d.covers}{r.domains[n] != null ? ` · contributes ${Math.round((model.weights[d.key] * r.domains[n]! / 4) * 10) / 10}%` : ""}</span>
                    <textarea name={`dn_${d.key}`} rows={2} defaultValue={a[`dn_${d.key}`] ?? ""} placeholder="Which documents support this score, and what is missing, e.g. ISO 27001 certificate (valid to 2027) seen; no penetration test report yet" aria-label={`${d.label} notes`} />
                    {sg && <p className="small tpra-sg"><b>Copilot suggests {sg.score}</b> · {sg.evidence}. <i>Gaps:</i> {sg.gaps}. <i>Action:</i> {sg.action}</p>}
                  </div>
                );
              })}
              <p><b>Control {r.controlPct ?? "–"}% → Likelihood {r.likelihood ?? "–"}{r.likelihood ? ` (${LIKELIHOOD_NAMES[r.likelihood]})` : ""}</b></p>
              <div className="tpra-copilot">
                <b>Copilot gap analysis</b>
                <p className="meta" style={{ margin: "4px 0 8px" }}>Reads the evidence and suggests a score per domain with the evidence it relies on. It never changes a score: use the suggestions, check them, then save.</p>
                {copilot?.knockouts?.length ? <p className="small" style={{ color: "#ffb4a8" }}><b>Possible knock-outs:</b> {copilot.knockouts.join("; ")}. Check them under Rating.</p> : null}
                <div className="row">
                  {!ro && <Btn action={p.actions.copilot} secondary>{suggestions.length ? "Run gap analysis again" : "Run gap analysis"}</Btn>}
                  {!ro && suggestions.length > 0 && <button type="button" className="btn secondary" onClick={useSuggested}>Use suggested scores</button>}
                  {copilot && <span className="meta">Last run {fmt(copilot.at)} · {copilot.source === "ai" ? "AI gateway" : "rule-based reading"}</span>}
                </div>
              </div>
            </section>

            <section className="panel" {...show(4)}>
              <h3>5. Rating and decision</h3>
              <fieldset className="field"><legend>Knock-outs (any one forces Critical)</legend>
                {KNOCKOUTS.map((k) => <label key={k.key} className="check"><input type="checkbox" name={`ko_${k.key}`} defaultChecked={!!a[`ko_${k.key}`]} />{k.label}</label>)}
              </fieldset>
              <label className="check"><input type="checkbox" name="high_risk" defaultChecked={!!a.high_risk} />The processing is high-risk (large-scale monitoring, new technology, profiling with significant effects)</label>
              <div className="tpra-two" style={{ marginTop: 12 }}>
                {s("override_rating", "Override the rating", RATINGS, "Leave blank to use the calculated rating.")}
                {t("override_reason", "Reason for the override (required when overriding)", undefined, 2, "Why the calculated rating does not fit, e.g. Processor holds only encrypted data it cannot decrypt, so the impact is lower than scored")}
              </div>
              {t("narrative", "Assessment narrative (printed in the report)", "Draft it from the scores, then edit.", 4, "A short summary of the assessment: who the processor is, the inherent risk, the strength of its controls, the rating and the decision")}
              {!ro && <Btn action={p.actions.narrative} secondary>Draft the narrative</Btn>}
            </section>

            <section className="panel" {...show(5)}>
              <h3>6. Treatment</h3>
              <div className="tpra-two">
                {s("dpa_status", "Data processing agreement", DPA_STATUS)}
                <label className="field"><span>Breach notice to the client (hours)</span><input type="number" name="breach_hours" min={1} max={720} defaultValue={a.breach_hours || model.breach_hours} style={{ width: 120 }} /></label>
              </div>
              <fieldset className="field"><legend>DPA clauses (NDPA s.29)</legend>
                {DPA_CLAUSES.map((c) => <label key={c.key} className="check"><input type="checkbox" name={`dpa_${c.key}`} defaultChecked={!!a[`dpa_${c.key}`]} />{c.key === "breach" ? `Breach notice to the controller within ${ans.breach_hours || model.breach_hours} hours` : c.label}{c.enhanced && (r.rating === "High" || r.rating === "Critical") ? <span className="chip progress" style={{ marginLeft: 6 }}>Required at {r.rating}</span> : null}</label>)}
              </fieldset>
              {r.dpiaPrompt && <p className="tpra-alert">A DPIA in GAID Schedule 4 format is required: the rating is {r.rating} and the processing is high-risk. <a href={p.dpiaHref}>Start a DPIA</a></p>}
              {t("conditions", "Conditions of approval", "One per line. Printed in the report and shown to the client.", 4, "e.g.\nConfirm the cross-border transfer mechanism before go-live\nAdd audit rights and a 24-hour breach-notice clause to the DPA\nComplete a DPIA")}
              <h4 style={{ marginBottom: 4 }}>Remediation tasks</h4>
              <p className="meta" style={{ marginTop: 0 }}>Gap, action, owner, deadline and status for each condition.</p>
              <div className="tpra-tasks">
                {[...p.tasks.map((x) => ({ ...x, pre: `t_${x.id}_` })), ...[0, 1, 2].map((n) => ({ id: `new${n}`, gap: "", action: "", owner: "", deadline: "", status: "open", pre: `tn_${n}_` }))].map((x) => (
                  <div key={x.id} className="tpra-task">
                    <input name={`${x.pre}gap`} defaultValue={x.gap} placeholder="Gap" aria-label="Gap" />
                    <input name={`${x.pre}action`} defaultValue={x.action ?? ""} placeholder="Action" aria-label="Action" />
                    <input name={`${x.pre}owner`} defaultValue={x.owner ?? ""} placeholder="Owner" aria-label="Owner" />
                    <input type="date" name={`${x.pre}deadline`} defaultValue={x.deadline ?? ""} aria-label="Deadline" />
                    <select name={`${x.pre}status`} defaultValue={x.status} aria-label="Status"><option value="open">Open</option><option value="in_progress">In progress</option><option value="done">Done</option></select>
                    {!x.id.startsWith("new") ? <label className="check small"><input type="checkbox" name={`${x.pre}del`} />Remove</label> : <span />}
                  </div>
                ))}
              </div>
            </section>

            <section className="panel" {...show(6)}>
              <h3>7. Sign-off</h3>
              <ol className="tpra-sign">
                <li><b>Lead Consultant approval.</b> {p.status === "approved" ? <>Approved{p.approver ? ` by ${p.approver}` : ""}{p.approvedAt ? ` on ${fmt(p.approvedAt)}` : ""}.</> : r.rating ? <>Ready to approve as <b>{r.rating}</b>: {r.decision}.</> : "Score all six factors and six domains first."}
                  {!ro && p.status !== "approved" && (p.canApprove ? <div style={{ marginTop: 8 }}><Btn action={p.actions.approve}>Approve and send to the client</Btn></div> : <span className="meta"> Only a Lead Consultant or Firm Admin can approve.</span>)}</li>
                <li><b>Client sign-off.</b> {p.signedAt ? <>Signed by {p.signedName} on {fmt(p.signedAt)} (typed name and email code).</> : p.status === "approved" ? "Waiting for the client to sign in the portal." : "After approval, the client signs in the portal with their typed name and a one-time code."}</li>
              </ol>
              <a className="btn secondary" href={p.reportHref} target="_blank" rel="noreferrer">Processor Risk Assessment report (PDF)</a>
            </section>

            <section className="panel" {...show(7)}>
              <h3>8. Monitoring</h3>
              <p>Next review: <b>{p.nextReview ? fmt(p.nextReview) : r.rating === "Critical" ? "Before any data is shared" : "Set on approval"}</b>{r.reviewMonths ? <span className="meta"> · every {r.reviewMonths} months at {r.rating}</span> : null}</p>
              <p className="meta">Reassess when the scope changes, a breach is reported, sub-processors change, or evidence such as a certificate expires.</p>
              {!ro && p.status === "approved" && (
                <div className="row" style={{ alignItems: "flex-end" }}>
                  <label className="field" style={{ margin: 0 }}><span>Reason</span><select name="reassess_reason" style={{ width: "auto" }}>{["Scheduled review", "Scope change", "Reported breach", "New sub-processors", "Expired evidence", "Other"].map((o) => <option key={o}>{o}</option>)}</select></label>
                  <Btn action={p.actions.reassess} secondary>Start reassessment</Btn>
                </div>
              )}
              <h4>Review and reassessment log</h4>
              {p.history.length ? <ul className="small">{[...p.history].reverse().map((h, i) => <li key={i}>{fmt(h.at)} · {h.what} <span className="meta">({h.by})</span></li>)}</ul> : <p className="meta">Nothing logged yet.</p>}
            </section>

            <div className="row" style={{ marginTop: 16, justifyContent: "space-between" }}>
              <button type="button" className="btn quiet" disabled={stage === 0} onClick={() => setStage(stage - 1)}>← Back</button>
              {!ro && <Btn action={p.actions.save}>Save</Btn>}
              <button type="button" className="btn quiet" disabled={stage === STAGES.length - 1} onClick={() => setStage(stage + 1)}>Next →</button>
            </div>
          </fieldset>
        </div>

        <aside className="panel tpra-summary" aria-label="Risk summary">
          <span className="meta">Risk summary · {model.version ? `risk model v${model.version}` : "default risk model"}</span>
          <div style={{ margin: "8px 0" }}><RatingBadge rating={r.rating} /> {r.overridden && <span className="chip review">Overridden</span>}</div>
          {r.knockouts.length > 0 && <p className="tpra-alert">Knock-out: {r.knockouts.join("; ")}</p>}
          <dl className="kv">
            <dt>Impact</dt><dd>{r.factorTotal != null ? `${r.factorTotal}/18 → ${r.impact} ${IMPACT_NAMES[r.impact!]}` : "–"}</dd>
            <dt>Control</dt><dd>{r.controlPct != null ? `${r.controlPct}% → L${r.likelihood} ${LIKELIHOOD_NAMES[r.likelihood!]}` : "–"}</dd>
            <dt>Residual</dt><dd>{r.residual != null ? `${r.impact} × ${r.likelihood} = ${r.residual} (${r.scored})` : "–"}</dd>
            <dt>Decision</dt><dd>{r.decision ?? "–"}</dd>
            <dt>Review</dt><dd>{r.rating ? (r.reviewMonths ? `Every ${r.reviewMonths} months` : "Before any data is shared") : "–"}</dd>
          </dl>
          <HeatMap impact={r.impact} likelihood={r.likelihood} bands={model.rating_bands} />
          {r.rating && <p className="small" style={{ marginTop: 10 }}>{REQUIREMENTS[r.rating]}</p>}
          {r.dpiaPrompt && <p className="small"><b>DPIA required.</b></p>}
        </aside>
      </div>
    </form>
  );
}
