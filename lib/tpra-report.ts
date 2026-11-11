// Third-party risk (TPRA) documents: the Processor Risk Assessment report (rating, decision, scores, evidence, treatment,
// sign-off) and the Evidence Request sent to the client, sized to the processor's impact tier.
// Same house style as the DPIA and LIA readiness documents: the client's name on the band, no DPCO branding.
import { CSS as BASE } from "./car-report";
import { fmtDate, todayWAT } from "./rules";
import {
  score, asModel, FACTORS, DOMAINS, DPA_CLAUSES, SCORE_LABELS, IMPACT_NAMES, LIKELIHOOD_NAMES, REQUIREMENTS, type Rating, type Model,
} from "./tpra-model";
import type { evidenceState } from "./tpra";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const COLOR: Record<Rating, string> = { Low: "#1e7a4c", Medium: "#b7791f", High: "#c2410c", Critical: "#b42318" };
const day = (d: unknown) => (d ? fmtDate(new Date(d as string).toISOString().slice(0, 10)) : "");
const NR = `<span class="nr">Not recorded</span>`;
const v = (s: unknown) => (String(s ?? "").trim() ? esc(s).replace(/\n/g, "<br>") : NR);

type Ev = ReturnType<typeof evidenceState>;
export type TpraReportInput = {
  org: string; by: string;
  a: { title: string; assessment_year: number; status: string; answers: Record<string, string>; model: unknown; next_review: string | null; approver: string | null; approved_at: unknown;
    client_signed_name: string | null; client_signed_at: unknown; history: { at: string; by: string; what: string }[] };
  ev: Ev; tasks: { gap: string; action: string | null; owner: string | null; deadline: string | null; status: string }[]; ropa: string[];
};

const STYLE = `
thead { display: table-header-group; } h2 { break-after: avoid; } tr { break-inside: avoid; }
table.band { margin: 0 0 14px; } table.band td { border: none; background: #0d1f4a; color: #fff; padding: 14px 16px; vertical-align: middle; }
.band-l .org { font-size: 14pt; font-weight: 700; color: #fff; } .band-r { text-align: right; width: 50%; }
.kicker { font-size: 8pt; letter-spacing: .08em; text-transform: uppercase; color: #9fc0ee; } .doc { font-size: 17pt; font-weight: 700; color: #fff; }
table.facts td { border: none; border-bottom: 2px solid #e3e8f0; padding: 6px 10px 8px 0; vertical-align: top; }
.lbl { font-size: 7.5pt; text-transform: uppercase; letter-spacing: .06em; color: #5f6878; font-weight: 600; }
.small { font-size: 8.5pt; color: #5f6878; } tr.alt td { background: #f7f9fc; } .nr { color: #9aa3b2; font-style: italic; }
.law { border-left: 5px solid #2a6aa8; background: #f2f6fc; padding: 12px 16px; margin: 8px 0 10px; } .law p { margin: 0 0 6px; }
.law .cite { font-size: 9pt; font-weight: 700; color: #2a6aa8; } .law li { margin-bottom: 3px; }
table.result td { border: none; vertical-align: middle; padding: 10px 14px; } table.result { margin: 6px 0 12px; border: 1px solid #e3e8f0; }
.badge { display: inline-block; color: #fff; font-weight: 700; padding: 6px 14px; border-radius: 4px; font-size: 13pt; }
.big { font-size: 20pt; font-weight: 700; color: #0d1f4a; } .ko { border-left: 5px solid #b42318; background: #fdecea; padding: 10px 14px; margin: 8px 0; color: #7a1a12; }
table.heat { width: auto; border-collapse: separate; border-spacing: 3px; } table.heat td { width: 30px; height: 24px; text-align: center; color: #fff; font-size: 8pt; border: none; padding: 0; }
table.heat td.ax { color: #5f6878; background: none; } table.heat td.on { outline: 3px solid #0d1f4a; font-weight: 700; font-size: 10pt; }
.ok { color: #1e7a4c; font-weight: 700; } .out { color: #b42318; font-weight: 700; }
.box { display: inline-block; width: 10px; height: 10px; border: 1px solid #1b2433; vertical-align: middle; margin-right: 4px; }
table.sig { margin-top: 22px; break-inside: avoid; } table.sig td { border: none; padding: 0 6px 0 0; vertical-align: bottom; }
table.sig td.k2 { font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #0d1f4a; white-space: nowrap; width: 1%; padding-bottom: 2px; }
table.sig td.ln { border-bottom: 1px solid #1b2433; height: 30px; width: 30%; font-size: 9pt; } table.sig td.ln.d { width: 14%; white-space: nowrap; } table.sig td.gap { width: 4%; }
table.sig td.hint { font-size: 7.5pt; color: #5f6878; padding-top: 3px; } .foot { margin-top: 18px; font-size: 7.5pt; color: #8a93a3; }`;

