// DPIA Readiness Document: sent to the client before a DPIA. It sets out section 28(4) of the NDPA 2023 (what a DPIA
// must contain) and lists the documents the client must provide, with each one's status when the DPIA already exists.
import { CSS as BASE } from "./car-report";
import { fmtDate, todayWAT } from "./rules";
import { DPIA_DOCS } from "./dpia-draft";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Section 28 of the Nigeria Data Protection Act 2023, as enacted. */
export const S28 = {
  s1: "Where the processing of personal data may likely result in high risk to the rights and freedoms of a data subject by virtue of its nature, scope, context, and purposes, a data controller shall, prior to the processing, carry out a data privacy impact assessment.",
  s2: "The data controller shall consult the Commission prior to the processing if, notwithstanding the measures envisaged under this section, the data protection impact assessment indicates that the processing of the data would result in a high risk to the rights and freedoms of a data subject.",
  s4: "For purposes of this section, a “data privacy impact assessment” is a process designed to identify the risks and impact of the envisaged processing of personal data, and it comprises—",
  s4items: [
    ["a", "a systematic description of the envisaged processing and its purpose, including the legitimate interest pursued by the data controller, data processor, or third party;"],
    ["b", "an assessment of the necessity and proportionality of the processing in relation to the purposes for which the personal data would be processed;"],
    ["c", "an assessment of the risks to the rights and freedoms of a data subject; and"],
    ["d", "the measures envisaged to address the risks, safeguards, security measures and mechanisms to ensure the protection of personal data, taking into account the rights and legitimate interests of a data subject and other persons concerned."],
  ] as const,
};

/** What each required document should show, and which part of s.28(4) it evidences. */
const WHY: Record<string, [string, string]> = {
  "System Architecture Diagram": ["Components of the system, servers, applications, networks and how they connect.", "(a)"],
  "Data Flow Diagram": ["How personal data is collected, where it moves, who receives it and where it is stored, including any transfer outside Nigeria.", "(a), (c)"],
  "Database Design / Schema": ["Tables and fields holding personal data, showing exactly what is collected.", "(a), (b)"],
  "System Requirements Specification": ["What the system does and why each item of personal data is needed.", "(a), (b)"],
  "User Access and Role Matrix": ["Who can view, change, export or delete personal data, by role.", "(c), (d)"],
  "Information Security Policy": ["The organisation's security rules and controls that apply to the system.", "(d)"],
  "Data Retention and Disposal Policy": ["How long each category of personal data is kept and how it is securely deleted.", "(b), (d)"],
  "Encryption and Backup Documentation": ["Encryption at rest and in transit, key management, backup frequency, and recovery testing.", "(d)"],
  "API and Third-Party Integration Documentation": ["External services and processors the system shares data with, and the contracts in place.", "(a), (c)"],
  "Incident and Breach Management Procedures": ["How incidents are detected, escalated and reported to the NDPC within 72 hours.", "(d)"],
  "Privacy Policy and Consent Mechanism": ["The notice shown to data subjects and how consent is collected, recorded and withdrawn.", "(a), (d)"],
  "Hosting and Cloud Infrastructure Documentation": ["Where the system is hosted (provider, region or country) and the safeguards for any hosting outside Nigeria.", "(c), (d)"],
};

export type ReadinessInput = {
  org: string; dpia?: { title: string; system?: string | null; department?: string | null; year?: number };
  received?: Map<string, string[]>; // document type → uploaded file names
};

