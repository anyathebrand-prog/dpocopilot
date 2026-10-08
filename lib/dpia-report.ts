// DPIA report for one DPIA, in the DPCO's DPIA report format (blog/DPIA_Report_GAID.docx): cover, document control,
// 11 sections, heat map and inherent-vs-residual chart. Built from the 13-step DPIA, the linked RoPA activities,
// onboarding answers, the CAR NDPC answers and the firm profile. Unknown facts show as [To be confirmed], never guessed.
import { q, one } from "./db";
import { loadCtx, answersOf, versionsOf } from "./data";
import { normalizeDpia, LAWFUL_BASIS, type Risk } from "./templates";
import { riskLevel, fmtDate, todayWAT } from "./rules";
import { CSS } from "./car-report";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const TBC = `<span class="muted">[To be confirmed]</span>`;
const v = (x: unknown) => (x === null || x === undefined || String(x).trim() === "" ? TBC : esc(x));
const uniq = (xs: (string | null | undefined)[]) => [...new Set(xs.flatMap((x) => (x ?? "").split(",").map((s) => s.trim())).filter(Boolean))];
const score = (r: Risk) => r.likelihood * r.impact;
const resid = (r: Risk) => (r.residual_likelihood && r.residual_impact ? r.residual_likelihood * r.residual_impact : null);
const LEVEL_BG: Record<string, string> = { Low: "#C6EFCE", Medium: "#FFEB9C", High: "#F8CBAD", Critical: "#FF9B9B" };
const lvl = (n: number) => `<span style="background:${LEVEL_BG[riskLevel(n)]};padding:1px 6px;border-radius:3px;font-weight:700;white-space:nowrap">${n} ${riskLevel(n)}</span>`;
const VULNERABLE = /child|minor|student|pupil|patient|elderly|vulnerable/i;

/** Paragraphs and "- " bullets from a DPIA step's plain text, as report HTML (## lines become sub-headings). */
function prose(t: string | undefined) {
  if (!t?.trim()) return `<p>${TBC}</p>`;
  const out: string[] = []; let list: string[] = [];
  const flush = () => { if (list.length) out.push(`<ul>${list.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>`); list = []; };
  for (const line of t.split(/\r?\n/)) {
    if (line.startsWith("- ")) { list.push(line.slice(2)); continue; }
    flush();
    if (line.startsWith("## ")) out.push(`<p style="margin:10px 0 2px"><b>${esc(line.slice(3))}</b></p>`);
    else if (line.trim()) out.push(`<p>${esc(line)}</p>`);
  }
  flush();
  return out.join("").replaceAll(esc("[To be completed]"), TBC);
}

export async function loadDpiaReport(dpiaId: string) {
  const d = await one("select * from dpias where id = $1", [dpiaId]);
  if (!d) return null;
  const versions = await versionsOf("dpia", d.id);
  const cur = versions[0];
  const authors = await q<{ version_no: number; name: string }>("select v.version_no, u.name from content_versions v join users u on u.id = v.created_by where v.parent_type = 'dpia' and v.parent_id = $1", [d.id]);
  const ropaIds = (await q("select ropa_entry_id from dpia_ropa where dpia_id = $1", [d.id])).map((r) => r.ropa_entry_id);
  const ctx = await loadCtx(d.client_id, ropaIds);
  const a = await answersOf(d.client_id);
  const c = (await one(`select c.name, c.mi_class, c.car_audit_year, f.name as firm_name, f.signatory_name, f.signatory_title, f.email as firm_email, f.phone as firm_phone
    from clients c join firms f on f.id = c.firm_id where c.id = $1`, [d.client_id]))!;
  const car = await q<{ item_text: string; status: string; answer: string | null }>(
    "select item_text, status, answer from client_car_items where client_id = $1 and audit_year = $2 and (item_text ilike '%registered with the NDPC%' or item_text ilike 'NDPC registration number')", [d.client_id, c.car_audit_year]);
  const seq = (await one<{ n: number }>("select count(*)::int as n from dpias where client_id = $1 and assessment_year = $2 and created_at <= $3", [d.client_id, d.assessment_year, d.created_at]))!.n;
  const str = (k: string) => (typeof a[k] === "string" && (a[k] as string).trim() ? (a[k] as string).trim() : null);
  return { d, versions, cur, authors, ctx, a, c, car, seq, str, body: normalizeDpia(cur.body) };
}
export type DpiaReport = NonNullable<Awaited<ReturnType<typeof loadDpiaReport>>>;

