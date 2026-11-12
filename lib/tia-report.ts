// Transfer risk documents: the Cross-Border Data Transfer Risk Assessment report (in the guide's output order: summary,
// document gaps, Schedule 5 country assessment, risk profile, overall ratings, mitigation plan, CAR disclosure, items to
// verify, then sign-off and the review log), and the Transfer Readiness Document listing the documents to provide.
// Same house style as the other assessment documents: the client's name on the band, no DPCO branding.
import { CSS as BASE } from "./car-report";
import { fmtDate, todayWAT } from "./rules";
import { assess, CATEGORIES, SCHEDULE5, DOC_GROUPS, DOCS, RATINGS, RATING_COLOR, ACTION, MEANING, mechanismLabel, carDisclosure, type Rating } from "./tia-model";
import type { DocState, Task, TiaCopilot } from "./tia";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const day = (d: unknown) => (d ? fmtDate(new Date(d as string).toISOString().slice(0, 10)) : "");
const NR = `<span class="nr">Not provided</span>`;
const v = (s: unknown) => (String(s ?? "").trim() ? esc(s).replace(/\n/g, "<br>") : NR);
const badge = (r: Rating | null | string) => (r && RATINGS.includes(r as Rating) ? `<span class="badge" style="background:${RATING_COLOR[r as Rating]}">${r}</span>` : NR);
const CONCERN: Record<string, string> = { Low: "#1e7a4c", Medium: "#b7791f", High: "#c2410c" };

const STYLE = `
thead { display: table-header-group; } h2 { break-after: avoid; } tr { break-inside: avoid; }
table.band { margin: 0 0 14px; } table.band td { border: none; background: #0d1f4a; color: #fff; padding: 14px 16px; vertical-align: middle; }
.band-l .org { font-size: 14pt; font-weight: 700; color: #fff; } .band-r { text-align: right; width: 52%; }
.kicker { font-size: 8pt; letter-spacing: .08em; text-transform: uppercase; color: #9fc0ee; } .doc { font-size: 17pt; font-weight: 700; color: #fff; }
table.facts td { border: none; border-bottom: 2px solid #e3e8f0; padding: 6px 10px 8px 0; vertical-align: top; }
.lbl { font-size: 7.5pt; text-transform: uppercase; letter-spacing: .06em; color: #5f6878; font-weight: 600; }
.small { font-size: 8.5pt; color: #5f6878; } tr.alt td { background: #f7f9fc; } .nr { color: #9aa3b2; font-style: italic; }
.law { border-left: 5px solid #2a6aa8; background: #f2f6fc; padding: 12px 16px; margin: 8px 0 10px; } .law p { margin: 0 0 6px; } .law .cite { font-size: 9pt; font-weight: 700; color: #2a6aa8; }
table.result td { border: none; vertical-align: middle; padding: 10px 14px; } table.result { margin: 6px 0 12px; border: 1px solid #e3e8f0; }
.badge { display: inline-block; color: #fff; font-weight: 700; padding: 4px 10px; border-radius: 4px; font-size: 10pt; }
.big .badge { font-size: 13pt; padding: 6px 14px; }
.flag { border-left: 5px solid #b7791f; background: #fdf6e7; padding: 8px 12px; margin: 6px 0; color: #5c3d07; font-size: 9pt; }
.ko { border-left: 5px solid #b42318; background: #fdecea; padding: 10px 14px; margin: 8px 0; color: #7a1a12; }
.ok { color: #1e7a4c; font-weight: 700; } .out { color: #b42318; font-weight: 700; }
.dot { display: inline-block; width: 9px; height: 9px; border-radius: 2px; margin-right: 5px; vertical-align: middle; }
.box { display: inline-block; width: 10px; height: 10px; border: 1px solid #1b2433; vertical-align: middle; margin-right: 4px; }
table.sig { margin-top: 22px; break-inside: avoid; } table.sig td { border: none; padding: 0 6px 0 0; vertical-align: bottom; }
table.sig td.k2 { font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #0d1f4a; white-space: nowrap; width: 1%; padding-bottom: 2px; }
table.sig td.ln { border-bottom: 1px solid #1b2433; height: 30px; width: 30%; font-size: 9pt; } table.sig td.ln.d { width: 14%; white-space: nowrap; } table.sig td.gap { width: 4%; }
table.sig td.hint { font-size: 7.5pt; color: #5f6878; padding-top: 3px; } .foot { margin-top: 18px; font-size: 7.5pt; color: #8a93a3; }`;