const band = (org: string, doc: string) => `<table class="band"><tr><td class="band-l"><span class="org">${esc(org)}</span></td>
  <td class="band-r"><span class="kicker">NDPA 2023 · Section 29 · GAID 2025</span><br><span class="doc">${doc}</span></td></tr></table>`;

function heat(impact: number | null, likelihood: number | null, m: Model) {
  const b = m.rating_bands, band = (s: number): Rating => (s <= b[0] ? "Low" : s <= b[1] ? "Medium" : s <= b[2] ? "High" : "Critical");
  return `<table class="heat">${[5, 4, 3, 2, 1].map((l) => `<tr><td class="ax">L${l}</td>${[1, 2, 3, 4, 5].map((i) => `<td class="${i === impact && l === likelihood ? "on" : ""}" style="background:${COLOR[band(i * l)]};${i === impact && l === likelihood ? "" : "opacity:.45"}">${i * l}</td>`).join("")}</tr>`).join("")}
    <tr><td class="ax"></td>${[1, 2, 3, 4, 5].map((i) => `<td class="ax">I${i}</td>`).join("")}</tr></table>`;
}

export function tpraReportHtml(o: TpraReportInput) {
  const m = asModel(o.a.model), A = o.a.answers, r = score(A, m);
  const name = A.vendor || o.a.title;
  const title = `Processor Risk Assessment — ${name}`;
  const conditions = (A.conditions ?? "").split(/\n+/).map((x) => x.replace(/^[-•*\d.)\s]+/, "").trim()).filter(Boolean);
  const body = `
${band(o.org, "Processor Risk Assessment")}
<table class="facts"><tr>
  <td><span class="lbl">Organisation</span><br><b>${esc(o.org)}</b></td>
  <td><span class="lbl">Processor</span><br><b>${esc(name)}</b></td>
  <td><span class="lbl">Hosting</span><br><b>${A.location ? esc(A.location) : "Not recorded"}</b></td>
  <td><span class="lbl">Year</span><br><b>${o.a.assessment_year}</b></td>
  <td><span class="lbl">Date</span><br><b>${fmtDate(todayWAT())}</b></td>
</tr></table>

<table class="result"><tr>
  <td style="width:22%"><span class="lbl">Rating</span><br>${r.rating ? `<span class="badge" style="background:${COLOR[r.rating]}">${r.rating}</span>` : NR}</td>
  <td style="width:18%"><span class="lbl">Residual risk</span><br><span class="big">${r.residual ?? "–"}</span><span class="small"> / 25</span></td>
  <td><span class="lbl">Decision</span><br><b>${esc(r.decision ?? "Not yet decided")}</b><br><span class="small">${r.rating ? esc(REQUIREMENTS[r.rating]) : ""}</span></td>
  <td style="width:20%"><span class="lbl">Next review</span><br><b>${o.a.next_review ? fmtDate(o.a.next_review) : r.rating === "Critical" ? "Before any data is shared" : r.reviewMonths ? `Every ${r.reviewMonths} months` : "On approval"}</b></td>
</tr></table>
${r.knockouts.length ? `<div class="ko"><b>Knock-out.</b> ${r.knockouts.map(esc).join("; ")}. The rating is Critical whatever the score.</div>` : ""}
${r.overridden ? `<p class="small"><b>Rating set by the reviewing consultant</b> (calculated: ${r.knockouts.length ? "Critical" : r.scored}). Reason: ${v(A.override_reason)}</p>` : ""}
${A.narrative ? `<h2>Summary</h2><p>${v(A.narrative)}</p>` : ""}

<h2>1. Processor and service</h2>
<table>
  <tr><td class="k">Processor</td><td>${v(name)}</td><td class="k">Role under the NDPA</td><td>${v(A.role)}</td></tr>
  <tr><td class="k">Service</td><td colspan="3">${v(A.service)}</td></tr>
  <tr><td class="k">Country of hosting</td><td>${v(A.location)}</td><td class="k">Data leaves Nigeria</td><td>${v(A.leaves_nigeria)}</td></tr>
  <tr><td class="k">NDPC DCPMI registration</td><td>${v(A.dcpmi)}</td><td class="k">DPO contact</td><td>${v(A.dpo_contact)}</td></tr>
  <tr><td class="k">Sub-processors</td><td colspan="3">${v(A.subprocessors)}</td></tr>
  <tr><td class="k">Personal data</td><td colspan="3">${v(A.data)}</td></tr>
  <tr><td class="k">Processing activities</td><td colspan="3">${o.ropa.length ? o.ropa.map(esc).join("; ") : NR}</td></tr>
  <tr><td class="k">Business owner</td><td>${v(A.business_owner)}</td><td class="k">Contract</td><td>${v(A.contract)}</td></tr>
</table>

<h2>2. Inherent risk (Impact)</h2>
<table><thead><tr><th style="width:24%">Factor</th><th style="width:8%">Score</th><th>Level</th></tr></thead>
${FACTORS.map((f, i) => `<tr${i % 2 ? ' class="alt"' : ""}><td><b>${f.label}</b></td><td>${r.factors[i] ?? "–"}</td><td>${r.factors[i] ? esc(f.levels[r.factors[i]! - 1]) : NR}</td></tr>`).join("")}
<tr><td><b>Total</b></td><td><b>${r.factorTotal ?? "–"}</b></td><td><b>${r.impact ? `Impact ${r.impact} (${IMPACT_NAMES[r.impact]})` : "Not scored"}</b>${r.floored ? ` <span class="small">raised from ${r.impactRaw}: sensitive or children's data</span>` : ""}</td></tr></table>

