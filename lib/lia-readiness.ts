// LIA Readiness Document: sent to the client before a Legitimate Interest Assessment. It sets out section 25 of the
// NDPA 2023 (legitimate interest as a lawful basis, and when an interest is not legitimate) and lists the documents
// the client must provide, with each one's status when the LIA already exists.
import { CSS as BASE } from "./car-report";
import { fmtDate, todayWAT } from "./rules";
import { LIA_DOCS } from "./assessments";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Section 25 of the Nigeria Data Protection Act 2023, as enacted (the parts on legitimate interest). */
export const S25 = {
  s1: "Without prejudice to the principles set out in this Act, data processing shall be lawful, where—",
  s1b: "the processing is necessary—",
  s1bv: "for the purposes of the legitimate interests pursued by the data controller or data processor, or by a third party to whom the data is disclosed.",
  s2: "Interests in personal data processing shall not be legitimate for the purposes of subsection (1)(b)(v), where—",
  s2items: [
    ["a", "they override the fundamental rights, freedoms and the interests of the data subject;"],
    ["b", "they are incompatible with other lawful basis of processing under subsection (1)(b)(i)-(iv); or"],
    ["c", "the data subject would not have a reasonable expectation that the personal data would be processed in the manner envisaged."],
  ] as const,
};

/** What each document should show, and which part of the three-part test it supports. */
const WHY: Record<string, [string, string]> = {
  "Business Case / Project Proposal": ["The interest being pursued, its benefits and what happens if the processing does not go ahead.", "Purpose"],
  "Organisational Objectives and Policies": ["How the interest fits the organisation's objectives and policies.", "Purpose"],
  "Business Process Documentation": ["Each step of the activity and where personal data is used.", "Purpose, Necessity"],
  "Standard Operating Procedures": ["How staff carry out the activity in practice.", "Necessity"],
  "Management Justification / Approval": ["Management's reasons for the activity and its approval.", "Purpose"],
  "Privacy Policy": ["What data subjects are told, including any reference to legitimate interest and how to object.", "Balancing, s.25(2)(c)"],
  "Data Collection Forms": ["The exact personal data collected and what people are told at collection.", "Necessity, s.25(2)(c)"],
  "Data Retention Policy": ["How long the data is kept and how it is deleted.", "Necessity"],
  "Data Sharing Agreements": ["Who the data is shared with and on what terms.", "Balancing"],
  "System Architecture": ["The systems used for the activity and where they are hosted.", "Necessity"],
  "Data Flow Diagram": ["How personal data moves, who receives it and where it is stored.", "Necessity, Balancing"],
  "User Access Control Matrix": ["Who can access the data, by role.", "Necessity, Balancing"],
  "Information Security Policy": ["The security controls that protect the data.", "Balancing (safeguards)"],
  "Data Encryption and Backup Policy": ["Encryption at rest and in transit, and backups.", "Balancing (safeguards)"],
  "Incident and Breach Management Policy": ["How incidents are handled and reported to the NDPC.", "Balancing (safeguards)"],
  "Third-Party Integration Documentation": ["External services and processors involved, and the contracts in place.", "Balancing, s.25(2)(a)"],
};

export type LiaReadinessInput = { org: string; lia?: { title: string; activity?: string | null; year: number }; received?: Map<string, string[]> };