const band = (org: string, doc: string) => `<table class="band"><tr><td class="band-l"><span class="org">${esc(org)}</span></td>
  <td class="band-r"><span class="kicker">NDPA 2023 · Part VIII · GAID 2025 Art. 45 and Schedule 5</span><br><span class="doc">${doc}</span></td></tr></table>`;

export type TiaReportInput = {
  org: string; by: string;
  a: { title: string; assessment_year: number; status: string; answers: Record<string, string>; next_review: string | null; approver: string | null; approved_at: unknown;
    client_signed_name: string | null; client_signed_at: unknown; history: { at: string; by: string; what: string }[] };
  docs: DocState; tasks: Task[]; ropa: string[];
};

export function tiaReportHtml(o: TiaReportInput) {
  const A = o.a.answers, r = assess(A);
  let cp: TiaCopilot | null = null;
  try { cp = JSON.parse(A.copilot || "null"); } catch { /* none */ }
  const name = A.recipient || o.a.title;
  const title = `Cross-Border Data Transfer Risk Assessment — ${name}${A.destination ? ` (${A.destination})` : ""}`;
  const car = carDisclosure([{ answers: A, status: o.a.status }]);
  const needed = o.docs.filter((d) => d.needed || d.status === "received");
  const verify = cp?.verify ?? [];
  const body = `
${band(o.org, "Cross-Border Transfer Risk Assessment")}
<table class="facts"><tr>
  <td><span class="lbl">Organisation</span><br><b>${esc(o.org)}</b></td>
  <td><span class="lbl">Recipient</span><br><b>${esc(name)}</b></td>
  <td><span class="lbl">Destination</span><br><b>${A.destination ? esc(A.destination) : "Not provided"}</b></td>
  <td><span class="lbl">Year</span><br><b>${o.a.assessment_year}</b></td>
  <td><span class="lbl">Date</span><br><b>${fmtDate(todayWAT())}</b></td>
</tr></table>

<table class="result"><tr>
  <td class="big" style="width:18%"><span class="lbl">Inherent risk</span><br>${badge(r.rating)}</td>
  <td class="big" style="width:18%"><span class="lbl">Residual risk</span><br>${badge(r.residualRating)}</td>
  <td><span class="lbl">Recommended action</span><br><b>${esc(r.action ?? "Not yet rated")}</b>${r.rating ? `<br><span class="small">${esc(MEANING[r.rating])}.</span>` : ""}</td>
  <td style="width:20%"><span class="lbl">Next review</span><br><b>${o.a.next_review ? fmtDate(o.a.next_review) : r.reviewMonths ? `Every ${r.reviewMonths} months` : "On approval"}</b></td>
</tr></table>
${r.knockout ? `<div class="ko"><b>Knock-out.</b> ${esc(r.knockout)}. The rating is Critical: the transfer must not continue until a basis is in place.</div>` : ""}
${r.overridden ? `<p class="small"><b>Inherent rating set by the reviewing consultant</b> (calculated: ${esc(r.inherentOverall ?? "not rated")}). Reason: ${v(A.override_reason)}</p>` : ""}

<h2>1. Transfer summary</h2>
<p>${v(A.narrative || cp?.summary)}</p>
<table>
  <tr><td class="k">Recipient and role</td><td>${v(name)}${A.recipient_role ? ` (${esc(A.recipient_role)})` : ""}</td><td class="k">Destination</td><td>${v(A.destination)}</td></tr>
  <tr><td class="k">Personal data</td><td colspan="3">${v(A.data)} · <b>${r.sensitive ? esc(A.sensitive) : "No sensitive personal data"}</b></td></tr>
  <tr><td class="k">Purpose</td><td colspan="3">${v(A.purpose)}</td></tr>
  <tr><td class="k">Data subjects</td><td>${v(A.subjects_count)}</td><td class="k">Frequency</td><td>${v(A.frequency)}</td></tr>
  <tr><td class="k">Systems and platforms</td><td colspan="3">${v(A.systems)}</td></tr>
  <tr><td class="k">Sub-processors</td><td colspan="3">${v(A.subprocessors)}</td></tr>
  <tr><td class="k">Transfer mechanism</td><td colspan="3">${v(mechanismLabel(A.mechanism))}${A.mechanism_notes ? `<br><span class="small">${v(A.mechanism_notes)}</span>` : ""}</td></tr>
  <tr><td class="k">NDPC adequacy decision</td><td>${v(A.adequacy_decision)}</td><td class="k">Explicit consent obtained</td><td>${v(A.consent_obtained)}</td></tr>
  <tr><td class="k">Processing activities</td><td colspan="3">${o.ropa.length ? o.ropa.map(esc).join("; ") : NR}</td></tr>
  <tr><td class="k">Business owner</td><td colspan="3">${v(A.business_owner)}</td></tr>
</table>
${r.flags.filter((f) => !r.knockout || !f.startsWith(r.knockout)).map((f) => `<div class="flag">${esc(f)}</div>`).join("")}

<h2>2. Document gap list</h2>
<table><thead><tr><th style="width:4%">#</th><th>Document</th><th style="width:14%">Status</th><th style="width:30%">Note</th></tr></thead>
${(Object.keys(DOC_GROUPS) as (keyof typeof DOC_GROUPS)[]).map((g) => {
  const rows = needed.filter((d) => d.group === g);
  return rows.length ? `<tr><td colspan="4" style="background:#eef2f8"><b>${g}. ${esc(DOC_GROUPS[g])}</b></td></tr>` + rows.map((d, n) => `<tr><td>${g}${n + 1}</td><td>${esc(d.name)}</td>
  <td>${d.status === "received" ? `<span class="ok">Received</span>` : d.status === "not_applicable" ? "Not applicable" : `<span class="out">Missing</span>`}</td><td class="small">${d.files.map((f) => esc(f.original_name)).join("<br>")}</td></tr>`).join("") : "";
}).join("")}</table>

<h2>3. Schedule 5 country assessment</h2>
<table><thead><tr><th style="width:22%">Factor</th><th>Finding</th><th style="width:14%">Concern</th></tr></thead>
${SCHEDULE5.map((f, i) => `<tr${i % 2 ? ' class="alt"' : ""}><td><b>${esc(f.label)}</b><br><span class="small">${esc(f.question)}</span></td><td>${v(A[`s5n_${f.key}`])}</td>
  <td>${A[`s5_${f.key}`] ? `<span class="dot" style="background:${CONCERN[A[`s5_${f.key}`]]}"></span>${esc(A[`s5_${f.key}`])}` : NR}</td></tr>`).join("")}</table>

<h2>4. Risk profile</h2>
<table><thead><tr><th style="width:26%">Category</th><th style="width:12%">Inherent</th><th style="width:12%">Residual</th><th>Reason</th></tr></thead>
${CATEGORIES.map((c, i) => `<tr${i % 2 ? ' class="alt"' : ""}><td><b>${i + 1}. ${esc(c.label)}</b><br><span class="small">${esc(c.assesses)}</span></td><td>${badge(r.inherent[i])}</td><td>${badge(r.residual[i])}</td><td>${v(A[`cn_${c.key}`])}</td></tr>`).join("")}</table>
<p class="small">Ratings are organisational risk ratings, not legal determinations or official NDPC country ratings. The overall rating is the highest category rating.</p>

<h2>5. Overall inherent and residual risk</h2>
<table><thead><tr><th style="width:14%">Rating</th><th>Meaning</th><th>Recommended action</th></tr></thead>
${RATINGS.map((x) => `<tr${x === r.rating ? ' style="font-weight:700;background:#eef2f8"' : ""}><td>${badge(x)}</td><td>${MEANING[x]}</td><td>${ACTION[x]}${x === r.rating ? " ← inherent" : ""}${x === r.residualRating ? " ← residual" : ""}</td></tr>`).join("")}</table>
${r.dpiaPrompt ? `<p><b>A DPIA in GAID Schedule 4 format is required</b> for this transfer.</p>` : ""}

<h2>6. Mitigation plan</h2>
${o.tasks.length ? `<table><thead><tr><th>Action</th><th style="width:22%">Risk addressed</th><th style="width:14%">Owner</th><th style="width:9%">Priority</th><th style="width:12%">Deadline</th><th style="width:10%">Status</th></tr></thead>
${o.tasks.map((t, i) => `<tr${i % 2 ? ' class="alt"' : ""}><td>${v(t.action)}</td><td>${esc(t.gap)}</td><td>${v(t.owner)}</td><td>${esc(t.priority ?? "Medium")}</td><td>${t.deadline ? fmtDate(t.deadline) : NR}</td><td>${t.status === "done" ? "Done" : t.status === "in_progress" ? "In progress" : "Open"}</td></tr>`).join("")}</table>` : `<p class="small">No measures recorded.</p>`}

<h2>7. CAR disclosure summary</h2>
<p class="small">What ${esc(o.org)} discloses for this transfer in the Compliance Audit Return (GAID Schedule 2).</p>
<table>
  <tr><td class="k">Transfers personal data outside Nigeria</td><td>${car.transfers ? "Yes" : "Not recorded"}</td></tr>
  <tr><td class="k">Categories transferred</td><td>${v(A.data)} (${r.sensitive ? "sensitive" : "non-sensitive"})</td></tr>
  <tr><td class="k">Legal ground</td><td>${v(mechanismLabel(A.mechanism))}</td></tr>
  <tr><td class="k">Documented and assessed</td><td>${o.a.status === "approved" ? "Yes: this assessment, approved" : "Assessment in progress"}</td></tr>
  <tr><td class="k">Receiving countries</td><td>${v(car.countries.join(", "))}</td></tr>
</table>

<h2>8. Items to verify</h2>
${(() => {
  const missing = needed.filter((d) => d.status === "outstanding").map((d) => d.name);
  const items = [...(missing.length ? [`Documents not yet provided: ${missing.join("; ")}`] : []), ...r.flags, ...verify];
  return items.length ? `<ul>${[...new Set(items)].map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : `<p class="small">None.</p>`;
})()}
${A.residual_acceptance ? `<p><b>Residual risk accepted:</b> ${v(A.residual_acceptance)}</p>` : ""}