<h2>3. Control assessment (Likelihood)</h2>
<table><thead><tr><th style="width:24%">Domain</th><th style="width:8%">Weight</th><th style="width:22%">Score</th><th style="width:9%">Weighted</th><th>Evidence relied on and gaps</th></tr></thead>
${DOMAINS.map((d, i) => `<tr${i % 2 ? ' class="alt"' : ""}><td><b>${d.label}</b><br><span class="small">${esc(d.covers)}</span></td><td>${m.weights[d.key]}%</td><td>${r.domains[i] != null ? esc(SCORE_LABELS[r.domains[i]!]) : NR}</td><td>${r.domains[i] != null ? `${Math.round(m.weights[d.key] * r.domains[i]! / 4 * 10) / 10}%` : "–"}</td><td>${v(A[`dn_${d.key}`])}</td></tr>`).join("")}
<tr><td colspan="3"><b>Control %</b></td><td><b>${r.controlPct ?? "–"}%</b></td><td><b>${r.likelihood ? `Likelihood ${r.likelihood} (${LIKELIHOOD_NAMES[r.likelihood]})` : "Not scored"}</b></td></tr></table>

<h2>4. Residual risk</h2>
<table style="border:none"><tr><td style="border:none;width:40%">${heat(r.impact, r.likelihood, m)}</td>
<td style="border:none;vertical-align:middle"><p><b>${r.residual != null ? `${r.impact} × ${r.likelihood} = ${r.residual}` : "Not yet scored"}</b>${r.scored ? `, rated ${r.scored}` : ""}.</p>
<p class="small">Bands: Low 1–${m.rating_bands[0]}, Medium ${m.rating_bands[0] + 1}–${m.rating_bands[1]}, High ${m.rating_bands[1] + 1}–${m.rating_bands[2]}, Critical ${m.rating_bands[2] + 1}–25. Model ${m.version ? `v${m.version}` : "default"}.</p>
${r.dpiaPrompt ? `<p><b>A DPIA in GAID Schedule 4 format is required</b> before go-live.</p>` : ""}</td></tr></table>

<h2>5. Evidence</h2>
<table><thead><tr><th style="width:4%">#</th><th style="width:36%">Document</th><th style="width:16%">Domain</th><th style="width:14%">Status</th><th>Files, verdict, expiry</th></tr></thead>
${o.ev.filter((e) => e.needed || e.status === "received").map((e, i) => `<tr${i % 2 ? ' class="alt"' : ""}><td>${i + 1}</td><td><b>${esc(e.name)}</b></td><td>${esc(DOMAINS.find((d) => d.key === e.domain)?.label ?? "All domains")}</td>
  <td>${e.status === "received" ? `<span class="ok">Received</span>` : e.status === "not_applicable" ? "Not applicable" : `<span class="out">Outstanding</span>`}</td>
  <td class="small">${e.files.map((f) => esc(f.original_name)).join("<br>")}${e.verdict ? `<br>Verdict: ${e.verdict === "accepted" ? "Accepted" : "Insufficient"}` : ""}${e.expires_on ? `<br>${e.expired ? `<span class="out">Expired ${fmtDate(e.expires_on)}</span>` : `Expires ${fmtDate(e.expires_on)}`}` : ""}</td></tr>`).join("")}</table>