export function dpiaReportHtml(x: DpiaReport) {
  const { d, cur, ctx, c, body, str } = x;
  const risks = body.risks_list ?? [];
  const org = ctx.orgName, ref = `DPIA-${d.assessment_year}-${String(x.seq).padStart(3, "0")}`;
  const statusLabel = cur.status === "draft" || cur.status === "in_review" ? "Draft for management review" : cur.status === "client_signed_off" ? "Approved and signed off by the client" : cur.status === "approved" || cur.status === "awaiting_client_signoff" ? "Approved" : cur.status;
  const assessed = cur.approved_at ? fmtDate(new Date(cur.approved_at).toISOString().slice(0, 10)) : fmtDate(todayWAT());
  const preparer = [c.signatory_name, c.signatory_title, c.firm_name].filter(Boolean).join(", ") || c.firm_name;
  const R = (i: number) => `R${i + 1}`;
  const inherentCH = risks.filter((r) => score(r) >= 10).length, critical = risks.filter((r) => score(r) >= 16).length, high = inherentCH - critical;
  const residuals = risks.map(resid).filter((n): n is number => n !== null);
  const resCritical = residuals.filter((n) => n >= 16).length, resHigh = residuals.filter((n) => n >= 10 && n < 16).length;
  const overall = residuals.length ? riskLevel(Math.max(...residuals)) : risks.length ? `${riskLevel(Math.max(...risks.map(score)))} (inherent; residual not yet assessed)` : "Not assessed";
  const consult = resCritical + resHigh > 0;
  const subjects = uniq(ctx.ropa.map((e) => e.data_subjects));
  const transfers = ctx.ropa.filter((e) => e.has_transfer);
  const regItem = x.car.find((i) => /registered with the NDPC/i.test(i.item_text)), regNo = x.car.find((i) => /NDPC registration number/i.test(i.item_text))?.answer;
  const regStatus = c.mi_class === "major_importance" ? `Data controller of major importance${regItem?.status === "complete" ? "; registered with the NDPC" : regItem ? "; registration not yet evidenced" : ""}` : c.mi_class === "not_major_importance" ? "Not of major importance" : regItem?.status === "complete" ? "Registered with the NDPC" : null;
  const sorted = risks.map((r, i) => ({ r, i })).sort((p, q2) => score(q2.r) - score(p.r));
  const top = sorted.filter(({ r }) => score(r) >= 10 && r.mitigation).slice(0, 5);
  const principles = Object.fromEntries((body.principles_rights ?? "").split(/\r?\n/).map((l) => l.match(/^- ([^:]+): (.+)$/)).filter((m): m is RegExpMatchArray => !!m && !/\[To be completed\]/.test(m[2])).map((m) => [m[1].trim().toLowerCase(), m[2].trim()]));
  const P = (name: string, fallback: string) => esc(principles[name.toLowerCase()] ?? fallback);

  const screening: [string, boolean | null, string][] = [
    ["Large-scale processing of personal data", ctx.subjects6mo ? Number(ctx.subjects6mo) >= 1000 : null, ctx.subjects6mo ? `At least ${ctx.subjects6mo} data subjects processed in six months` : ""],
    ["Processing of sensitive personal data", ctx.ropa.some((e) => e.involves_sensitive), ctx.ropa.filter((e) => e.involves_sensitive).map((e) => e.purpose).join(", ")],
    ["Systematic monitoring / profiling or automated decision-making", null, ""],
    ["Use of new or innovative technology", null, ""],
    ["Processing of children's or vulnerable persons' data", subjects.some((s) => VULNERABLE.test(s)), subjects.filter((s) => VULNERABLE.test(s)).join(", ")],
    ["Cross-border transfer of personal data", transfers.length > 0, transfers.map((e) => `${e.purpose}${e.transfer_safeguard ? ` (safeguard: ${e.transfer_safeguard})` : ""}`).join("; ")],
  ];

  // Heat map: impact 5→1 down, likelihood 1→5 across; cells coloured by rating and labelled with the risks scored there.
  const heat = `<table style="width:auto;margin:8px 0"><tr><th style="background:#fff;color:#1b2433;border:0"></th>${[1, 2, 3, 4, 5].map((l) => `<th style="text-align:center;width:72px">L${l}</th>`).join("")}</tr>${[5, 4, 3, 2, 1].map((im) =>
    `<tr><th style="text-align:center">I${im}</th>${[1, 2, 3, 4, 5].map((l) => { const here = risks.map((r, i) => (r.likelihood === l && r.impact === im ? R(i) : "")).filter(Boolean);
      return `<td style="background:${LEVEL_BG[riskLevel(l * im)]};text-align:center;height:34px;font-weight:700">${here.join(" ") || `<span style="color:#7a7a7a;font-weight:400">${l * im}</span>`}</td>`; }).join("")}</tr>`).join("")}</table>
    <p class="note">L = Likelihood, I = Impact. Each risk is placed by its inherent score. Green Low (1–4), yellow Medium (5–9), orange High (10–15), red Critical (16–25).</p>`;
  // One cell per bar, its length proportional to the score out of 25.
  const bar = (n: number | null, color: string) => `<td style="border:0;padding:3px 0">${n === null ? `<span class="muted">not yet assessed</span>`
    : `<span style="display:inline-block;vertical-align:middle;background:${color};height:12px;width:${Math.round((n / 25) * 85)}%"></span> <b>${n}</b>`}</td>`;
  const chart = `<table style="margin:8px 0;table-layout:fixed">${risks.map((r, i) => `<tr><th rowspan="2" style="width:9%;text-align:center">${R(i)}</th><td style="width:12%;border:0;font-size:8.5pt">Inherent</td>${bar(score(r), "#1F3864")}</tr>
    <tr><td style="border:0;font-size:8.5pt">Residual</td>${bar(resid(r), "#2EC4A6")}</tr>`).join("")}</table><p class="note">Bars show the risk score (1–25) before and after the controls in Section 8.</p>`;

  const sectionTitles = ["Executive Summary", "Scope, Methodology and Legal Basis", "Organisation Identity", "Product Description", "Processing Activity", "Necessity and Proportionality", "Risk Assessment and Risk Chart", "Risk Treatment and Controls", "Residual Risk and DPO Opinion", "Action Plan", "Sign-off and NDPC Consultation"];
  const dpoName = ctx.dpoName ?? c.signatory_name;
  const body_ = `
<section style="text-align:center;padding-top:40mm">
  <p style="font-size:24pt;font-weight:700;color:#1F3864;margin:0">DATA PROTECTION IMPACT ASSESSMENT</p>
  <p style="font-size:16pt;font-weight:700;color:#2a6aa8;margin:6px 0 18px">DPIA Report</p>
  <p>Prepared in accordance with the Nigeria Data Protection Act, 2023 and the Nigeria Data Protection Act General Application and Implementation Directive (GAID), 2025</p>
  <table style="margin-top:24px;text-align:left">
    <tr><td class="k">Organisation</td><td>${esc(org)}</td></tr><tr><td class="k">Processing activity / product</td><td>${esc(d.title)}</td></tr>
    <tr><td class="k">Report reference</td><td>${ref}</td></tr><tr><td class="k">Version / status</td><td>v${cur.version_no}.0 - ${esc(statusLabel)}</td></tr>
    <tr><td class="k">Date of assessment</td><td>${assessed}</td></tr><tr><td class="k">Prepared by</td><td>${esc(preparer)}</td></tr>
  </table>
  <p class="note" style="margin-top:24px">CONFIDENTIAL - Contains information about the organisation's data protection risk posture. Distribution restricted to the controller's management, the DPO and the Nigeria Data Protection Commission (NDPC) where required.</p>
</section>

<section class="break">
  <h1>Document Control</h1>
  <table><tr><th>Version</th><th>Date</th><th>Author</th><th>Change</th></tr>${[...x.versions].reverse().map((ver) => `<tr><td>${ver.version_no}.0</td><td>${fmtDate(new Date(ver.created_at).toISOString().slice(0, 10))}</td><td>${esc(x.authors.find((a2) => a2.version_no === ver.version_no)?.name ?? "")}</td><td>${ver.version_no === 1 ? "Initial DPIA" : "Revised DPIA"}${ver.approved_at ? `; approved by ${esc(ver.approved_by_name)}` : ""}</td></tr>`).join("")}</table>
  <h2>Contents</h2>
  <ol>${sectionTitles.map((t) => `<li>${t}</li>`).join("")}</ol>
</section>

<section class="break">
  <h1>1. Executive Summary</h1>
  <p>This Data Protection Impact Assessment (DPIA) evaluates the personal data processing associated with ${esc(d.title)} operated by ${esc(org)} (the "Controller"). It has been carried out under section 28 of the Nigeria Data Protection Act, 2023 (NDPA) and the DPIA requirements of the Nigeria Data Protection Act General Application and Implementation Directive (GAID), 2025${screening.some(([, yes]) => yes) ? ", because the processing is likely to result in a high risk to the rights and freedoms of data subjects" : ""}.</p>
  <table style="text-align:center"><tr><th>Risks identified</th><th>Critical / High (inherent)</th><th>Critical / High (residual)</th><th>Overall residual rating</th></tr>
    <tr style="font-size:16pt;font-weight:700"><td>${risks.length}</td><td>${critical} / ${high}</td><td>${resCritical} / ${resHigh}</td><td style="font-size:12pt">${esc(overall.toUpperCase())}</td></tr></table>
  <h2>Key findings</h2>
  <ul>
    <li><b>Scope of processing.</b> The processing covers ${esc(ctx.ropa.map((e) => e.purpose).join(", ") || "the activities described in Section 5")}${subjects.length ? `, involving data about ${esc(subjects.join(", ").toLowerCase())}` : ""}.${screening.filter(([, y]) => y).length ? ` GAID screening triggers present: ${esc(screening.filter(([, y]) => y).map(([n]) => n.toLowerCase()).join("; "))}.` : ""}</li>
    <li><b>Inherent risk.</b> Before controls, the assessment recorded ${critical} Critical and ${high} High risk${high === 1 ? "" : "s"}${sorted.length ? `, the highest being ${esc(sorted.slice(0, 3).map(({ r, i }) => `${r.description.toLowerCase()} (${R(i)}, score ${score(r)})`).join("; "))}` : ""}.</li>
    <li><b>Residual risk.</b> ${residuals.length < risks.length ? `Residual scores are recorded for ${residuals.length} of ${risks.length} risks. ` : ""}${residuals.length ? (consult ? `${resCritical + resHigh} risk${resCritical + resHigh > 1 ? "s remain" : " remains"} High or Critical after the recommended controls.` : "With the recommended technical and organisational controls implemented, the assessed risks reduce to Low or Medium. No residual risk remains Critical or High.") : "Residual risk has not yet been assessed."}</li>
    <li><b>Conclusion.</b> ${consult ? "A High or Critical residual risk persists, so the Controller must consult the NDPC before commencing or continuing the processing." : "The processing may proceed once the priority actions in Section 10 are completed. Should any High residual risk persist, the Controller must consult the NDPC before commencing or continuing the processing."}</li>
  </ul>
  <h2>Priority recommendations</h2>
  ${top.length ? `<ul>${top.map(({ r, i }) => `<li>${esc(r.mitigation)} (${R(i)}).</li>`).join("")}</ul>` : `<p>${TBC}</p>`}
</section>

<section class="break">
  <h1>2. Scope, Methodology and Legal Basis</h1>
  <h2>2.1 Why a DPIA is required</h2>
  <p>A DPIA is required where processing is likely to result in a high risk to the rights and freedoms of individuals. The following GAID screening triggers were considered:</p>
  <table><tr><th>Screening criterion</th><th style="width:12%">Applies?</th><th>Comment</th></tr>${screening.map(([n, yes, note]) => `<tr><td>${n}</td><td>${yes === null ? TBC : yes ? "Yes" : "No"}</td><td>${esc(note) || (yes === null ? "" : "—")}</td></tr>`).join("")}</table>
  <h2>2.2 Methodology</h2>
  <p>The assessment followed five stages: (1) describe the processing; (2) assess necessity and proportionality against the NDPA data protection principles; (3) identify and score risks to data subjects; (4) identify measures to mitigate each risk; and (5) record residual risk, DPO advice and sign-off.</p>
  <p>Risks were scored on a 5 x 5 matrix: Risk score = Likelihood (1-5) x Impact (1-5). Ratings are Low (1-4), Medium (5-9), High (10-15) and Critical (16-25). Impact is assessed from the perspective of the data subject, including financial loss, identity theft, discrimination, distress and loss of control over personal data.</p>
  <h2>2.3 Legal and regulatory references</h2>
  <ul><li>Nigeria Data Protection Act, 2023 - in particular the principles of processing (s.24), lawful basis (s.25), consent (s.26), data subject rights (ss.34-38), breach notification (s.40), cross-border transfers (ss.41-43) and DPIA (s.28).</li>
  <li>Nigeria Data Protection Act General Application and Implementation Directive (GAID), 2025 - DPIA procedure and content, privacy notices, compliance audit returns, breach notification and DPO obligations.</li>
  <li>Constitution of the Federal Republic of Nigeria, 1999 (as amended), s.37 - right to privacy.</li>
  <li>Sector-specific rules applicable to the Controller${ctx.sector ? ` (${esc(ctx.sector)} sector)` : ""}: ${TBC}</li></ul>
</section>

<section class="break">
  <h1>3. Organisation Identity</h1>
  <p>This section identifies the Controller, any joint controllers and processors, and the persons responsible for data protection.</p>
  <h2>3.1 Data controller</h2>
  <table><tr><td class="k">Legal name</td><td>${esc(org)}</td></tr><tr><td class="k">RC / registration number</td><td>${TBC}</td></tr>
    <tr><td class="k">Registered address</td><td>${v(ctx.address)}</td></tr><tr><td class="k">Sector / industry</td><td>${v(ctx.sector)}</td></tr>
    <tr><td class="k">Website</td><td>${v(str("org_website"))}</td></tr><tr><td class="k">NDPC registration status</td><td>${v(regStatus)}</td></tr>
    <tr><td class="k">NDPC registration number</td><td>${v(regNo)}</td></tr><tr><td class="k">Number of data subjects</td><td>${ctx.subjects6mo ? `At least ${esc(ctx.subjects6mo)} in six months` : TBC}</td></tr></table>
  <h2>3.2 Data Protection Officer</h2>
  <table><tr><td class="k">DPO name</td><td>${v(dpoName)}</td></tr><tr><td class="k">Organisation</td><td>${esc(ctx.dpoName ? org : c.firm_name)}</td></tr>
    <tr><td class="k">Contact email / phone</td><td>${v([str("dpo_email"), str("dpo_phone")].filter(Boolean).join(" / ") || (ctx.dpoName ? null : [c.firm_email, c.firm_phone].filter(Boolean).join(" / ")))}</td></tr>
    <tr><td class="k">Independence confirmed</td><td>${TBC}</td></tr></table>
  <h2>3.3 Senior accountable executive</h2>
  <table><tr><td class="k">Name and title</td><td>${TBC}</td></tr><tr><td class="k">Contact</td><td>${TBC}</td></tr></table>
  <h2>3.4 Processors and recipients</h2>
  ${uniq(ctx.ropa.map((e) => e.recipients)).length ? `<table><tr><th>Entity</th><th>Role / service</th><th>Location</th><th>DPA in place?</th></tr>${uniq(ctx.ropa.map((e) => e.recipients)).map((r) => `<tr><td>${esc(r)}</td><td>${TBC}</td><td>${TBC}</td><td>${TBC}</td></tr>`).join("")}</table>` : `<p>No processors or recipients are recorded for these activities. ${TBC}</p>`}
</section>

<section class="break">
  <h1>4. Product Description</h1>
  <table><tr><td class="k">Product / service name</td><td>${esc(d.title)}</td></tr><tr><td class="k">Version / release stage</td><td>${TBC}</td></tr>
    <tr><td class="k">Product owner</td><td>${v(uniq(ctx.ropa.map((e) => e.department ?? null)).join(", "))}</td></tr><tr><td class="k">Target users</td><td>${v(subjects.join(", "))}</td></tr>
    <tr><td class="k">Delivery channel</td><td>${TBC}</td></tr><tr><td class="k">Technology stack</td><td>${v(uniq(ctx.ropa.map((e) => e.system_owner)).join(", "))}</td></tr>
    <tr><td class="k">Go-live date</td><td>${TBC}</td></tr></table>
  <h2>4.1 Purpose and nature</h2>${prose(body.purpose)}
  <h2>4.2 Key features that affect personal data</h2>${prose(body.method)}
  <h2>4.3 Data flow summary</h2>
  <p>Data subject &gt; Collection point${uniq(ctx.ropa.map((e) => e.system_owner)).length ? ` (${esc(uniq(ctx.ropa.map((e) => e.system_owner)).join(", "))})` : ""} &gt; Application server &gt; Database / storage &gt; ${uniq(ctx.ropa.map((e) => e.recipients)).length ? `Processors and authorised recipients (${esc(uniq(ctx.ropa.map((e) => e.recipients)).join(", "))})` : "Authorised recipients"} &gt; Archive / secure deletion.</p>
</section>

<section class="break">
  <h1>5. Processing Activity</h1>
  <h2>5.1 Description of processing</h2>
  <table><tr><td class="k">Purpose(s) of processing</td><td>${v(ctx.ropa.map((e) => e.purpose).join("; "))}</td></tr>
    <tr><td class="k">Lawful basis (NDPA s.25)</td><td>${v(ctx.ropa.map((e) => `${e.purpose}: ${e.lawful_basis ? LAWFUL_BASIS[e.lawful_basis] : "[To be confirmed]"}`).join("; "))}</td></tr>
    <tr><td class="k">Categories of data subjects</td><td>${v(subjects.join(", "))}</td></tr>
    <tr><td class="k">Volume and frequency</td><td>${ctx.subjects6mo ? `At least ${esc(ctx.subjects6mo)} data subjects in six months; frequency ${TBC}` : TBC}</td></tr>
    <tr><td class="k">Collection method</td><td>See Section 4.2</td></tr><tr><td class="k">Automated decision-making</td><td>${TBC}</td></tr>
    <tr><td class="k">Cross-border transfer</td><td>${transfers.length ? `Yes - ${esc([...(ctx.transferCountries ?? []), ...transfers.map((e) => e.transfer_safeguard ? `safeguard: ${e.transfer_safeguard}` : "")].filter(Boolean).join("; ")) || TBC}` : "No transfer recorded"}</td></tr>
    <tr><td class="k">Storage location</td><td>${TBC}</td></tr></table>
  <h2>5.2 Personal data inventory</h2>
  <table><tr><th>Data category</th><th>Activity</th><th>Lawful basis</th><th>Source</th><th>Retention</th></tr>
  ${ctx.ropa.flatMap((e) => uniq([e.data_categories]).map((cat) => `<tr><td>${esc(cat)}</td><td>${esc(e.purpose)}</td><td>${e.lawful_basis ? esc(LAWFUL_BASIS[e.lawful_basis]) : TBC}</td><td>${TBC}</td><td>${v(e.retention_period)}</td></tr>`)).join("") || `<tr><td colspan="5">${TBC}</td></tr>`}</table>
  <p class="note">Rows are taken from the Controller's Record of Processing Activities (ROPA) and must be confirmed against it.</p>
  <h2>5.3 Data subject rights and transparency</h2>
  <p>Data subjects are able to exercise the rights of access, rectification, erasure, restriction, objection, data portability and the right not to be subject to solely automated decisions (NDPA Part VI). Requests are handled through ${TBC} and answered within 30 days. A layered privacy notice is presented at the point of collection.</p>
</section>

<section class="break">
  <h1>6. Necessity and Proportionality</h1>
  <table><tr><th style="width:30%">NDPA principle (s.24)</th><th>Assessment</th></tr>
    <tr><td>Lawfulness, fairness, transparency</td><td>${P("Lawfulness, fairness and transparency", "A lawful basis has been identified for each purpose and a privacy notice is provided. [Confirm]")}</td></tr>
    <tr><td>Purpose limitation</td><td>${P("Purpose limitation", "Data is collected for specified purposes only; secondary use requires fresh assessment.")}</td></tr>
    <tr><td>Data minimisation</td><td>${P("Data minimisation", "Only data necessary for the stated purposes is collected; optional fields are clearly marked.")}</td></tr>
    <tr><td>Accuracy</td><td>${P("Accuracy", "Users can update their data; periodic data quality checks are scheduled.")}</td></tr>
    <tr><td>Storage limitation</td><td>${P("Storage limitation", "A retention schedule defines retention periods and secure deletion.")}</td></tr>
    <tr><td>Integrity and confidentiality</td><td>${P("Integrity and confidentiality (security)", "Encryption, access controls, logging and vendor assurance are applied.")}</td></tr>
    <tr><td>Accountability</td><td>${P("Accountability", "DPO appointed; ROPA maintained; DPIA documented; annual compliance audit returns filed with the NDPC where applicable.")}</td></tr></table>
  <h2>Necessity of the means</h2>${prose(body.necessity)}
</section>

<section class="break">
  <h1>7. Risk Assessment and Risk Chart</h1>
  <p>${risks.length} risk${risks.length === 1 ? " was" : "s were"} identified to the rights and freedoms of data subjects. Inherent risk is the level of risk before any additional controls; residual risk is the level after the controls in Section 8 are implemented.</p>
  <h2>7.1 Inherent risk register</h2>
  ${risks.length ? `<table><tr><th>ID</th><th>Risk</th><th>Description</th><th>Potential harm</th><th>L</th><th>I</th><th>Score</th></tr>${risks.map((r, i) => `<tr><td>${R(i)}</td><td>${esc(r.description)}</td><td>${v(r.detail)}</td><td>${v(r.harm)}</td><td>${r.likelihood}</td><td>${r.impact}</td><td>${lvl(score(r))}</td></tr>`).join("")}</table>` : `<p>${TBC}</p>`}
  <p class="note">L = Likelihood (1-5); I = Impact (1-5). Scores must be validated by the Controller's DPO and process owners.</p>
  <h2>7.2 Risk heat map</h2>${heat}
  <h2>7.3 Inherent versus residual risk score</h2>${chart}
</section>

<section class="break">
  <h1>8. Risk Treatment and Controls</h1>
  <table><tr><th>ID</th><th>Mitigating controls</th><th>Owner</th><th>Target date</th></tr>${risks.map((r, i) => `<tr><td>${R(i)}</td><td>${v(r.mitigation)}</td><td>${v(r.owner)}</td><td>${r.target_date ? fmtDate(r.target_date) : TBC}</td></tr>`).join("") || `<tr><td colspan="4">${TBC}</td></tr>`}</table>
  ${body.measures?.trim() ? `<h2>General technical and organisational measures</h2>${prose(body.measures)}` : ""}

  <h1 style="margin-top:28px">9. Residual Risk and DPO Opinion</h1>
  <table><tr><th>ID</th><th>Risk</th><th>Inherent</th><th>Residual</th><th>Rating</th><th>Accepted?</th></tr>${risks.map((r, i) => { const n = resid(r); return `<tr><td>${R(i)}</td><td>${esc(r.description)}</td><td>${score(r)}</td><td>${n ?? TBC}</td><td>${n ? lvl(n) : TBC}</td><td>${r.accepted === "yes" ? "Yes" : r.accepted === "no" ? "No" : TBC}</td></tr>`; }).join("")}</table>
  <h2>DPO opinion</h2>
  ${body.conclusion?.trim() && !/^## Outcome\nThe processing may proceed \/ may proceed with the measures above/.test(body.conclusion) ? prose(body.conclusion)
    : `<p>Subject to completion of the controls in Section 8, the Data Protection Officer is of the opinion that the processing complies with the NDPA and GAID requirements and that residual risks to data subjects are ${consult ? "not yet acceptable without NDPC consultation" : "acceptable"}. The processing should not go live (or continue in its current form) until the priority actions marked High priority in Section 10 are closed. This DPIA must be reviewed annually and whenever the nature, scope, purpose or technology of the processing changes materially.</p>`}
</section>

<section class="break">
  <h1>10. Action Plan</h1>
  <table><tr><th>#</th><th>Action</th><th>Priority</th><th>Owner</th><th>Due</th></tr>${sorted.filter(({ r }) => r.mitigation).map(({ r, i }, n) => `<tr><td>${n + 1}</td><td>${esc(r.mitigation)} (${R(i)})</td><td>${score(r) >= 10 ? "High" : score(r) >= 5 ? "Medium" : "Low"}</td><td>${v(r.owner)}</td><td>${r.target_date ? fmtDate(r.target_date) : TBC}</td></tr>`).join("") || `<tr><td colspan="5">${TBC}</td></tr>`}</table>

  <h1 style="margin-top:28px">11. Sign-off and NDPC Consultation</h1>
  <p>If, after applying the controls above, a High residual risk remains, the Controller must consult the Nigeria Data Protection Commission before processing begins. Based on this assessment, prior consultation is: <b>${residuals.length ? (consult ? "Required" : "Not required") : "To be determined once residual risk is assessed"}</b>.</p>
  <table><tr><th>Role</th><th>Name</th><th style="width:25%">Signature</th><th style="width:15%">Date</th></tr>
    <tr><td>DPO (author)</td><td>${v(dpoName)}</td><td></td><td></td></tr><tr><td>Process / product owner</td><td></td><td></td><td></td></tr>
    <tr><td>Senior accountable executive</td><td></td><td></td><td></td></tr><tr><td>Head of IT / Security</td><td></td><td></td><td></td></tr></table>
  <p>Next review date: ${d.review_date ? fmtDate(d.review_date) : "not later than 12 months from sign-off"}.</p>
</section>`;
  return { title: `${org} DPIA Report ${ref} - ${d.title}`, css: CSS(`${org} · DPIA Report ${ref} · CONFIDENTIAL`), body: body_ };
}