<h2>9. Sign-off</h2>
<table class="sig"><tr>
  <td class="k2">Lead Consultant</td><td class="ln">${o.a.status === "approved" && o.a.approver ? esc(o.a.approver) : ""}</td><td class="k2">Date</td><td class="ln d">${o.a.status === "approved" ? day(o.a.approved_at) : ""}</td><td class="gap"></td>
  <td class="k2">Management</td><td class="ln">${o.a.client_signed_name ? esc(o.a.client_signed_name) : ""}</td><td class="k2">Date</td><td class="ln d">${day(o.a.client_signed_at)}</td>
</tr><tr><td></td><td class="hint">Approved in DPO Copilot</td><td></td><td></td><td class="gap"></td><td></td><td class="hint">${o.a.client_signed_name ? "Residual risk approved in the portal: typed name and email code" : "Approval of residual risk: name, designation and signature"}</td><td></td><td></td></tr></table>

${o.a.history?.length ? `<h2>10. Review log</h2><table><thead><tr><th style="width:18%">Date</th><th>Event</th><th style="width:22%">By</th></tr></thead>
${o.a.history.map((h, i) => `<tr${i % 2 ? ' class="alt"' : ""}><td>${day(h.at)}</td><td>${esc(h.what)}</td><td>${esc(h.by)}</td></tr>`).join("")}</table>` : ""}
<p class="foot">Generated ${fmtDate(todayWAT())} by ${esc(o.by)} with DPO Copilot. Ratings are organisational risk ratings to support professional judgement, not legal determinations or official NDPC country ratings. Check GAID references against the official text before relying on them.</p>`;
  return { title: `${o.org} - ${title}`, body, css: BASE(`${o.org} · ${title}`) + STYLE };
}

/** Transfer Readiness Document: the documents to provide, in groups A–D; with an assessment, its status per item. */
export function tiaRequestHtml(o: { org: string; by: string; answers?: Record<string, string>; docs?: DocState; countries?: string[] }) {
  const A = o.answers;
  const subject = A ? [A.recipient, A.destination].filter(Boolean).join(", ") : "";
  const title = `Transfer Readiness Document${subject ? ` — ${subject}` : ""}`;
  const items = o.docs ?? DOCS.map((d, i) => ({ ...d, i, needed: true, status: "", files: [] as { original_name: string }[] }));
  const known = !!o.docs;
  const need = items.filter((d) => d.needed);
  const got = known ? need.filter((d) => d.status === "received").length : 0;
  const body = `