<h2>6. Treatment</h2>
<table><tr><td class="k">Data processing agreement</td><td>${v(A.dpa_status || "Not started")}</td></tr></table>
<table><thead><tr><th>DPA clause (NDPA s.29)</th><th style="width:16%">In the DPA</th></tr></thead>
${DPA_CLAUSES.map((c, i) => `<tr${i % 2 ? ' class="alt"' : ""}><td>${c.key === "breach" ? `Breach notice to the controller within ${esc(A.breach_hours || m.breach_hours)} hours` : esc(c.label)}${c.enhanced && (r.rating === "High" || r.rating === "Critical") ? ` <span class="small">(required at ${r.rating})</span>` : ""}</td><td>${A[`dpa_${c.key}`] ? `<span class="ok">Yes</span>` : `<span class="out">No</span>`}</td></tr>`).join("")}</table>
<p><b>Conditions of approval</b></p>
${conditions.length ? `<ul>${conditions.map((c) => `<li><span class="box"></span> ${esc(c)}</li>`).join("")}</ul>` : `<p class="small">None recorded.</p>`}
${o.tasks.length ? `<table><thead><tr><th>Gap</th><th>Action</th><th style="width:16%">Owner</th><th style="width:13%">Deadline</th><th style="width:11%">Status</th></tr></thead>
${o.tasks.map((t, i) => `<tr${i % 2 ? ' class="alt"' : ""}><td>${esc(t.gap)}</td><td>${v(t.action)}</td><td>${v(t.owner)}</td><td>${t.deadline ? fmtDate(t.deadline) : NR}</td><td>${t.status === "done" ? "Done" : t.status === "in_progress" ? "In progress" : "Open"}</td></tr>`).join("")}</table>` : ""}

<h2>7. Sign-off</h2>
<table class="sig"><tr>
  <td class="k2">Lead Consultant</td><td class="ln">${o.a.status === "approved" && o.a.approver ? esc(o.a.approver) : ""}</td><td class="k2">Date</td><td class="ln d">${o.a.status === "approved" ? day(o.a.approved_at) : ""}</td><td class="gap"></td>
  <td class="k2">Client</td><td class="ln">${o.a.client_signed_name ? esc(o.a.client_signed_name) : ""}</td><td class="k2">Date</td><td class="ln d">${day(o.a.client_signed_at)}</td>
</tr><tr><td></td><td class="hint">Approved in DPO Copilot</td><td></td><td></td><td class="gap"></td><td></td><td class="hint">${o.a.client_signed_name ? "Signed in the portal: typed name and email code" : "Name, designation and signature"}</td><td></td><td></td></tr></table>

${o.a.history?.length ? `<h2>8. Review and reassessment log</h2><table><thead><tr><th style="width:18%">Date</th><th>Event</th><th style="width:22%">By</th></tr></thead>
${o.a.history.map((h, i) => `<tr${i % 2 ? ' class="alt"' : ""}><td>${day(h.at)}</td><td>${esc(h.what)}</td><td>${esc(h.by)}</td></tr>`).join("")}</table>` : ""}
<p class="foot">Generated ${fmtDate(todayWAT())} by ${esc(o.by)} with DPO Copilot. A practical scoring model, not a format prescribed by the NDPC; it supports, and does not replace, professional judgement.</p>`;
  return { title: `${o.org} - ${title}`, body, css: BASE(`${o.org} · ${title}`) + STYLE };
}

/** Why each evidence item is requested. */
const WHY: Record<string, string> = {
  "Completed due diligence or security questionnaire": "Your processor's own answers on how it protects personal data across every control area.",
  "NDPC DCPMI registration and latest Compliance Audit Return": "Shows the processor is registered with the NDPC where it qualifies as a Data Controller or Processor of Major Importance, and files its audit.",
  "DPO designation and contact details": "Who is accountable for data protection at the processor, and how to reach them.",
  "Privacy policy and data protection policy": "The processor's commitments on how it handles personal data.",
  "Sub-processor list with locations": "Who else receives your data, and in which countries.",
  "Information security policy; ISO 27001 or SOC 2 if held": "The security controls in place, and any independent certification.",
  "Incident and breach response plan, including notification procedure": "How quickly the processor detects incidents and tells you, so you can meet the NDPC's 72-hour deadline.",
  "Data retention and deletion or return policy": "How long data is kept and how it is deleted or returned when the contract ends.",
  "Cross-border transfer mechanism": "The lawful basis for any transfer of personal data outside Nigeria (NDPA ss.41–43).",
  "Business continuity and disaster recovery plan": "How the service and your data survive an outage or disaster.",
  "Penetration test or vulnerability assessment summary from the last 12 months": "Independent testing of the processor's security.",
  "Staff data protection training records": "Evidence that staff who handle your data are trained.",
};

export function tpraRequestHtml(o: { org: string; by: string; answers: Record<string, string>; model: unknown; ev: Ev; year: number }) {
  const m = asModel(o.model), r = score(o.answers, m), name = o.answers.vendor || "the processor";
  const need = o.ev.filter((e) => e.needed);
  const title = `Processor Evidence Request — ${name}`;
  const body = `
