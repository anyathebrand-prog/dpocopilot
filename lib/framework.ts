// Data Protection Framework in the DPCO's framework format (blog/AE_FUNAI_Data_Protection_Framework.docx), tailored to the
// client's structure: departments, DPO, website, data categories, RoPA activities, systems, transfers and retention.
// Aligned to the NDPA 2023 (section references) and the GAID 2025. Unknowns show as [To be confirmed].
import { q, one } from "./db";
import { answersOf } from "./data";
import { list } from "./questionnaire";
import { fmtDate, todayWAT } from "./rules";
import { CSS } from "./car-report";
import { LAWFUL_BASIS } from "./templates";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const TBC = `<span class="muted">[To be confirmed]</span>`;
const ul = (xs: string[]) => `<ul>${xs.map((x) => `<li>${x}</li>`).join("")}</ul>`;
const table = (head: string[], rows: string[][], widths: string[] = []) =>
  `<table><tr>${head.map((h, i) => `<th${widths[i] ? ` style="width:${widths[i]}"` : ""}>${h}</th>`).join("")}</tr>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</table>`;
const box = (title: string, inner: string) => `<table><tr><td style="background:#EEF2FB"><p style="margin:0 0 4px"><b>${title}</b></p>${inner}</td></tr></table>`;
const ref = (s: string) => `<p class="note"><b>Reference:</b> ${s}</p>`;

const SENSITIVE = ["Health information, including medical records", "Biometric data (fingerprints, facial images)", "Genetic data", "Sex life or sexual orientation", "Political opinions or affiliations", "Religious or philosophical beliefs", "Racial or ethnic origin", "Trade union membership", "Data relating to children (enhanced protection, NDPA s.31)"];
const NON_SENSITIVE = ["Names", "Date and place of birth", "State of origin", "Residential and postal addresses", "Email addresses", "Telephone numbers", "National Identification Number (NIN)", "Bank Verification Number (BVN)", "Employee or staff number", "Driver's licence and international passport numbers", "Tax and pension identification numbers", "Voter identification number", "IP addresses and online identifiers", "Photographs and video (including CCTV)"];
const STATUTORY: [string, string][] = [["Financial statements", "6 years"], ["Minute books and statutory registers", "6 years"], ["Banking and financial transaction records", "5 years after the transaction"], ["Accounting records", "7 years"], ["Tax records", "6 years"], ["Health records", "10 years"], ["Employment records", "Duration of employment plus 6 years; pension records indefinitely"], ["Contracts and Memoranda of Understanding", "Duration plus 6 years"], ["CCTV footage", "30 days unless required for an investigation"], ["Other documents and records", "As long as relevant to the purpose, then reviewed"]];

/** Which department plays each incident-response role, matched by name from the client's own department list. */
function roleDept(depts: string[], re: RegExp) {
  const d = depts.filter((x) => re.test(x));
  return d.length ? d.map(esc).join(", ") : TBC;
}

/** Overview, vision and mission from the company profile's text: labelled sections where present, else the opening sentences. */
export function profileExtract(text: string) {
  const t = text.replace(/\s+/g, " ").trim();
  const grab = (label: RegExp) => { const m = label.exec(t); return m ? (t.slice(m.index + m[0].length).match(/^[\s:\-–]*(.{20,400}?[.!])(\s|$)/)?.[1] ?? null) : null; };
  const vision = grab(/\b(our\s+)?vision(\s+statement)?\b/i), mission = grab(/\b(our\s+)?mission(\s+statement)?\b/i);
  const start = /\b(about\s+us|who\s+we\s+are|company\s+overview|corporate\s+profile|overview|introduction)\b/i.exec(t);
  const from = start ? t.slice(start.index + start[0].length) : t;
  const sentences = (from.match(/[^.!?]+[.!?]+/g) ?? []).map((x) => x.trim()).filter((x) => x.length >= 40 && x.length <= 400 && !/vision|mission/i.test(x) && x.replace(/[^a-z]/g, "").length > x.length / 2);
  let overview = "";
  for (const x of sentences) { if (overview.length + x.length > 900) break; overview += (overview ? " " : "") + x; }
  return { overview: overview || null, vision, mission };
}

export async function loadFramework(clientId: string) {
  const c = (await one(`select c.name, c.mi_class, f.name as firm_name, f.signatory_name, f.signatory_title from clients c join firms f on f.id = c.firm_id where c.id = $1`, [clientId]))!;
  const ans = await answersOf(clientId);
  const ropa = await q("select * from ropa_entries where client_id = $1 and state = 'active' order by purpose", [clientId]);
  return { c, ans, ropa };
}