${band(o.org, "Transfer Readiness Document")}
<table class="facts"><tr>
  <td><span class="lbl">Organisation</span><br><b>${esc(o.org)}</b></td>
  <td><span class="lbl">Transfer</span><br><b>${subject ? esc(subject) : "All transfers outside Nigeria"}</b></td>
  ${!A && o.countries?.length ? `<td><span class="lbl">Countries recorded</span><br><b>${esc(o.countries.join(", "))}</b></td>` : ""}
  <td><span class="lbl">Date</span><br><b>${fmtDate(todayWAT())}</b></td>
</tr></table>

<h2>1. Purpose of this document</h2>
<p>A cross-border data transfer risk assessment tests whether personal data leaving Nigeria stays protected to the standard the Nigeria Data Protection Act (NDPA) 2023 requires, across privacy, security, legal and operational risk, before and after the transfer. It is not a check on whether a country has a data protection law: it evaluates the actual protection the data receives throughout the transfer and all later processing. This document lists what ${esc(o.org)} should provide${subject ? ` for <b>${esc(subject)}</b>` : " for each transfer"} so that the assessment can be carried out and the transfers disclosed in the Compliance Audit Return.</p>

<h2>2. The legal framework</h2>
<div class="law">
  <p class="cite">NDPA 2023 Part VIII (sections 41–43) · GAID 2025 Article 45 · GAID Schedule 5 (Guidance on Cross-border Data Transfer)</p>
  <p>Personal data may be transferred outside Nigeria where the recipient is subject to a law, binding corporate rules, contractual clauses, a code of conduct or a certification mechanism that affords an adequate level of protection (section 41). Where protection is not adequate, a transfer may take place only on a basis in section 43, such as the data subject's consent after being informed of the risks. The GAID sets out how adequacy is assessed (Schedule 5), and the Compliance Audit Return (Schedule 2) asks whether transfers take place, the categories of data, the legal grounds, whether the transfers are documented and assessed, and the receiving countries.</p>
  <p class="small">The NDPC has not yet issued a regulatory Cross-Border Data Transfer Instrument (CBDTI), so Standard Contractual Clauses or Binding Corporate Rules do not automatically count as an approved mechanism.</p>