${band(o.org, "Processor Evidence Request")}
<table class="facts"><tr>
  <td><span class="lbl">Organisation</span><br><b>${esc(o.org)}</b></td>
  <td><span class="lbl">Processor</span><br><b>${esc(name)}</b></td>
  <td><span class="lbl">Service</span><br><b>${o.answers.service ? esc(o.answers.service) : "To be confirmed"}</b></td>
  <td><span class="lbl">Date</span><br><b>${fmtDate(todayWAT())}</b></td>
</tr></table>

<h2>1. Purpose of this request</h2>
<p>${esc(o.org)} uses ${esc(name)} to process personal data on its behalf. Before personal data is shared, and at each review, ${esc(o.org)} must be satisfied that the processor gives adequate guarantees of compliance. This request lists the documents needed to assess ${esc(name)}. Please obtain them from the processor and upload them in the compliance portal under <b>Processors</b>.</p>

<h2>2. The legal requirement</h2>
<div class="law">
  <p class="cite">Nigeria Data Protection Act, 2023 — Section 29 (summary)</p>
  <p>A data controller may engage only a data processor that gives adequate guarantees of compliance with the Act, under a written contract. The processor must:</p>
  <ul><li>process personal data only on the controller's instructions;</li><li>keep the data confidential;</li><li>implement appropriate technical and organisational measures to secure it;</li>
  <li>engage another processor only with the controller's authorisation, on the same terms; and</li><li>assist the controller to meet its obligations, including on data subject rights and breaches.</li></ul>
  <p class="small">The GAID 2025 requires vendor and processor contracts to comply with the Act and expects higher due diligence and ongoing oversight of processors.</p>
</div>

<h2>3. Documents required</h2>
<p>${r.impact ? `The processing has been rated <b>Impact ${r.impact} (${IMPACT_NAMES[r.impact]})</b>, so the ${r.impact <= 2 ? "core" : r.impact === 3 ? "core and security" : "full"} checklist applies: ` : "Inherent risk has not been scored yet, so the core checklist applies: "}<b>${need.length} documents</b>. Where a document does not exist, say so.</p>
<table><thead><tr><th style="width:4%">S/N</th><th style="width:30%">Document</th><th>Why it is needed</th><th style="width:16%">Status</th></tr></thead>
${need.map((e, i) => `<tr${i % 2 ? ' class="alt"' : ""}><td>${i + 1}</td><td><b>${esc(e.name)}</b></td><td>${esc(WHY[e.name] ?? "")}</td>
  <td>${e.status === "received" ? `<span class="ok">Received</span>` : e.status === "not_applicable" ? "Not applicable" : `<span class="out">Outstanding</span>`}${e.expired ? `<br><span class="out">Expired</span>` : ""}</td></tr>`).join("")}</table>

<h2>4. Next steps</h2>
<p>Once the documents are in, each control area is scored against the evidence and the processor is given a risk rating (Low, Medium, High or Critical) with a decision and any conditions. You will be asked to sign off the decision in the portal. Personal data should not be shared with ${esc(name)} until the assessment is approved.</p>

<table class="sig"><tr>
  <td class="k2">Received by</td><td class="ln"></td><td class="k2">Date</td><td class="ln d"></td><td class="gap"></td>
  <td class="k2">Documents due by</td><td class="ln d"></td>
</tr><tr><td></td><td class="hint">Name, designation and signature</td><td></td><td></td><td class="gap"></td><td></td><td></td></tr></table>
<p class="foot">Generated ${fmtDate(todayWAT())} by ${esc(o.by)} with DPO Copilot.</p>`;
  return { title: `${o.org} - ${title}`, body, css: BASE(`${o.org} · ${title}`) + STYLE };
}