export function liaReadinessHtml(o: LiaReadinessInput) {
  const subject = o.lia?.activity || o.lia?.title;
  const title = `LIA Readiness Document${subject ? ` — ${subject}` : ""}`;
  const got = (d: string) => o.received?.get(d) ?? [];
  const known = !!o.received, count = known ? LIA_DOCS.filter((d) => got(d).length).length : 0;

  const body = `
<table class="band"><tr>
  <td class="band-l"><span class="org">${esc(o.org)}</span></td>
  <td class="band-r"><span class="kicker">NDPA 2023 · Section 25</span><br><span class="doc">LIA Readiness Document</span></td>
</tr></table>

<table class="facts"><tr>
  <td><span class="lbl">Organisation</span><br><b>${esc(o.org)}</b></td>
  <td><span class="lbl">Processing activity</span><br><b>${subject ? esc(subject) : "To be confirmed"}</b></td>
  <td><span class="lbl">Date</span><br><b>${fmtDate(todayWAT())}</b></td>
</tr></table>

<h2>1. Purpose of this document</h2>
<p>Where ${esc(o.org)} relies on legitimate interest as the lawful basis for processing personal data, a Legitimate Interest Assessment (LIA) must show that the interest is genuine, that the processing is necessary for it, and that it does not override the rights of data subjects. This document sets out the legal requirement and lists the documents ${esc(o.org)} should provide${subject ? ` for <b>${esc(subject)}</b>` : ""} so that the assessment can be carried out.</p>

<h2>2. The legal requirement: section 25 of the NDPA 2023</h2>
<div class="law">
  <p class="cite">Nigeria Data Protection Act, 2023 — Section 25(1)(b)(v)</p>
  <p>${S25.s1}</p>
  <p class="item"><b>(b)</b> ${S25.s1b}</p>
  <p class="item2"><b>(v)</b> ${S25.s1bv}</p>
</div>
<div class="law">
  <p class="cite">Section 25(2)</p>
  <p>${S25.s2}</p>
  ${S25.s2items.map(([k, t]) => `<p class="item"><b>(${k})</b> ${t}</p>`).join("")}
</div>

<h2>3. What this means for ${esc(o.org)}</h2>
<table class="map">
  <thead><tr><th style="width:18%">Test</th><th style="width:34%">The LIA must show</th><th>What we need from you</th></tr></thead>
  <tr><td><b>1. Purpose</b></td><td>A specific, lawful and real interest is being pursued (s.25(1)(b)(v)).</td><td>The business case or project proposal, organisational objectives, management justification or approval, and the business process.</td></tr>
  <tr><td><b>2. Necessity</b></td><td>The processing is necessary for that interest, with no less intrusive way, and only the data needed.</td><td>Business process documentation, SOPs, data collection forms, retention policy, system architecture, data flow and access control matrix.</td></tr>
  <tr><td><b>3. Balancing</b></td><td>The interest does not override the data subject's rights and freedoms (s.25(2)(a)), is compatible with the other lawful bases (s.25(2)(b)), and is within their reasonable expectations (s.25(2)(c)).</td><td>Privacy policy and collection forms (what people are told), data sharing agreements and integrations, and the security, encryption, backup and incident policies that act as safeguards.</td></tr>
</table>

<h2>4. Required documents</h2>
${known ? `<p><b>${count} of ${LIA_DOCS.length}</b> documents received so far. Please provide the outstanding documents.</p>` : `<p>Please provide the following ${LIA_DOCS.length} documents. Where a document does not exist, say so; we will help prepare it.</p>`}
<table class="docs">
  <thead><tr><th style="width:4%">S/N</th><th style="width:25%">Document</th><th>What it should show</th><th style="width:14%">Supports</th><th style="width:16%">Status</th></tr></thead>
  ${LIA_DOCS.map((d, i) => {
    const files = got(d);
    const status = !known ? `<span class="box"></span> Provided` : files.length ? `<span class="ok">Received</span><br><span class="small">${files.map(esc).join("<br>")}</span>` : `<span class="out">Outstanding</span>`;
    return `<tr${i % 2 ? ' class="alt"' : ""}><td>${i + 1}</td><td><b>${esc(d)}</b></td><td>${esc(WHY[d]?.[0] ?? "")}</td><td>${esc(WHY[d]?.[1] ?? "")}</td><td>${status}</td></tr>`;
  }).join("")}
</table>

<h2>5. Also needed</h2>
<ul>
  <li>Name and contact of the business owner of the activity.</li>
  <li>The approximate number of data subjects and how often the processing takes place.</li>
  <li>Any objections or complaints received from data subjects about this processing.</li>
  <li>Any previous LIA or DPIA covering the same activity.</li>
</ul>

<h2>6. Next steps</h2>
<p>Send the documents to your Data Protection Compliance Organisation. Once received, the LIA will be completed against the purpose, necessity and balancing tests, reviewed with the business owner and the Data Protection Officer, and submitted for approval. If the interest is found not to be legitimate under section 25(2), another lawful basis must be identified before the processing continues. Legitimate interest cannot be relied on for sensitive personal data (section 30).</p>

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
.law p { margin: 0 0 6px; } .law .cite { font-size: 9pt; font-weight: 700; letter-spacing: .02em; color: #2a6aa8; } .law .item { padding-left: 14px; } .law .item2 { padding-left: 30px; }
.small { font-size: 8.5pt; color: #5f6878; } tr.alt td { background: #f7f9fc; }
.ok { color: #1e7a4c; font-weight: 700; } .out { color: #b42318; font-weight: 700; }
.box { display: inline-block; width: 10px; height: 10px; border: 1px solid #1b2433; vertical-align: middle; margin-right: 4px; }
table.sig { margin-top: 26px; break-inside: avoid; } table.sig td { border: none; padding: 0 6px 0 0; vertical-align: bottom; }
table.sig td.k2 { font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #0d1f4a; white-space: nowrap; width: 1%; padding-bottom: 2px; }
table.sig td.ln { border-bottom: 1px solid #1b2433; height: 30px; width: 30%; } table.sig td.ln.d { width: 14%; } table.sig td.gap { width: 4%; }
table.sig td.hint { font-size: 7.5pt; color: #5f6878; padding-top: 3px; }`;
  return { title: `${o.org} - ${title}`, body, css };
}