</div>

<h2>3. The assessment establishes</h2>
<ul>
  <li>Whether the destination country provides adequate data protection.</li>
  <li>Whether the foreign recipient has sufficient privacy and security safeguards.</li>
  <li>Whether the transfer exposes data subjects to privacy violations.</li>
  <li>Whether the transfer complies with the NDPA and NDPC requirements.</li>
  <li>Whether additional safeguards are needed before the transfer takes place.</li>
</ul>

<h2>4. Documents required</h2>
${known ? `<p><b>${got} of ${need.length}</b> documents received so far. Please provide the outstanding documents; where one does not exist, say so.</p>` : `<p>Please provide the following documents, ticking each as it is provided. Items marked <i>where used</i>, <i>where applicable</i> or <i>where required</i> are needed only if they apply. Where a document does not exist, say so; we will help prepare it.</p>`}
${(Object.keys(DOC_GROUPS) as (keyof typeof DOC_GROUPS)[]).map((g) => {
  const rows = need.filter((d) => d.group === g);
  return rows.length ? `<h3 style="margin:14px 0 6px">${g}. ${esc(DOC_GROUPS[g])}</h3><table><thead><tr><th style="width:6%">S/N</th><th>Document</th><th style="width:20%">Status</th></tr></thead>
${rows.map((d, i) => `<tr${i % 2 ? ' class="alt"' : ""}><td>${g}${i + 1}</td><td><b>${esc(d.name)}</b></td><td>${!known ? `<span class="box"></span> Provided` : d.status === "received" ? `<span class="ok">Received</span>` : d.status === "not_applicable" ? "Not applicable" : `<span class="out">Outstanding</span>`}</td></tr>`).join("")}</table>` : "";
}).join("")}

<h2>5. Next steps</h2>
<p>Once the documents are in, each transfer is tested against the GAID Schedule 5 factors and rated on eight risk categories (regulatory and legal; government access; cybersecurity; third-party and onward transfer; data subject rights and redress; political, human rights and stability; availability and continuity; reputational and financial), before and after mitigation. ${esc(o.org)}'s management will be asked to approve the residual risk in the compliance portal under <b>Transfers</b>.</p>

<table class="sig"><tr>
  <td class="k2">Received by</td><td class="ln"></td><td class="k2">Date</td><td class="ln d"></td><td class="gap"></td>
  <td class="k2">Documents due by</td><td class="ln d"></td>
</tr><tr><td></td><td class="hint">Name, designation and signature</td><td></td><td></td><td class="gap"></td><td></td><td></td></tr></table>
<p class="foot">Generated ${fmtDate(todayWAT())} by ${esc(o.by)} with DPO Copilot.</p>`;
  return { title: `${o.org} - ${title}`, body, css: BASE(`${o.org} · ${title}`) + STYLE };
}