export function dpiaReadinessHtml(o: ReadinessInput) {
  const system = o.dpia?.system || o.dpia?.title;
  const named = o.dpia?.title && o.dpia.title !== system ? o.dpia.title : null; // a DPIA title shown beside the system
  const title = `DPIA Readiness Document${system ? ` — ${system}` : ""}`;
  const got = (d: string) => o.received?.get(d) ?? [];
  const known = !!o.received;
  const count = known ? DPIA_DOCS.filter((d) => got(d).length).length : 0;

  const body = `
<table class="band"><tr>
  <td class="band-l"><span class="org">${esc(o.org)}</span></td>
  <td class="band-r"><span class="kicker">NDPA 2023 · Section 28</span><br><span class="doc">DPIA Readiness Document</span></td>
</tr></table>

<table class="facts"><tr>
  <td><span class="lbl">Organisation</span><br><b>${esc(o.org)}</b></td>
  ${named ? `<td><span class="lbl">Title</span><br><b>${esc(named)}</b></td>` : ""}
  <td><span class="lbl">System</span><br><b>${system ? esc(system) : "To be confirmed"}</b></td>
  ${o.dpia?.department ? `<td><span class="lbl">Department</span><br><b>${esc(o.dpia.department)}</b></td>` : ""}
  <td><span class="lbl">Date</span><br><b>${fmtDate(todayWAT())}</b></td>
</tr></table>

<h2>1. Purpose of this document</h2>
<p>A Data Privacy Impact Assessment (DPIA) is required before processing personal data that is likely to result in high risk to data subjects. This document explains what the law requires a DPIA to contain and lists the documents ${esc(o.org)} should provide${system ? ` for <b>${esc(system)}</b>` : ""}${o.dpia?.department ? ` (${esc(o.dpia.department)})` : ""} so that the assessment can be carried out completely and on time.</p>

<h2>2. The legal requirement: section 28(4) of the NDPA 2023</h2>
<div class="law">
  <p class="cite">Nigeria Data Protection Act, 2023 — Section 28(4)</p>
  <p>${S28.s4}</p>
  ${S28.s4items.map(([k, t]) => `<p class="item"><b>(${k})</b> ${t}</p>`).join("")}
</div>
<p class="small"><b>Related provisions.</b> Section 28(1): ${S28.s1} Section 28(2): ${S28.s2}</p>

<h2>3. What this means for ${esc(o.org)}</h2>
<table class="map">
  <thead><tr><th style="width:9%">s.28(4)</th><th style="width:36%">The DPIA must contain</th><th>What we need from you</th></tr></thead>
  <tr><td>(a)</td><td>A systematic description of the processing and its purpose, including any legitimate interest pursued</td><td>How the system works, what personal data it handles, where it flows and why: architecture and data flow diagrams, database design, requirements specification, integrations and the privacy notice.</td></tr>
  <tr><td>(b)</td><td>Necessity and proportionality of the processing</td><td>Why each item of personal data is needed and how long it is kept: database design, requirements specification and the retention and disposal policy.</td></tr>
  <tr><td>(c)</td><td>Risks to the rights and freedoms of data subjects</td><td>Who can access the data, who it is shared with and where it is hosted: role matrix, integration documentation, data flow and hosting documentation.</td></tr>
  <tr><td>(d)</td><td>Measures, safeguards, security measures and mechanisms to address the risks</td><td>The controls already in place: information security policy, encryption and backup documentation, incident and breach procedures, consent mechanism and retention policy.</td></tr>
</table>

<h2>4. Required documents</h2>
${known ? `<p><b>${count} of ${DPIA_DOCS.length}</b> documents received so far. Please provide the outstanding documents.</p>` : `<p>Please provide the following ${DPIA_DOCS.length} documents. Where a document does not exist, say so; we will help prepare it.</p>`}
<table class="docs">
  <thead><tr><th style="width:4%">S/N</th><th style="width:24%">Document</th><th>What it should show</th><th style="width:9%">s.28(4)</th><th style="width:17%">Status</th></tr></thead>
  ${DPIA_DOCS.map((d, i) => {
    const files = got(d);
    const status = !known ? `<span class="box"></span> Provided` : files.length ? `<span class="ok">Received</span><br><span class="small">${files.map(esc).join("<br>")}</span>` : `<span class="out">Outstanding</span>`;
    return `<tr${i % 2 ? ' class="alt"' : ""}><td>${i + 1}</td><td><b>${esc(d)}</b></td><td>${esc(WHY[d]?.[0] ?? "")}</td><td>${WHY[d]?.[1] ?? ""}</td><td>${status}</td></tr>`;
  }).join("")}
</table>

<h2>5. Also needed</h2>
<ul>
  <li>Name and contact of the system owner, and of the IT or security lead for the system.</li>
  <li>The approximate number of data subjects whose data the system processes.</li>
  <li>Any previous DPIA, audit or penetration test report for the system.</li>
  <li>Contracts or data processing agreements with the vendors and processors listed in the integration documentation.</li>
</ul>

<h2>6. Next steps</h2>
<p>Send the documents to your Data Protection Compliance Organisation. Once received, the DPIA will be drafted against each part of section 28(4), reviewed with the system owner and the Data Protection Officer, and submitted for approval. If the assessment shows that high risk remains after the planned measures, section 28(2) requires consultation with the Nigeria Data Protection Commission before processing begins.</p>

<table class="sig"><tr>
  <td class="k2">Received by</td><td class="ln"></td><td class="k2">Date</td><td class="ln d"></td><td class="gap"></td>
  <td class="k2">Documents due by</td><td class="ln d"></td>
</tr><tr><td></td><td class="hint">Name, designation and signature</td><td></td><td></td><td class="gap"></td><td></td><td></td></tr></table>`;

  const css = BASE(`${o.org} · ${title}`) + `
thead { display: table-header-group; } h2 { break-after: avoid; }
table.band { margin: 0 0 14px; } table.band td { border: none; background: #0d1f4a; color: #fff; padding: 14px 16px; vertical-align: middle; }
.band-l .org { font-size: 14pt; font-weight: 700; color: #fff; } .band-r { text-align: right; width: 50%; }
.kicker { font-size: 8pt; letter-spacing: .08em; text-transform: uppercase; color: #9fc0ee; } .doc { font-size: 17pt; font-weight: 700; color: #fff; }
table.facts td { border: none; border-bottom: 2px solid #e3e8f0; padding: 6px 10px 8px 0; }
.lbl { font-size: 7.5pt; text-transform: uppercase; letter-spacing: .06em; color: #5f6878; font-weight: 600; }
.law { border-left: 5px solid #2a6aa8; background: #f2f6fc; padding: 12px 16px; margin: 8px 0 10px; }
.law p { margin: 0 0 6px; } .law .cite { font-size: 9pt; font-weight: 700; letter-spacing: .02em; color: #2a6aa8; } .law .item { padding-left: 14px; }
.small { font-size: 8.5pt; color: #5f6878; } tr.alt td { background: #f7f9fc; }
.ok { color: #1e7a4c; font-weight: 700; } .out { color: #b42318; font-weight: 700; }
.box { display: inline-block; width: 10px; height: 10px; border: 1px solid #1b2433; vertical-align: middle; margin-right: 4px; }
table.sig { margin-top: 26px; break-inside: avoid; } table.sig td { border: none; padding: 0 6px 0 0; vertical-align: bottom; }
table.sig td.k2 { font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #0d1f4a; white-space: nowrap; width: 1%; padding-bottom: 2px; }
table.sig td.ln { border-bottom: 1px solid #1b2433; height: 30px; width: 30%; } table.sig td.ln.d { width: 14%; } table.sig td.gap { width: 4%; }
table.sig td.hint { font-size: 7.5pt; color: #5f6878; padding-top: 3px; }`;
  return { title: `${o.org} - ${title}`, body, css };
}
