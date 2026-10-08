// LIA report in the DPCO's format (blog/Legitimate_Interest_Assessment_Report_GAID.docx), from an LIA assessment,
// its linked RoPA activity, onboarding answers, the CAR NDPC answers and the firm profile. Unknowns show as [To be confirmed].
import { q, one } from "./db";
import { answersOf } from "./data";
import { list } from "./questionnaire";
import { LIA_SAFEGUARDS, LIA_IMPACTS } from "./assessments";
import { fmtDate, todayWAT } from "./rules";
import { CSS } from "./car-report";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const TBC = `<span class="muted">[To be confirmed]</span>`;
const v = (x: unknown) => (x === null || x === undefined || String(x).trim() === "" || /\[To be (completed|confirmed)\]$/.test(String(x).trim()) ? (x && String(x).replace(/\s*\[To be (completed|confirmed)\]$/, "").trim() ? `${esc(String(x).replace(/\s*\[To be (completed|confirmed)\]$/, ""))} ${TBC}` : TBC) : esc(x));
const boxes = (options: string[], chosen: string | null | undefined) => options.map((o) => `${chosen === o ? "☒" : "☐"} ${esc(o)}`).join("&nbsp;&nbsp;&nbsp;&nbsp;");
const box = (title: string, inner: string) => `<table><tr><td style="background:#EEF2FB"><p style="margin:0 0 4px"><b>${title}</b></p>${inner}</td></tr></table>`;

export async function loadLiaReport(id: string) {
  const a = await one("select a.*, u.name as approver, cu.name as author from assessments a left join users u on u.id = a.approved_by join users cu on cu.id = a.created_by where a.id = $1 and a.kind = 'lia'", [id]);
  if (!a) return null;
  const c = (await one(`select c.name, c.mi_class, c.car_audit_year, f.name as firm_name, f.signatory_name, f.signatory_title, f.email as firm_email, f.phone as firm_phone
    from clients c join firms f on f.id = c.firm_id where c.id = $1`, [a.client_id]))!;
  const ans = await answersOf(a.client_id);
  const ropa = a.ropa_entry_id ? await one("select * from ropa_entries where id = $1", [a.ropa_entry_id]) : null;
  const car = await q<{ item_text: string; status: string; answer: string | null }>("select item_text, status, answer from client_car_items where client_id = $1 and audit_year = $2 and (item_text ilike '%registered with the NDPC%' or item_text ilike 'NDPC registration number')", [a.client_id, c.car_audit_year]);
  const seq = (await one<{ n: number }>("select count(*)::int as n from assessments where client_id = $1 and kind = 'lia' and assessment_year = $2 and created_at <= $3", [a.client_id, a.assessment_year, a.created_at]))!.n;
  return { a, c, ans, ropa, car, seq };
}