export function frameworkHtml({ c, ans, ropa }: Awaited<ReturnType<typeof loadFramework>>) {
  const s = (k: string) => (typeof ans[k] === "string" && (ans[k] as string).trim() ? (ans[k] as string).trim() : null);
  const org = s("org_legal_name") ?? c.name, short = "the Organisation";
  const depts = list(ans.org_departments), subjects = [...list(ans.subjects), ...list(ans.subjects_other)];
  const categories = list(ans.categories), systems = list(ans.systems), recipients = list(ans.recipients);
  const dpo = s("dpo_name"), dpoContact = [s("dpo_email"), s("dpo_phone")].filter(Boolean).join(" · ");
  const website = s("org_website"), today = fmtDate(todayWAT()), year = todayWAT().slice(0, 4);
  const children = subjects.some((x) => /child|student|pupil|minor/i.test(x));
  const transfers = ans.transfers_yes === "yes" || ropa.some((r) => r.has_transfer);
  const dcpmi = c.mi_class === "major_importance";
  const deptList = depts.length ? depts.map(esc).join(", ") : TBC;
  const profile = ans.org_profile_file as { name?: string; text?: string } | undefined;
  const px = profile?.text ? profileExtract(profile.text) : null;

  const body = `
<section class="cover">
  <p style="font-size:12pt;margin:0"><b>${esc(org)}</b></p>
  <h1 style="font-size:28pt;margin:12px 0">Data Protection Framework</h1>
  <p style="margin:0">Aligned with the Nigeria Data Protection Act, 2023 and the NDPA General Application and Implementation Directive (GAID), 2025</p>
  <p class="muted" style="margin-top:28px">DRAFT · Version 1.0 · ${today}<br>Prepared by ${esc([c.signatory_name, c.firm_name].filter(Boolean).join(", "))}</p>
</section>

<section class="break">
  <h1>Document Control</h1>
  ${table(["Item", "Detail"], [["Organisation", esc(org)], ["Document", "Data Protection Framework (overarching policy and linked policies)"], ["Version", "1.0 (Draft)"], ["Date", today], ["Owner", `Data Protection Officer${dpo ? ` – ${esc(dpo)}` : ""}`], ["Prepared by", esc(c.firm_name)], ["Approved by", "Board of Directors / Governing Council"], ["Review cycle", "Annually, or on any material change in law, GAID guidance or processing"], ["Reference documents", `NDPA 2023; GAID 2025; Record of Processing Activities${profile?.name ? `; Company Profile (${esc(profile.name)})` : ""}`]], ["30%"])}
  <h2>Contents</h2>
  ${ul(["1.0 Data Protection Policy", "2.0 Data Classification Policy", "3.0 Website Privacy Policy", "4.0 Data Protection Impact Assessment Policy", "5.0 Information Security and Incident Response Policy", "6.0 Retention and Disposal Policy", "7.0 Consent Policy", "8.0 Consequences, Review and Approval", "Appendix A – Data Retention Legal Frameworks", "Appendix B – Data Breach Register", "Appendix C – Data Protection Champions"])}
</section>

<section class="break">
  <h1>1.0 Data Protection Policy</h1>
  <h2>1.1 Introduction</h2>
  <p>The Nigeria Data Protection Act 2023 ("NDPA" or "the Act") is the principal legislation governing the collection, processing and storage of the personal data of persons in Nigeria. Its objectives include regulating the processing of personal data, promoting practices that safeguard the security of personal data and the privacy of data subjects, and ensuring that personal data is processed in a fair, lawful and accountable manner. The NDPA General Application and Implementation Directive (GAID) 2025, issued by the Nigeria Data Protection Commission (NDPC), sets out how controllers and processors are to implement the Act.</p>
  <p>The Act provides for sanctions and penalties for breach or non-compliance. To ensure proactive and sustained compliance, ${esc(org)} (hereinafter "${short}") has put together this Data Protection Framework to guide its data protection practice across all its departments and units${depts.length ? `, namely: ${deptList}` : ""}.</p>
  ${px && (px.overview || px.vision || px.mission) ? `<h3>About ${esc(org)}</h3>${px.overview ? `<p>${esc(px.overview)}</p>` : ""}${px.vision ? `<p><b>Vision:</b> ${esc(px.vision)}</p>` : ""}${px.mission ? `<p><b>Mission:</b> ${esc(px.mission)}</p>` : ""}<p class="note">Source: ${esc(org)} Company Profile${profile?.name ? ` (${esc(profile.name)})` : ""}. This framework supports that mission by ensuring the personal data entrusted to ${short} is processed lawfully, fairly and securely.</p>` : ""}
  ${dcpmi ? box("Data Controller of Major Importance", `<p style="margin:0">${esc(org)} is classified as a Data Controller or Processor of Major Importance. It shall remain registered with the NDPC, designate a Data Protection Officer, and file its annual Compliance Audit Return (CAR) through a licensed DPCO, as required by the NDPA (ss.32, 44) and the GAID.</p>`) : ""}
  <h2>1.2 Purpose</h2>
  <p>The purpose of this policy is to describe, define and delimit the scope of ${short}'s responsibilities for protecting the personal data it collects, in line with regulatory requirements. It is the overarching data protection framework that links the policies in Sections 2.0 to 7.0.</p>
  <p>It applies to all employees, contractors, interns and third-party processors of ${short}, to every department and unit, and to personal data in any form (paper, digital text, image, audio, video).</p>
  <h2>1.3 Principles of Processing Personal Data</h2>
  <p>Section 24 of the NDPA requires a data controller or processor to process personal data according to the following principles. Personal data shall be:</p>
  ${ul(["processed in a fair, lawful and transparent manner;", "collected for specified, explicit and legitimate purposes, and not further processed in a way incompatible with those purposes;", "adequate, relevant and limited to the minimum necessary for the purposes for which it was collected or further processed;", "accurate, complete, not misleading and, where necessary, kept up to date;", "retained for not longer than necessary to achieve the lawful basis for which it was collected or further processed; and", "processed in a manner that ensures appropriate security, including protection against unauthorised or unlawful processing, access, loss, destruction, damage or any form of data breach."])}
  <p>${short} shall be accountable for, and able to demonstrate, compliance with these principles (NDPA s.24(3)).</p>
  ${ref("NDPA 2023, s.24; GAID 2025 (principles and accountability).")}
  <h2>1.4 Rights of the Data Subject</h2>
  <p>A data subject is any individual to whom personal data relates. ${subjects.length ? `${short} processes the personal data of the following data subjects: ${subjects.map(esc).join(", ")}.` : ""} Personal data means any information relating to an individual who can be identified, directly or indirectly, by reference to an identifier such as a name, an identification number, location data, an online identifier, or factors specific to the physical, physiological, genetic, psychological, cultural, social or economic identity of that individual.</p>
  <p>The rights of a data subject under Part VI of the Act are:</p>
  ${ul(["The right to be informed and to obtain confirmation of whether personal data about them is being processed, and access to it (ss.27, 34);", "The right to know the period for which the data will be stored or the criteria used to determine it (s.34);", "The right to rectification of inaccurate, incomplete or misleading data (s.34);", "The right to erasure (s.34);", "The right to restrict processing (s.34);", "The right to withdraw consent at any time (s.35);", "The right to object to processing, including for direct marketing (s.36);", "The right not to be subject to a decision based solely on automated processing, including profiling (s.37);", "The right to data portability: to receive their data in a commonly used electronic format (s.38);", "The right to lodge a complaint with the Nigeria Data Protection Commission (s.46)."])}
  <p>Requests are received and logged by the Data Protection Officer${dpoContact ? ` (${esc(dpoContact)})` : ""} and handled within the timelines below.</p>
  ${table(["Data subject request", "Time scale"], [["The right to be informed", "At the point of collection (or within a reasonable time where data is not obtained from the data subject)"], ["The right of access", "Within 7 days, and in any event without undue delay"], ["The right to rectification", "Three clear working days (72 hours)"], ["The right to erasure", "Three clear working days (72 hours)"], ["The right to restrict processing", "Immediately on verification"], ["The right to data portability", "Three clear working days (72 hours)"], ["Rights related to automated decision-making and profiling", "Immediately on request"], ["The right to object", "On receipt of the objection"], ["Withdrawal of consent", "Immediately; processing based on consent stops"]], ["55%"])}
  ${ref("NDPA 2023, Part VI (ss.34–38); GAID 2025 (data subject rights and response timelines).")}
  <h2>1.5 Lawfulness of Processing</h2>
  <p>Processing means any operation performed on personal data, whether or not by automated means, such as collection, recording, organisation, structuring, storage, adaptation, retrieval, use, disclosure, dissemination, alignment, combination, restriction, erasure or destruction. Under s.25 of the NDPA, ${short} shall process personal data only where at least one of the following lawful bases applies:</p>
  ${ul([`<b>1.5.1 Consent:</b> the data subject has given and not withdrawn consent for the specific purpose (s.26).${children ? " Where data relates to a child under 18, consent shall be obtained from a parent or legal guardian and age verified (s.31)." : ""}`, "<b>1.5.2 Contract:</b> processing is necessary to perform a contract to which the data subject is party, or to take steps at their request before entering into one.", "<b>1.5.3 Legal obligation:</b> processing is necessary to comply with a legal obligation to which " + short + " is subject.", "<b>1.5.4 Vital interests:</b> processing is necessary to protect the vital interests of the data subject or another person.", "<b>1.5.5 Public interest:</b> processing is necessary for a task carried out in the public interest or in the exercise of official authority.", "<b>1.5.6 Legitimate interests:</b> processing is necessary for legitimate interests pursued by " + short + " or a third party, which are not overridden by the data subject's rights. Reliance on legitimate interest shall be justified and documented in a Legitimate Interest Assessment, as required by the GAID."])}
  ${ropa.length ? `<p>The lawful basis for each of ${short}'s processing activities is recorded in its Record of Processing Activities (RoPA):</p>${table(["Processing activity", "Lawful basis", "Sensitive data"], ropa.map((r) => [esc(r.purpose), esc((LAWFUL_BASIS as Record<string, string>)[r.lawful_basis] ?? r.lawful_basis), r.involves_sensitive ? "Yes (NDPA s.30 condition required)" : "No"]), ["50%"])}` : ""}
  ${ref("NDPA 2023, ss.25, 26, 30, 31; GAID 2025 (lawful basis, consent, legitimate interest assessment).")}
  <h2>1.6 Data Protection by Design and by Default</h2>
  <p>${short} shall adopt data protection by design and by default, so that every system collecting personal data${systems.length ? ` (including ${systems.map(esc).join(", ")})` : ""} considers and prioritises privacy from the outset. The Data Protection Officer shall be consulted on every new form, system or process that collects personal data. Where processing is likely to result in high risk, a Data Protection Impact Assessment shall be conducted before it begins (Section 4.0). ${short} shall use techniques such as data minimisation and pseudonymisation.</p>
  <h2>1.7 Processing Contracts (Data Processors)</h2>
  <p>Where ${short} engages a data processor, it shall do so only under a written contract that binds the processor to the NDPA, requires it to act only on ${short}'s instructions, to implement appropriate security, to assist with data subject rights and breach notification, and to delete or return data at the end of the contract (NDPA s.29).${recipients.length ? ` Current recipients of personal data include: ${recipients.map(esc).join(", ")}.` : ""}</p>
  <h2>1.8 International Transfers of Personal Data</h2>
  <p>${transfers ? `${short} transfers personal data outside Nigeria${list(ans.transfer_countries).length ? ` (${list(ans.transfer_countries).map(esc).join(", ")})` : ""}. ` : ""}Before transferring any personal data outside Nigeria, ${short} shall ensure that the recipient is subject to a law, binding corporate rules, contractual clauses, code of conduct or certification affording an adequate level of protection, or that one of the conditions in s.43 applies, and shall record the basis and a transfer risk assessment (NDPA ss.41–43; GAID 2025).</p>
  <h2>1.9 Breach Notification</h2>
  <p>In the event of a personal data breach, ${short} shall notify the NDPC within 72 hours of becoming aware of it where it is likely to result in a risk to the rights and freedoms of individuals, and shall notify affected data subjects immediately where it is likely to result in a high risk (NDPA s.40). The procedure is set out in Section 5.0.</p>
  <h2>1.10 Data Protection Officer</h2>
  <p>${short} has designated ${dpo ? `<b>${esc(dpo)}</b>` : TBC} as its Data Protection Officer${dpoContact ? ` (${esc(dpoContact)})` : ""}${s("dpo_cdpo_body") ? `, certified by ${esc(s("dpo_cdpo_body"))}` : ""}. The DPO advises management and staff on their obligations, monitors compliance, trains staff, acts as the contact point for data subjects and the NDPC, and engages ${esc(c.firm_name)} as Data Protection Compliance Organisation (NDPA ss.32–33).</p>
</section>

<section class="break">
  <h1>2.0 Data Classification Policy</h1>
  <h2>2.1 Purpose</h2>
  <p>Personal data is a valuable asset of ${short} and is critical to delivering its services. How personal data is protected and handled depends on its class, in particular whether it is sensitive. Classification determines which security practices apply to each type of personal data.</p>
  <h2>2.2 Data Classification</h2>
  <p>Personal data shall be classified into two major types: non-sensitive personal data and sensitive personal data.</p>
  <h3>Non-sensitive personal data</h3>
  ${ul(NON_SENSITIVE)}
  <h3>Sensitive personal data (NDPA s.30)</h3>
  ${ul(SENSITIVE)}
  ${categories.length ? `<p>${short} has confirmed that it processes the following types of personal data: ${categories.map(esc).join(", ")}.</p>` : ""}
  <h2>2.3 Data Handling or Processing</h2>
  <p>The objective of processing personal data is to achieve ${short}'s operational goals while protecting the legitimate interests of all data subjects. Employees and other covered individuals (contractors, interns, vendors, affiliates) shall observe due care when handling personal data in any form during the course of business. "Handling" includes creating, collecting, accessing, viewing, using, storing, transferring, mailing, managing, preserving, disposing of or destroying personal data.</p>
  <h2>2.4 Policy Statement</h2>
  <p>All personal data processing, whether at rest, in use or in transit, shall be based on the following:</p>
  <h3>2.4.1 Lawfulness, Fairness and Transparency</h3>
  <p>a. Every department and unit${depts.length ? ` (${deptList})` : ""}, and any third-party processor contracted by ${short}, shall ensure that processing is grounded in a lawful basis.<br>b. Before collection, data subjects shall be informed in a privacy notice, in every manual or digital format, of the purpose and nature of the processing (NDPA s.27).</p>
  <h3>2.4.2 Purpose Limitation</h3>
  <p>Personal data collected by any department or unit shall only be collected, stored and used for the processing activities recorded in the RoPA and approved by management.</p>
  <h3>2.4.3 Data Minimisation</h3>
  <p>a. Departments and units shall collect only the minimum data elements necessary for their business objective.<br>b. Physical and digital forms shall request only the minimum data required.<br>c. The DPO shall take part in every form and system design to ensure data protection by design.<br>d. The DPO shall review all data collection processes periodically.</p>
  <h3>2.4.4 Storage Limitation</h3>
  <p>a. Departments shall store personal data in line with the Retention and Disposal Policy (Section 6.0).<br>b. Personal data shall only be stored on ${short}'s authorised storage media${systems.length ? ` (${systems.map(esc).join(", ")})` : ""}.<br>c. Personal data shall be securely deleted at the end of its retention period.<br>d. The DPO shall maintain ${short}'s inventory of personal data and the lifecycle of every data class.</p>
  <h3>2.4.5 Accuracy</h3>
  <p>a. Departments shall ensure that personal data captured and processed is accurate and complete.<br>b. Heads of department shall ensure data is reviewed and corrected before processing.<br>c. Requests for rectification shall be handled promptly, within 72 hours.</p>
  <h3>2.4.6 Security – Integrity and Confidentiality</h3>
  <p>a. The ICT and security teams${roleDept(depts, /ict|i\.t|technolog|information|it\b/i) !== TBC ? ` (${roleDept(depts, /ict|i\.t|technolog|information|it\b/i)})` : ""} shall implement technical and organisational measures to safeguard personal data (NDPA s.39).<br>b. Controls such as encryption and data loss prevention shall protect data at rest and in transit between ${short} and third-party processors.<br>c. In the event of a breach or security incident, the DPO shall lead the response (Section 5.0).</p>
  <h3>2.4.7 Accountability</h3>
  <p>a. ${short} shall ensure all handling and processing is carried out in line with the law and best practice, and keep records that demonstrate it.<br>b. All personal data breaches likely to result in risk shall be reported to the NDPC within 72 hours.</p>
  <h2>2.5 Determining Classification Level</h2>
  <p>Data shall be classified according to the need for confidentiality, integrity and availability. The classification of a data set is based on the most confidential data it contains, even if other data in the set would qualify for a lower level of protection on its own.</p>
  ${table(["Assessment", "Protection level", "Handling"], [["Is it confidential? High need for integrity or availability?", "<b>Level I</b>", `<span style="background:#F8D7DA">STOP! Special care is required</span>`], ["Is it sensitive? Medium need for integrity or availability?", "<b>Level II</b>", `<span style="background:#FFF3CD">Be very cautious</span>`], ["Is it public? Low need for integrity or availability?", "<b>Level III</b>", `<span style="background:#D4EDDA">Proceed with awareness</span>`]], ["50%", "20%"])}
  <h3>2.5.1 Collect Only What is Necessary</h3>
  ${table(["Processing activity", "Level I", "Level II", "Level III"], [["Collect only the minimum amount of data required to fulfil " + short + "'s responsibilities", "Required", "Required", "Required"], ["Collect personal data only as required to achieve the necessary purpose", "Required", "Required", "Not applicable"], ["Retain (electronic or paper) only with written approval", "Required", "Not applicable", "Not applicable"], ["Encrypt at rest and in transit", "Required", "Required", "Recommended"], ["Restrict access by role", "Required", "Required", "Not applicable"]], ["52%"])}
</section>

<section class="break">
  <h1>3.0 Website Privacy Policy</h1>
  <h2>3.1 Purpose</h2>
  <p>This policy sets out what personal data ${short} collects when data subjects visit its website${website ? ` – ${esc(website)}` : ""}. ${short} acts as a data controller under the NDPA and shall provide information on how and why the data is used and the rights data subjects have over it (NDPA s.27).</p>
  <h2>3.2 Using the Website</h2>
  <p>When browsing the website, visitors are prompted to accept cookies, reject non-essential cookies, or set their preferences. Strictly necessary cookies are essential to the operation of the website and do not require consent. Cookies that are not strictly necessary (analytics, marketing) shall not be placed without the visitor's consent.</p>
  ${table(["Cookie name", "Type", "Purpose", "Retention"], [[TBC, "Strictly necessary", "", ""], [TBC, "Analytics", "", ""]])}
  <h2>3.3 Submitting a Question or Enquiry</h2>
  <p>When submitting a question, the visitor's name, phone number and email are required so that ${short} can respond and follow up. This information shall not be used to make any decision that affects the visitor.</p>
  <h2>3.4 Receiving Newsletters</h2>
  <p>To receive newsletters, a visitor's name and email are required and consent is requested. Every newsletter shall contain a link to unsubscribe and withdraw consent. Where a third party sends newsletters on ${short}'s behalf, it shall be bound by a data processing agreement.</p>
  <h2>3.5 Downloading Documents</h2>
  <p>To download a document, the requester's name and email are required (organisation name is optional). The information is used only to send the requested document and confirm delivery.</p>
  <h2>3.6 Submitting a Review</h2>
  <p>When a review is submitted, the reviewer's name and email are recorded and may be held in a third-party system used by ${short}. They shall not be used to make any decision that affects the reviewer.</p>
  <h2>3.7 Rights of the Data Subject</h2>
  <p>a. A data subject may ask what information ${short} holds about them and have it corrected if inaccurate. Where processing is based on consent, consent may be withdrawn at any time.<br>b. Where processing is based on contract or consent, the data subject may request a copy of their personal data.<br>c. A data subject may ask ${short} to restrict the use of their personal data where they reasonably believe it is not being used properly.</p>
  <h2>3.8 Complaints</h2>
  <p>Complaints and concerns shall be sent to the Data Protection Officer${s("dpo_email") ? ` at ${esc(s("dpo_email"))}` : s("org_email") ? ` at ${esc(s("org_email"))}` : ""}. A data subject who is not satisfied may complain to the Nigeria Data Protection Commission.</p>
</section>

<section class="break">
  <h1>4.0 Data Protection Impact Assessment Policy</h1>
  <h2>4.1 Purpose</h2>
  <p>${esc(org)} is committed to protecting the privacy of all relevant parties, including employees, customers and suppliers. ${short} shall ensure that any activity or project involving processing likely to result in high risk is subject to a Data Protection Impact Assessment (DPIA). Under s.28 of the NDPA, a DPIA is a process designed to identify the risks and impact of envisaged processing and the measures to address them.</p>
  <h2>4.2 Main Definitions from the NDPA</h2>
  ${table(["Term", "Definition"], [["Personal data", "Any information relating to an identified or identifiable natural person (s.65)."], ["Processing", "Any operation or set of operations performed on personal data, whether or not by automated means (s.65)."], ["Data controller", "An individual, private entity, public commission, agency or any other body who, alone or jointly with others, determines the purposes and means of processing of personal data (s.65)."], ["Data processor", "An individual, private entity, public authority or any other body who processes personal data on behalf of or at the direction of a data controller or another data processor (s.65)."]], ["22%"])}
  <h2>4.3 When a DPIA is Required</h2>
  <p>${short} shall carry out a DPIA before processing that is likely to result in high risk to data subjects (NDPA s.28), including:</p>
  ${ul(["systematic and extensive evaluation of personal aspects based on automated processing, including profiling, on which decisions with legal or similarly significant effects are based;", "processing on a large scale of sensitive personal data;", "systematic monitoring of a publicly accessible area on a large scale (e.g. CCTV);", "the introduction of new technologies or processing techniques;", "any other processing the NDPC or the GAID identifies as high risk."])}
  <p>Processing shall be scoped by the amount of data, the number of data subjects, the categories of data, the frequency of collection and use, and the geographical locations involved. Where it is unclear whether a DPIA is needed, ${esc(c.firm_name)} (DPCO) shall be consulted.</p>
  ${ropa.some((r) => r.is_high_risk) ? `<p>Activities in the RoPA flagged as high risk: ${ropa.filter((r) => r.is_high_risk).map((r) => esc(r.purpose)).join(", ")}.</p>` : ""}
  <h2>4.4 Describe the Processing</h2>
  <p>A full description of processing in every department and unit shall be documented in ${short}'s Record of Processing Activities. It shall include the objectives of the processing; its necessity; how data is collected, processed and stored; the circumstances of any transfer; who has access; and who is affected.</p>
  <h2>4.5 Assess Necessity and Proportionality</h2>
  ${ul(["What is the lawful basis for processing?", "Could the same outcome be achieved with less data or a less intrusive method?", "How is data quality ensured and data minimised?", "What information is given to data subjects?", "How are data subjects' rights supported?", "How are processors and international transfers controlled?"])}
  <h2>4.6 Identify and Assess Risk</h2>
  <p>Risks to the rights and freedoms of data subjects shall be identified through interviews with heads of department, process owners, data subjects, service providers and recipients. Each risk shall be documented and assigned an owner, then rated for likelihood and impact.</p>
  <h3>Likelihood</h3>
  ${table(["Rating", "Description", "Qualitative definition", "Probability"], [["1", "Rare", "Almost inconceivable; may occur once in 2 years", "&lt; 10%"], ["2", "Unlikely", "May occur once a year", "10% – 30%"], ["3", "Possible", "May occur once every 6 months", "30% – 60%"], ["4", "Likely", "May occur once every 3 months", "60% – 90%"], ["5", "Almost certain", "Will occur monthly or continuously unless action is taken", "&gt; 90%"]], ["10%", "16%"])}
  <h3>Impact</h3>
  ${table(["Rating", "Description", "Summary"], [["1", "Insignificant", "Little or no effect on data subjects."], ["2", "Minor", "A minor issue that does not cause significant damage but needs to be addressed."], ["3", "Moderate", "An issue that may cause significant damage if not addressed in time."], ["4", "Major", "Significant damage to a small number of data subjects, or minor damage to a large number."], ["5", "Critical", "Significant damage to a large number of data subjects."]], ["10%", "16%"])}
  <p>Risk score = likelihood × impact: <b>1–4 Low</b>, <b>5–9 Medium</b>, <b>10–15 High</b>, <b>16–25 Critical</b>. The rationale for each rating shall be documented.</p>
  <h2>4.7 Identify Measures to Reduce Risk</h2>
  <p>Risks above ${short}'s acceptable threshold shall be treated in order of score, by one of: <b>reduction</b> (additional controls), <b>avoidance</b> (modify or cancel the activity), <b>retention</b> (accept where within risk criteria) or <b>transfer</b> (e.g. insurance or outsourcing, without transferring accountability).</p>
  <h2>4.8 DPIA Report, Approval and Prior Consultation</h2>
  <p>A DPIA report shall record the processing, its purposes, necessity and proportionality, the risks, their treatment, owners and timescales, and residual risk. Top management shall approve the report. Where residual risk remains high, ${short} shall consult the NDPC before processing begins (NDPA s.28(2)), providing the responsibilities of controller and processor, the purposes, the proposed measures, the DPO's contact details and the DPIA report.</p>
  <h2>4.9 Responsibilities</h2>
  <p>All employees shall comply with this policy. Heads of department${depts.length ? ` (${deptList})` : ""} shall communicate it and ensure compliance. The process owner initiates the DPIA; the DPO provides input and engages the DPCO; the DPCO conducts the DPIA; top management approves it before any submission to the NDPC.</p>
</section>

<section class="break">
  <h1>5.0 Information Security and Incident Response Policy</h1>
  <h2>5.1 Purpose</h2>
  <p>This procedure is used when an incident affects the information security of ${short}. It defines the roles of those responsible, the types of incident and the reporting requirements, so that ${short} responds quickly and effectively. Security incidents threaten the confidentiality, integrity or availability of information and may be intentional (cyber-attacks, data theft) or unintentional (system failure, human error).</p>
  <h2>5.2 Identifying and Analysing the Incident</h2>
  <p>Incidents may be detected by software tools, employees, or third parties such as ${subjects.length ? subjects.slice(0, 3).map(esc).join(", ").toLowerCase() : "customers"} or suppliers. After detection, an initial assessment shall estimate the impact within ${short}, the affected assets, the duration, the affected business units and the cause, and shall be documented.</p>
  <h2>5.3 Incident Response Team (IRT)</h2>
  <p>Every department and unit shall appoint a Data Protection Champion (Appendix C), who acts as the IRT member for that department. Once the procedure is activated, the team leader ensures members understand their roles and begin containment.</p>
  <h2>5.4 Incident Response Procedure Activation</h2>
  <p>When an incident occurs, the department's Data Protection Champion is notified and records it in the Data Breach Register (Appendix B): date, description, business function affected, process owner, data affected, and device or storage location. The team leader (DPO) decides whether to activate the procedure, which applies where ${short} is at risk of losing information, of disruption to operations, of reputational damage, or of any other significant impact.</p>
  <h2>5.5 IRT Roles and Responsibilities</h2>
  ${table(["Role", "Department", "Responsibilities"], [
    ["Team Leader (DPO)", dpo ? esc(dpo) : TBC, "Evaluates the incident and decides on activation; establishes and manages the IRT; final decision-maker; notifies the NDPC in line with NDPA s.40."],
    ["Team Facilitator", roleDept(depts, /human|hr\b|personnel|people|admin/i), "Advises on HR and contractual matters; secures resources; minutes IRT meetings; manages internal communication and external parties."],
    ["Data Protection Champions", "Each department (Appendix C)", "Inspect the location of the incident; assess impact within their unit; keep the IRT informed."],
    ["ICT", roleDept(depts, /ict|i\.t|technolog|information|it\b|digital/i), "Technical impact assessment, containment, forensics and restoration."],
    ["Business Operations", roleDept(depts, /operation|registry|customer|service|business/i), "Assesses operational and data subject impact; plans communication to stakeholders and data subjects."],
    ["Facility Management", roleDept(depts, /facilit|admin|security|estate|general/i), "Physical security and security presence when required."],
    ["Legal and Regulatory", roleDept(depts, /legal|compliance|regulat|secretar|risk/i), "Determines legal implications; ensures regulatory compliance and alignment with external requirements."],
  ], ["20%", "24%"])}
  <h2>5.6 Containment</h2>
  <p>The IRT shall contain the incident to stop it getting worse (for example, isolating affected systems or disabling compromised accounts). Every action shall be documented in line with digital forensics practice: collected data shall not be altered; an audit trail shall be kept; and photographs, a chronology, who found the incident, where and when, and witness details shall be recorded.</p>
  <h2>5.7 Eradication</h2>
  <p>Actions to fix the cause of the incident and prevent recurrence shall be taken through ${short}'s change management process.</p>
  <h2>5.8 Recovery</h2>
  <p>Systems shall be restored to their pre-incident condition and vulnerabilities addressed with appropriate technical and organisational measures.</p>
  <h2>5.9 Notification</h2>
  ${box("Statutory timelines (NDPA s.40)", ul([`<b>NDPC:</b> within <b>72 hours</b> of becoming aware of a breach likely to result in a risk to the rights and freedoms of individuals, describing the nature of the breach, the categories and approximate numbers of data subjects and records, the likely consequences, and the measures taken.`, `<b>Data subjects:</b> immediately, in plain language, where the breach is likely to result in a high risk to their rights and freedoms, with advice on protecting themselves.`, `<b>Processors</b> shall notify ${short} without undue delay on becoming aware of a breach.`]))}
  <h2>5.10 Activities After the Incident</h2>
  <p>The team leader shall confirm that the situation is restored, recovery is on schedule, residual risk is acceptable and legal obligations are met; otherwise further IRT meetings and stakeholder updates shall follow. A post-incident review shall confirm the documentation is accurate and record lessons learned.</p>
  <h2>5.11 Technical and Organisational Measures</h2>
  ${table(["Technical measures", "Organisational measures"], [["Encryption", "Data Protection Policy"], ["Access control and multi-factor authentication", "Data Protection Officer"], ["Data masking and pseudonymisation", "Employee training and awareness"], ["Firewall and intrusion detection", "Data inventory and RoPA"], ["Regular software updates and patching", "Data Protection Impact Assessments"], ["Data backups", "Incident response plan"], ["Secure coding practices", "Third-party (processor) risk management"], ["Endpoint security", "Data retention schedule"], ["Data classification", "Regular audits and assessments (annual CAR)"], ["Vulnerability management", "Privacy by design"]])}
  ${list(ans.security).length ? `<p>Measures ${short} has confirmed are in place: ${list(ans.security).map(esc).join(", ")}.</p>` : ""}
  ${ref("NDPA 2023, ss.39–40; GAID 2025 (security measures and breach notification).")}
</section>

<section class="break">
  <h1>6.0 Retention and Disposal Policy</h1>
  <h2>6.1 Purpose</h2>
  <p>Record retention and disposal in Nigeria is governed by laws, regulations and guidelines depending on the sector and type of record (Appendix A). This policy defines ${short}'s approach to retaining and disposing of data collected through electronic and manual systems. Records are retained for as long as required to meet legal, administrative and operational requirements, then destroyed or archived in line with the NDPA (s.24(1)(d)) and other applicable laws.</p>
  <p>It covers the creation and organisation, maintenance and retention, security and disposal of records, and applies to all staff and interns, third-party processors, and electronic and hard-copy files.</p>
  <h2>6.2 Definitions</h2>
  ${table(["Term", "Definition"], [["Disposal", "Processes relating to the destruction, transfer or permanent archiving of records."], ["Records", "Any data or information, including letters, pictures, videos, CCTV footage, certificates, licences, hard copies, voicemails, servers, portable media and desktops."], ["Retention", "The condition or length of time for keeping records."]], ["22%"])}
  <h2>6.3 Storage and Disposal of Records</h2>
  <h3>6.3.1 Storage</h3>
  <p>Electronic records shall be stored on secure, access-controlled systems${systems.length ? ` (${systems.map(esc).join(", ")})` : ""}, encrypted where appropriate. Hard-copy records shall be stored in a secure location such as a locked filing room, with protection against fire, theft and other incidents.</p>
  <h3>6.3.2 Disposal and Transfer</h3>
  <p>Where records are transferred to another organisation, a data sharing or processing agreement shall set out how they are archived and who may access them. Access to archived records shall be logged (date, person, reason) and removal recorded (name, designation, contact, signature, expected return date).</p>
  <h3>6.3.3 Destruction</h3>
  <p>Records shall be destroyed securely, by shredding, pulping, incineration, degaussing or secure digital wiping, and evidence of destruction kept in the Data Destruction Catalogue maintained by the DPO.</p>
  <h3>6.3.4 Retention Schedule</h3>
  ${ropa.length ? `<p>Retention periods for ${short}'s processing activities (from the RoPA):</p>${table(["S/N", "Processing activity", "Retention period"], ropa.map((r, i) => [String(i + 1), esc(r.purpose), r.retention_period ? esc(r.retention_period) : TBC]), ["8%"])}` : ""}
  <p>Statutory minimum periods by record type:</p>
  ${table(["S/N", "Type of record", "Retention period"], STATUTORY.map(([t, p], i) => [String(i + 1), t, p]), ["8%"])}
  ${s("retention_default") ? `<p>${short}'s default retention period: ${esc(s("retention_default"))}.${s("retention_notes") ? ` Exceptions: ${esc(s("retention_notes"))}.` : ""}</p>` : ""}
  <p>Personal data shall not be retained longer than needed for its purpose and shall be disposed of securely once the retention period lapses.</p>
  <h3>6.3.5 Responsibilities</h3>
  <p>All employees shall comply with records management requirements; heads of department shall ensure compliance in their departments. Records containing personal data due for destruction shall be logged in the Data Destruction Catalogue and destroyed only with senior management approval. Before destroying major data sets, the DPO shall consider whether a DPIA is needed.</p>
  <h3>6.3.6 Training and Awareness</h3>
  <p>Management shall ensure all staff are trained on this policy and on the steps for storing and disposing of records.</p>
</section>

<section class="break">
  <h1>7.0 Consent Policy</h1>
  <p>Where ${short} relies on consent, consent shall be freely given, specific, informed and unambiguous, given by a clear affirmative act, and as easy to withdraw as to give (NDPA s.26). ${short} shall be able to demonstrate that consent was obtained and shall keep a record of it.${children ? " Consent for a child under 18 shall be given by a parent or legal guardian (s.31)." : ""}</p>
  <h2>7.1 Consent Provision Form</h2>
  <p>I, [data subject name], hereby give my consent to ${esc(org)} to process my personal data for the purpose of [purpose of processing], as described in the privacy notice [document name], for the period required.</p>
  ${table(["Field", "Entry"], [["Data subject name", ""], ["Email", ""], ["Date (YYYY/MM/DD)", ""], ["Department / Unit", ""], ["Type of personal data", ""], ["Request processed by", ""], ["Data Protection Officer", dpo ? esc(dpo) : ""], ["Signature", ""]], ["35%"])}
  <h2>7.2 Consent Withdrawal Form</h2>
  <p>I, [data subject name], withdraw the consent I gave to ${esc(org)} to process my personal data for the purpose of [purpose of processing] under the privacy notice [document name].</p>
  ${table(["Field", "Entry"], [["Data subject name", ""], ["Email", ""], ["Date (YYYY/MM/DD)", ""], ["Department / Unit", ""], ["Request processed by", ""], ["Data Protection Officer", dpo ? esc(dpo) : ""], ["Signature", ""]], ["35%"])}
</section>

<section class="break">
  <h1>8.0 Consequences, Review and Approval</h1>
  <h2>8.1 Consequences</h2>
  <p>Employees who violate this framework may be subject to disciplinary action under ${short}'s administrative procedures. Breaches by contractors or processors may lead to termination of contract. Non-compliance with the NDPA can expose ${short} to sanctions by the NDPC, including fines of up to the higher of ₦10,000,000 or 2% of annual gross revenue for a data controller of major importance (₦2,000,000 or 2% otherwise) (NDPA s.48).</p>
  <h2>8.2 Policy Review and Updates</h2>
  <p>This framework shall be reviewed at least annually and updated to reflect changes in the NDPA, the GAID and other NDPC guidance, best practice and ${short}'s needs. The review shall involve the DPO, ${esc(c.firm_name)} as DPCO, and heads of department. Changes shall be communicated to employees and data subjects promptly.</p>
  <h2>8.3 Approval</h2>
  ${table(["", "Name", "Signature", "Date"], [["Approved by (Board / Governing Council)", "", "", ""], ["Data Protection Officer", dpo ? esc(dpo) : "", "", ""], ["Effective date", "", "", ""]], ["34%"])}
</section>

<section class="break">
  <h1>Appendix A – Data Retention Legal Frameworks</h1>
  ${table(["S/N", "Reference", "Details"], [
    ["1", "Evidence Act, 2011", "Documents must be kept for as long as they are relevant as evidence in legal proceedings. Section 89 allows secondary evidence where the original was lawfully destroyed."],
    ["2", "Freedom of Information Act, 2011", "Public institutions must keep records properly organised and accessible (s.2)."],
    ["3", "Companies and Allied Matters Act (CAMA), 2020", "Companies must keep financial statements, minute books and registers; accounting records for at least six years (s.375)."],
    ["4", "Money Laundering (Prevention and Prohibition) Act, 2022 and CBN AML/CFT Regulations", "Financial institutions must retain customer and transaction records for at least five years after the transaction or relationship ends."],
    ["5", "Financial Regulations", "Government agencies must keep accounting records for at least seven years."],
    ["6", "Tax laws (FIRS Establishment Act, PITA, VAT Act)", "Taxpayers must keep records of income, expenses and related documents for at least six years."],
    ["7", "National Health Act, 2014", "Health institutions must retain medical records for a specified period, typically five to ten years."],
    ["8", "Labour Act and Pension Reform Act, 2014", "Employers must keep employee records; pension records are kept indefinitely."],
    ["9", "Nigeria Data Protection Act, 2023", "Personal data shall be retained only for as long as necessary for the lawful purpose, or as required by law (s.24(1)(d))."],
    ["10", "Cybercrimes (Prohibition, Prevention, etc.) Act, 2015 (as amended 2024)", "Service providers must retain traffic data and subscriber information for two years; disposal must preserve confidentiality."],
    ["11", "National Archives Act, 1957", "Public records of enduring value must be transferred to the National Archives of Nigeria."],
  ], ["7%", "30%"])}
</section>

<section class="break">
  <h1>Appendix B – Data Breach Register</h1>
  <p>Each department's Data Protection Champion records incidents in this register and notifies the DPO immediately.</p>
  ${table(["Date", "Description", "Function affected", "Process owner", "Data affected", "Device / repository", "Reported to DPO"], [["", "", "", "", "", "", ""], ["", "", "", "", "", "", ""], ["", "", "", "", "", "", ""]])}
</section>

<section>
  <h1>Appendix C – Data Protection Champions</h1>
  <p>Each department and unit shall nominate a Data Protection Champion who promotes compliance locally, keeps the department's entries in the RoPA up to date, and acts as its Incident Response Team member.</p>
  ${table(["Department / Unit", "Data Protection Champion", "Processing activities (RoPA)"], (depts.length ? depts : ["[Department]"]).map((d) => [esc(d), "", ropa.filter((r) => r.department && r.department.toLowerCase() === d.toLowerCase()).map((r) => esc(r.purpose)).join(", ") || "—"]), ["30%", "30%"])}
  ${depts.length ? "" : `<p class="note">Add the organisation's departments under Onboarding to list them here.</p>`}
</section>`;
  return { title: `${org} Data Protection Framework ${year}`, css: CSS(`${org} · Data Protection Framework · Draft`), body };
}