export function liaReportHtml({ a, c, ans, ropa, car, seq }: NonNullable<Awaited<ReturnType<typeof loadLiaReport>>>) {
  const A: Record<string, string> = a.answers ?? {};
  const s = (k: string) => (typeof ans[k] === "string" && (ans[k] as string).trim() ? (ans[k] as string).trim() : null);
  const org = s("org_legal_name") ?? c.name, ref = `LIA-${a.assessment_year}-${String(seq).padStart(3, "0")}`;
  const date = a.approved_at ? fmtDate(new Date(a.approved_at).toISOString().slice(0, 10)) : fmtDate(todayWAT());
  const preparer = [c.signatory_name, c.signatory_title].filter(Boolean).join(", ");
  const dpo = s("dpo_name") ?? c.signatory_name;
  const reg = car.find((i) => /registered with the NDPC/i.test(i.item_text)), regNo = car.find((i) => /registration number/i.test(i.item_text))?.answer;
  const sensitive = ropa ? (ropa.involves_sensitive ? "Yes – stop and reassess" : "None") : null;
  const children = ropa && /child|minor|pupil/i.test(ropa.data_subjects ?? "") ? "Yes – enhanced assessment" : ropa ? "No" : null;
  const outcomeVerb = a.outcome === "Proceed" ? "can" : a.outcome === "Proceed with safeguards" ? "can only, subject to the safeguards in Section 8," : a.outcome === "Do not proceed" ? "cannot" : "[can / can only, subject to the safeguards in Section 8, / cannot]";
  const decision = a.outcome === "Proceed" ? "Approved" : a.outcome === "Proceed with safeguards" ? "Approved with conditions" : a.outcome === "Do not proceed" ? "Rejected" : null;
  const qtable = (rows: [string, string][]) => `<table><tr><th style="width:42%">Question</th><th>Assessment</th></tr>${rows.map(([q2, k]) => `<tr><td>${q2}</td><td>${v(A[k])}</td></tr>`).join("")}</table>`;
  const result = (title: string, opts: string[], r: string, why: string) => box(title, `<p style="margin:0">${boxes(opts, A[r])}</p><p style="margin:4px 0 0">Reasoning: ${v(A[why])}</p>`);
  const kv = (rows: [string, string][]) => `<table>${rows.map(([k, val]) => `<tr><td class="k">${k}</td><td>${val}</td></tr>`).join("")}</table>`;

  const body = `
<section>
  <table><tr><td style="background:#1F3864;color:#FFFFFF;text-align:center;padding:18px">
    <p style="margin:0;color:#FFFFFF;font-size:11pt"><b>DATA PROTECTION COMPLIANCE REPORT</b></p>
    <p style="margin:6px 0;color:#FFFFFF;font-size:22pt"><b>Legitimate Interest Assessment Report</b></p>
    <p style="margin:0;color:#FFFFFF">Prepared in accordance with the Nigeria Data Protection Act, 2023 and the NDPA General Application and Implementation Directive (GAID), 2025</p></td></tr></table>
  ${kv([["Organisation (Data Controller / Processor)", esc(org)], ["Processing activity assessed", esc(a.title)], ["Report reference", ref], ["Report date", date], ["Version", "1.0"], ["Classification", "Confidential – Internal and Regulatory Use"]])}
  <p>Prepared by: <b>${preparer ? esc(preparer) : TBC}</b><br>${esc(c.firm_name)}</p>
</section>

<section class="break">
  <h1>Document Control</h1>
  <table><tr><th>Item</th><th>Detail</th></tr>
    <tr><td>Document title</td><td>Legitimate Interest Assessment (LIA) Report</td></tr><tr><td>Lawful basis assessed</td><td>Legitimate interest – NDPA 2023, Section 25</td></tr>
    <tr><td>Prepared by</td><td>${esc([preparer, c.firm_name].filter(Boolean).join(", "))}</td></tr><tr><td>Reviewed by</td><td>${TBC}</td></tr>
    <tr><td>Approved by</td><td>${a.approver ? esc(a.approver) : TBC}</td></tr><tr><td>Next scheduled review</td><td>${v(A.next_review)}</td></tr></table>
  <h2>Revision history</h2>
  <table><tr><th>Version</th><th>Date</th><th>Author</th><th>Summary of change</th></tr><tr><td>1.0</td><td>${fmtDate(new Date(a.created_at).toISOString().slice(0, 10))}</td><td>${esc(a.author)}</td><td>Initial assessment issued</td></tr></table>
  ${box("How to read this report", `<p style="margin:0">This report applies the three-part test (Purpose, Necessity and Balancing) that the GAID requires a controller to document where it elects to rely on legitimate interest as its lawful basis. Fields marked [To be confirmed] are to be completed or confirmed by the assessing team before the report is signed off.</p>`)}

  <h1>1. Executive Summary</h1>
  <p>This report documents the Legitimate Interest Assessment (LIA) carried out by ${esc(org)} for the processing activity described in Section 3. Where a data controller elects to rely on legitimate interest as its lawful basis, the GAID requires a documented assessment showing that the basis is adequate for the processing. The NDPA, 2023 (Section 25) permits this basis only where it is not overridden by the fundamental rights, freedoms and interests of the data subject, and where the data subject would reasonably expect the processing.</p>
  <h2>1.1 Assessment at a glance</h2>
  ${kv([["Organisation", esc(org)], ["Processing activity", `${esc(a.title)}${A.description && A.description !== a.title ? ` – ${esc(A.description)}` : ""}`], ["Lawful basis relied upon", "Legitimate interest (NDPA 2023, s. 25)"],
    ["Categories of data subjects", v(ropa?.data_subjects)], ["Categories of personal data", v(ropa?.data_categories)], ["Date of assessment", date],
    ["Overall outcome", boxes(["Proceed", "Proceed with safeguards", "Do not proceed"], a.outcome)], ["Residual risk to data subjects", boxes(["Low", "Medium", "High"], A.residual)], ["DPIA required?", boxes(["Yes", "No", "To be determined"], A.dpia)]])}
  <h2>1.2 Summary of findings</h2>
  <table><tr><th>Test</th><th>Question answered</th><th style="width:30%">Result</th></tr>
    <tr><td>1. Purpose test</td><td>Is there a clear, specific and lawful interest being pursued by the organisation or a third party?</td><td>${boxes(["Met", "Partly met", "Not met"], A.purpose_result)}</td></tr>
    <tr><td>2. Necessity test</td><td>Is the processing necessary for that interest, and is there no less intrusive way to achieve it?</td><td>${boxes(["Met", "Partly met", "Not met"], A.necessity_result)}</td></tr>
    <tr><td>3. Balancing test</td><td>Are the interests, rights and freedoms of data subjects outweighed by the organisation's interest?</td><td>${boxes(["Met", "Met with safeguards", "Not met"], A.balancing_result)}</td></tr></table>
  <h2>1.3 Conclusion</h2>
  ${box("Overall conclusion", `<p style="margin:0">Based on the analysis in Sections 4 to 7, legitimate interest ${outcomeVerb} be relied upon as the lawful basis for the processing activity described in this report.</p>${A.outcome_notes ? `<p style="margin:4px 0 0">${esc(A.outcome_notes)}</p>` : ""}<p style="margin:4px 0 0">Reliance on legitimate interest does not remove the organisation's duty to apply the principles of Section 24 of the NDPA, to be transparent with data subjects, and to honour their right to object.</p>`)}
  <h2>1.4 Priority actions</h2>
  <ul><li>Publish or update the privacy notice so that the legitimate interest relied upon is named in plain language.</li><li>Provide a simple and visible mechanism for data subjects to object to the processing, and record outcomes.</li>
  <li>Implement the safeguards in Section 8 (minimisation, access control, retention limits and security) before processing begins or continues.</li><li>Assess whether the activity triggers a Data Protection Impact Assessment (NDPA, s. 28) and record the decision.</li>
  <li>Record this assessment in the Record of Processing Activities and make it available to the Nigeria Data Protection Commission (NDPC) on request.</li><li>Re-run this assessment annually, and on any change to purpose, data, recipients, technology or risk.</li></ul>
</section>

<section class="break">
  <h1>2. Organisation Identity</h1>
  <p>This section identifies the legal entity responsible for the processing and the persons accountable for data protection within it.</p>
  <h2>2.1 Legal entity</h2>
  ${kv([["Registered name", esc(org)], ["Trading name (if different)", c.name !== org ? esc(c.name) : TBC], ["CAC registration number", TBC], ["Registered address", v(s("org_address"))], ["Sector / industry", v(s("org_sector"))], ["Website", v(s("org_website"))]])}
  <h2>2.2 Role in the processing</h2>
  ${kv([["Role under the NDPA", boxes(["Data Controller", "Data Processor", "Joint Controller"], A.role)], ["Data Controller / Processor of Major Importance (DCPMI)", boxes(["Yes", "No", "Under review"], c.mi_class === "major_importance" ? "Yes" : c.mi_class === "not_major_importance" ? "No" : "Under review")],
    ["NDPC registration status", reg?.status === "complete" ? `Registered${regNo ? ` – ${esc(regNo)}` : ""}` : TBC], ["Third parties pursuing the interest", v(A.third_parties)]])}
  <h2>2.3 Data protection governance</h2>
  ${kv([["Data Protection Officer", v(dpo)], ["DPO contact", v([s("dpo_email"), s("dpo_phone")].filter(Boolean).join(" / "))], ["Senior accountable officer", TBC], ["Business owner of the activity", v(A.business_owner)], ["Most recent compliance audit filing", TBC]])}

  <h1>3. Processing Activity</h1>
  <p>This section describes the processing in sufficient detail for a reviewer, or the NDPC, to understand what is done, to whom, and why.</p>
  <h2>3.1 Description of the activity</h2>
  ${kv([["Activity name", esc(ropa?.purpose ?? a.title)], ["Description", v(A.description)], ["Business function", v(A.function)], ["Systems and tools used", v(A.systems)], ["Start date / frequency", v(A.frequency)], ["Scale of processing", v(A.scale)]])}
  <h2>3.2 Personal data involved</h2>
  <table><tr><th>Element</th><th>Detail</th></tr>${[["Categories of data subjects", v(ropa?.data_subjects)], ["Categories of personal data", v(ropa?.data_categories)],
    ["Sensitive personal data?", boxes(["None", "Yes – stop and reassess", "Possible"], sensitive)], ["Children's data?", boxes(["No", "Yes – enhanced assessment", "Possible"], children)],
    ["Source of the data", v(A.source)], ["Recipients and disclosures", v(ropa?.recipients)],
    ["Cross-border transfer", ropa ? (ropa.has_transfer ? `${esc(list(ans.transfer_countries).join(", ") || "Yes")}${ropa.transfer_safeguard ? ` – safeguard: ${esc(ropa.transfer_safeguard)}` : ""}` : "None") : TBC], ["Retention period", v(A.retention)]].map(([k, val]) => `<tr><td>${k}</td><td>${val}</td></tr>`).join("")}</table>
  ${box("Sensitive personal data check", `<p style="margin:0">Legitimate interest is not an appropriate basis for processing sensitive personal data under Section 30 of the NDPA, which sets its own conditions. If the activity involves such data, this assessment must stop and a different basis and condition must be identified.</p>`)}
</section>

<section class="break">
  <h1>4. Legal and Regulatory Framework</h1>
  <table><tr><th style="width:32%">Instrument</th><th>Relevance to this assessment</th></tr>
    <tr><td>Nigeria Data Protection Act, 2023 – Section 25</td><td>Recognises legitimate interest as a lawful basis for processing, and limits it where it is overridden by data subject rights, conflicts with other lawful bases, or falls outside reasonable expectations.</td></tr>
    <tr><td>NDPA 2023 – Section 24</td><td>Principles of processing: fairness, lawfulness and transparency; purpose limitation; data minimisation; accuracy; storage limitation; security; accountability.</td></tr>
    <tr><td>NDPA 2023 – Section 28</td><td>Data Protection Impact Assessment where processing is likely to result in high risk to data subjects.</td></tr>
    <tr><td>NDPA 2023 – Part VI</td><td>Rights of data subjects, including access, rectification, erasure and the right to object.</td></tr>
    <tr><td>GAID, 2025</td><td>Requires a documented legitimate interest assessment where legitimate interest is relied upon as lawful basis, and sets out compliance measures for controllers and processors. In any inconsistency, the NDPA prevails.</td></tr></table>
  <p class="note">Assessor note: insert the specific GAID article references and any sector-specific rules${s("org_sector") ? ` for the ${esc(s("org_sector")!.toLowerCase())} sector` : ""} applicable to this organisation, and confirm all citations against the current gazetted texts before issue.</p>
  <h2>4.1 The three-part test</h2>
  <p>The assessment follows the structure widely accepted for legitimate interest and expected by the NDPC:</p>
  <ul><li><b>Purpose test:</b> is a legitimate interest being pursued?</li><li><b>Necessity test:</b> is the processing necessary for that interest, and proportionate?</li><li><b>Balancing test:</b> do the data subject's interests, rights and freedoms override that interest?</li></ul>
  <p>Legitimate interest should not be used where the processing is covered more appropriately by another lawful basis (for example, consent for non-essential marketing or a legal obligation), where sensitive data is involved, or where data subjects would be surprised by the use of their data.</p>

  <h1>5. Part 1 – Purpose Test</h1>
  <p>The purpose test establishes that the organisation (or a third party) has a real and lawful interest, stated specifically enough to be tested.</p>
  ${qtable([["What is the specific interest being pursued?", "interest"], ["Whose interest is it?", "whose"], ["What benefit does the interest bring, and to whom?", "benefit"], ["What would be the impact if the processing did not go ahead?", "if_not"],
    ["Is the interest lawful and clearly articulated?", "lawful"], ["Does any law, code or sector guidance support the interest?", "support"], ["Is the interest real and present rather than speculative?", "real"]])}
  ${result("Purpose test outcome", ["Met", "Partly met", "Not met"], "purpose_result", "purpose_reason")}
</section>

<section class="break">
  <h1>6. Part 2 – Necessity Test</h1>
  <p>The necessity test asks whether the processing is a targeted and proportionate way of achieving the purpose, and whether the same result could be reached with less data or less intrusion.</p>
  ${qtable([["Does the processing actually help achieve the interest?", "achieves"], ["Is there a less intrusive way to achieve the same result?", "alternatives"], ["Can the purpose be met with anonymised or pseudonymised data?", "anonymised"],
    ["Is each data element necessary (data minimisation)?", "minimisation"], ["Is the retention period no longer than needed?", "retention_ok"], ["Is access limited to those who need it?", "access"], ["Would another lawful basis be more appropriate?", "other_basis"]])}
  ${result("Necessity test outcome", ["Met", "Partly met", "Not met"], "necessity_result", "necessity_reason")}

  <h1>7. Part 3 – Balancing Test</h1>
  <p>The balancing test weighs the organisation's interest against the interests, fundamental rights and freedoms of the people whose data is processed. If those rights outweigh the interest, legitimate interest cannot be used.</p>
  <h2>7.1 Nature of the data and the relationship</h2>
  <table><tr><th style="width:42%">Factor</th><th>Assessment</th></tr>${[["Relationship with data subjects", "relationship"], ["Is the data private, financial, location or behavioural in nature?", "nature"], ["Are vulnerable individuals or children affected?", "vulnerable"]].map(([f, k]) => `<tr><td>${f}</td><td>${v(A[k])}</td></tr>`).join("")}</table>
  <h2>7.2 Reasonable expectations</h2>
  <table><tr><th style="width:42%">Factor</th><th>Assessment</th></tr>${[["Would data subjects reasonably expect this processing at the time of collection?", "expected"], ["Has the activity been explained in the privacy notice?", "notice"], ["Is the use consistent with the original purpose of collection?", "consistent"]].map(([f, k]) => `<tr><td>${f}</td><td>${v(A[k])}</td></tr>`).join("")}</table>
  <h2>7.3 Likely impact on data subjects</h2>
  <table><tr><th>Potential impact</th><th style="width:22%">Likelihood</th><th style="width:22%">Severity</th></tr>${LIA_IMPACTS.map(([k, l]) => `<tr><td>${l}</td><td>${A[`imp_${k}_l`] ? esc(A[`imp_${k}_l`]) : "Low / Med / High"}</td><td>${A[`imp_${k}_s`] ? esc(A[`imp_${k}_s`]) : "Low / Med / High"}</td></tr>`).join("")}</table>
  <h2>7.4 Balance</h2>
  <p>${v(A.balance)}</p>
  ${result("Balancing test outcome", ["Met", "Met with safeguards", "Not met"], "balancing_result", "balancing_reason")}
</section>

<section class="break">
  <h1>8. Safeguards and Mitigation</h1>
  <p>These measures reduce the impact on data subjects and support the conclusion of the balancing test. Each must have an owner and a due date.</p>
  <table><tr><th style="width:20%">Safeguard</th><th>Implementation</th><th style="width:24%">Owner / due date</th></tr>${LIA_SAFEGUARDS.map(([k, l, impl]) => `<tr><td>${l}</td><td>${impl}</td><td>${v(A[`sg_${k}`])}</td></tr>`).join("")}</table>
  <h1>9. Data Subject Rights and Transparency</h1>
  <ul><li>Data subjects are informed of the processing, the legitimate interest relied upon, the retention period and their rights.</li><li>Requests for access, rectification, erasure and objection are routed to the DPO and answered within the statutory period.</li>
  <li>Where a data subject objects, the organisation reassesses the balance in the individual's case and records the decision.</li><li>Where legitimate interest is later found not to apply, processing stops and the organisation moves to a valid basis such as consent.</li></ul>

  <h1>10. Decision and Sign-off</h1>
  ${box("Decision", `<p style="margin:0">Legitimate interest as lawful basis for processing:</p><p style="margin:4px 0">${boxes(["Approved", "Approved with conditions", "Rejected"], decision)}</p><p style="margin:0">Conditions (if any): ${A.outcome_notes ? esc(A.outcome_notes) : "None recorded"}</p>`)}
  <h2>10.1 Review schedule</h2>
  ${kv([["Next full review", v(A.next_review)], ["Triggers for earlier review", "Change of purpose, data categories, recipients, technology or location; a data breach; a complaint or objection trend; regulatory change."]])}
  <h2>10.2 Approval</h2>
  <table><tr><th>Role</th><th>Name</th><th style="width:22%">Signature</th><th style="width:15%">Date</th></tr>
    <tr><td>Data Protection Officer</td><td>${v(dpo)}</td><td></td><td></td></tr><tr><td>Business owner</td><td>${v(A.business_owner)}</td><td></td><td></td></tr><tr><td>Senior management</td><td>${a.approver ? esc(a.approver) : ""}</td><td></td><td></td></tr></table>
</section>`;
  return { title: `${org} LIA Report ${ref} - ${a.title}`, css: CSS(`${org} · Legitimate Interest Assessment ${ref} · Confidential`), body };
}
