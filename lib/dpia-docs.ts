// DPIA supporting documents: read their text and turn what they say into evidence for the 13 steps.
// Rule-based (no AI needed): it finds systems, data fields, hosting and transfers, security controls, roles, integrations,
// retention, consent and breach handling, and quotes short excerpts with their source document. Each step gets a
// "From the uploaded documents" section; everything else in the step is kept, so the DPCO's edits survive a re-run.
import { q } from "./db";
import { pdfText, docxText } from "./certificate";
import { DPIA_STEPS, type DpiaBody, type Risk } from "./templates";
import { DPIA_DOCS } from "./dpia-draft";

export const DOC_HEADING = "## From the uploaded documents";
const MAX = 80_000;

/** Text of an uploaded document (PDF, Word, text/CSV); "" when it can't be read (scans, images, spreadsheets). */
export async function documentText(f: File): Promise<string> {
  const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
  const bytes = new Uint8Array(await f.arrayBuffer());
  const t = ext === "pdf" ? await pdfText(bytes) : ext === "docx" ? await docxText(bytes) : ["txt", "csv", "md"].includes(ext) ? new TextDecoder().decode(bytes) : "";
  return t.replace(/\u0000/g, "").slice(0, MAX);
}

/** Keep a document's text with the file, for analysis and for AI drafting. */
export async function saveDocumentText(fileId: string, f: File) {
  const t = await documentText(f);
  await q("update files set text_content = $2 where id = $1", [fileId, t || null]);
  return t.length > 0;
}

export type Doc = { name: string; text: string };
export const dpiaDocuments = (dpiaId: string) =>
  q<Doc & { readable: boolean }>("select original_name as name, coalesce(text_content, '') as text, text_content is not null as readable from files where dpia_id = $1 order by created_at", [dpiaId]);

// ---------- analysis ----------

const TYPES: [string, RegExp][] = [
  ["System Architecture Diagram", /architect/i], ["Data Flow Diagram", /data[\s_-]*flow|\bdfd\b/i], ["Database Design / Schema", /schema|database design|\berd\b|entity[\s-]relationship/i],
  ["System Requirements Specification", /requirement|\bsrs\b|specification/i], ["User Access and Role Matrix", /role|access matrix|rbac|permission/i],
  ["Information Security Policy", /security policy|infosec|information security/i], ["Data Retention and Disposal Policy", /retention|disposal/i],
  ["Encryption and Backup Documentation", /encrypt|backup|disaster recovery/i], ["API and Third-Party Integration Documentation", /\bapi\b|integration|third[\s-]party|vendor/i],
  ["Incident and Breach Management Procedures", /incident|breach/i], ["Privacy Policy and Consent Mechanism", /privacy|consent|cookie/i],
  ["Hosting and Cloud Infrastructure Documentation", /hosting|cloud|infrastructure|data cent(re|er)/i],
];
/** Which of the 12 documents a file is: by its name first, then by its opening text. */
export function docType(d: Doc) {
  return TYPES.find(([, re]) => re.test(d.name))?.[0] ?? TYPES.find(([, re]) => re.test(d.text.slice(0, 600)))?.[0] ?? null;
}

type Term = [label: string, re: RegExp];
const T = (label: string, re: string): Term => [label, new RegExp(re, "i")];
const DATA: Term[] = [T("Full name", "\\b(full[\\s_-]?name|first[\\s_-]?name|surname|last[\\s_-]?name)\\b"), T("Email address", "\\be-?mail\\b"), T("Phone number", "\\b(phone|mobile|msisdn|telephone)\\b"),
  T("Home address", "\\b(home|residential|postal|street)[\\s_-]?address\\b"), T("Date of birth", "\\b(date[\\s_-]of[\\s_-]birth|dob|birth[\\s_-]?date)\\b"), T("BVN", "\\bbvn\\b|bank verification number"),
  T("NIN", "\\bnin\\b|national identification number"), T("Passport or ID document", "\\b(passport|driver'?s licen[cs]e|voter'?s card|id card)\\b"), T("Bank account details", "\\b(account[\\s_-]?number|iban|bank[\\s_-]?account|sort code)\\b"),
  T("Payment card data", "\\b(card[\\s_-]?number|pan\\b|cvv|card[\\s_-]?holder)"), T("Salary or payroll data", "\\b(salary|payroll|pension|tax[\\s_-]?id|tin)\\b"), T("Location data", "\\b(gps|geo-?location|latitude|longitude)\\b"),
  T("IP address / device identifiers", "\\b(ip[\\s_-]?address|device[\\s_-]?id|imei|cookie id)\\b"), T("Photographs or CCTV footage", "\\b(photo(graph)?|cctv|video footage|selfie)\\b")];
const SENSITIVE: Term[] = [T("Health or medical data", "\\b(health|medical|diagnos|patient|clinical|prescription)"), T("Biometric data", "\\b(biometric|fingerprint|facial recognition|face id|iris)\\b"),
  T("Religious or philosophical beliefs", "\\breligio"), T("Ethnic origin", "\\b(ethnic|tribe)\\b"), T("Political opinions", "\\bpolitical (opinion|affiliation)"), T("Sex life or sexual orientation", "\\bsexual orientation\\b"), T("Children's data", "\\b(child(ren)?|minor|under 18|pupil)\\b")];
const DBS: Term[] = ["PostgreSQL|postgres", "MySQL", "MariaDB", "Oracle( Database| DB)?", "SQL Server|MSSQL", "MongoDB", "Redis", "Firebase|Firestore", "DynamoDB", "Elasticsearch", "Cassandra", "SQLite"].map((x) => T(x.split("|")[0].replace(/\(.*\)\??/, ""), `\\b(${x})\\b`));
const HOSTS: Term[] = [T("Amazon Web Services (AWS)", "\\b(aws|amazon web services|ec2|s3 bucket|rds)\\b"), T("Microsoft Azure", "\\bazure\\b"), T("Google Cloud", "\\b(google cloud|gcp|bigquery)\\b"), T("Oracle Cloud", "\\boracle cloud|\\boci\\b"),
  T("DigitalOcean", "\\bdigitalocean\\b"), T("Huawei Cloud", "\\bhuawei cloud\\b"), T("Heroku", "\\bheroku\\b"), T("Vercel", "\\bvercel\\b"), T("Cloudflare", "\\bcloudflare\\b")];
const LOCAL: Term[] = [T("Hosted in Nigeria", "\\b(hosted in nigeria|nigeria(n)? data cent|rack centre|mainone|md(x)?i|galaxy backbone|cloudvantage|kasi|digital realty lagos|lagos data cent)")];
const ABROAD: Term[] = ["United States|USA|U\\.S\\.", "United Kingdom|UK", "Ireland", "Germany", "Netherlands", "France", "South Africa", "India", "Singapore", "Canada", "United Arab Emirates|UAE|Dubai", "Kenya", "Ghana", "China", "Brazil", "Japan", "Australia", "Belgium", "Sweden", "Switzerland"]
  .map((x) => T(x.split("|")[0], `\\b(${x})\\b`)).concat([T("Cloud region abroad", "\\b(us|eu|ap|af|me|ca|sa)-(east|west|north|south|central|southeast|northeast)-\\d\\b")]);
const PARTIES: Term[] = ["Paystack", "Flutterwave", "Interswitch", "Remita", "Stripe", "PayPal", "Monnify", "Opay", "Moniepoint", "Twilio", "Termii", "Africa's Talking", "SendGrid", "Mailchimp", "Mailgun", "Resend", "Google Analytics", "Google Workspace", "Microsoft 365|Office 365",
  "Salesforce", "HubSpot", "Zendesk", "Freshdesk", "Intercom", "Slack", "Zoho", "SAP", "Oracle EBS", "Sage", "QuickBooks", "Dojah", "Smile ID|SmileID", "Youverify", "Prembly|IdentityPass", "Mono", "Okra", "Firebase", "OneSignal", "WhatsApp", "Meta Pixel|Facebook Pixel", "Hotjar", "Sentry", "Datadog", "Auth0", "Okta"]
  .map((x) => T(x.split("|")[0], `\\b(${x})\\b`));
const CONTROLS: Term[] = [T("Encryption at rest", "encrypt\\w*[^.\\n]{0,40}\\bat rest|at[- ]rest encrypt|\\baes[- ]?(128|256)\\b|transparent data encryption|\\btde\\b"), T("Encryption in transit (TLS/HTTPS)", "\\btls\\s?1\\.[23]|\\bhttps\\b|in transit|\\bssl\\b"),
  T("Multi-factor authentication", "\\b(mfa|2fa|multi[- ]factor|two[- ]factor|otp)\\b"), T("Role-based access control", "\\b(rbac|role[- ]based|least privilege|access control)"), T("Single sign-on", "\\b(sso|single sign[- ]on|saml|oauth|openid)\\b"),
  T("Audit logging and monitoring", "\\b(audit (log|trail)|logging|siem|monitoring)\\b"), T("Backups", "\\bbackups?\\b"), T("Disaster recovery (RPO/RTO)", "\\b(disaster recovery|rpo|rto|failover)\\b"),
  T("Penetration testing / vulnerability scanning", "\\b(penetration test|pen[- ]?test|vulnerability (scan|assessment))"), T("Firewall / WAF", "\\b(firewall|waf)\\b"), T("Data masking / pseudonymisation", "\\b(mask(ing|ed)|pseudonym|anonymi[sz]|tokeni[sz])"),
  T("Key management", "\\b(kms|key management|hsm|key vault)\\b"), T("Staff training", "\\b(security awareness|staff training|training programme)\\b")];
const AUTOMATED: Term[] = [T("Automated decision-making or scoring", "\\b(automated decision|credit scor|risk scor|auto[- ]?approv|auto[- ]?reject|eligibility engine)"), T("Profiling", "\\bprofiling\\b"),
  T("Machine learning / AI", "\\b(machine learning|\\bml model|artificial intelligence|\\bai model|neural|predictive model)"), T("Batch or scheduled jobs", "\\b(cron|batch job|scheduled job|etl)\\b")];
const CHANNELS: Term[] = [T("Web forms / website", "\\b(web form|website|web portal|landing page)\\b"), T("Mobile app", "\\b(mobile app|android|ios app)\\b"), T("APIs", "\\b(rest api|api endpoint|graphql|webhook)\\b"),
  T("USSD", "\\bussd\\b"), T("Paper forms", "\\bpaper form"), T("Call centre / phone", "\\b(call cent(re|er)|ivr)\\b"), T("Email", "\\bvia email|by email\\b"), T("Branch / walk-in", "\\b(branch|walk-in|front desk)\\b")];
const ROLES: Term[] = ["Super ?admin", "Administrator|Admin", "Supervisor", "Manager", "Agent", "Operator", "Auditor", "Analyst", "Developer", "Support", "Finance", "Customer|End user", "Read[- ]only|Viewer"]
  .map((x) => T(x.split("|")[0].replace(" ?", " ").replace("[- ]", "-"), `\\b(${x})\\b`));

const found = (terms: Term[], docs: Doc[]) => terms.map(([label, re]) => ({ label, in: docs.filter((d) => re.test(d.text)).map((d) => d.name) })).filter((x) => x.in.length);
const src = (names: string[]) => ` (${[...new Set(names)].slice(0, 3).join("; ")}${names.length > 3 ? "; …" : ""})`;
const line = (x: { label: string; in: string[] }) => `${x.label}${src(x.in)}`;
/** Up to `n` short sentences matching `re`, with their source. */
function quotes(docs: Doc[], re: RegExp, n = 3) {
  const out: string[] = [];
  for (const d of docs) for (const s of d.text.replace(/\s+/g, " ").split(/(?<=[.!?])\s+/)) {
    if (out.length >= n) return out;
    if (s.length >= 25 && s.length <= 260 && re.test(s)) out.push(`"${s.trim()}"${src([d.name])}`);
  }
  return out;
}

export type Findings = { reviewed: Doc[]; unreadable: string[]; sections: Partial<Record<string, string[]>>; risks: Risk[] };

export function analyseDocuments(all: (Doc & { readable?: boolean })[]): Findings {
  const docs = all.filter((d) => d.text.trim());
  const unreadable = all.filter((d) => !d.text.trim()).map((d) => d.name);
  const s: Record<string, string[]> = {};
  const add = (k: string, ...xs: string[]) => { if (xs.length) (s[k] ??= []).push(...xs); };
  const data = found(DATA, docs), sens = found(SENSITIVE, docs), dbs = found(DBS, docs), hosts = found(HOSTS, docs), local = found(LOCAL, docs), abroad = found(ABROAD, docs);
  const parties = found(PARTIES, docs), controls = found(CONTROLS, docs), auto = found(AUTOMATED, docs), channels = found(CHANNELS, docs), roles = found(ROLES, docs);
  const types = new Map(all.map((d) => [d.name, docType(d)]));
  const have = new Set(types.values());
  const missing = DPIA_DOCS.filter((t) => !have.has(t));

  // 1 Screening
  add("screening", ...[sens.length && `Sensitive personal data appears in the documents: ${sens.map(line).join("; ")}`, auto.length && `Automated processing or profiling: ${auto.map(line).join("; ")}`,
    abroad.length && `Possible processing or hosting outside Nigeria: ${abroad.map(line).join("; ")}`, found([T("New technology", "\\b(biometric|facial recognition|machine learning|artificial intelligence|blockchain|iot)\\b")], docs).length && "New or innovative technology is described in the documents",
  ].filter((x): x is string => !!x));
  // 2 Purpose
  add("purpose", ...quotes(docs, /\b(purpose|objective|aims? to|is used to|enables?|allows? (users|customers|staff))\b/i, 3));
  // 3 Method
  add("method", ...[channels.length && `How data is collected: ${channels.map(line).join("; ")}`, dbs.length && `Databases: ${dbs.map(line).join("; ")}`, hosts.length && `Hosting: ${hosts.map(line).join("; ")}`,
    auto.length && `Automated processing: ${auto.map(line).join("; ")}`, parties.length && `Integrated services: ${parties.map(line).join("; ")}`].filter((x): x is string => !!x));
  // 4 Legal grounds
  add("lawful_basis", ...quotes(docs, /\b(consent|opt[- ]?in|lawful basis|legitimate interest|contract(ual)? necessity|legal obligation)\b/i, 4));
  // 5 Necessity
  add("necessity", ...[data.length && `Personal data fields in the documents: ${data.map((x) => x.label).join(", ")}`, sens.length && `Sensitive fields: ${sens.map((x) => x.label).join(", ")}`].filter((x): x is string => !!x),
    ...quotes(docs, /\b(retain|retention|kept for|stored for|deleted after|purged|disposal)\b[^.]{0,120}\b\d+\s*(year|month|day|week)s?\b|\b\d+\s*(year|month|day)s?\b[^.]{0,80}\b(retain|retention|delete|purge)/i, 3));
  // 6 Stakeholders
  add("stakeholders", ...[roles.length && `Roles with access: ${roles.map(line).join("; ")}`, parties.length && `Third parties and processors: ${parties.map(line).join("; ")}`].filter((x): x is string => !!x));
  // 7 CIA risks
  const absent = CONTROLS.filter(([l]) => ["Encryption at rest", "Encryption in transit (TLS/HTTPS)", "Multi-factor authentication", "Backups", "Audit logging and monitoring"].includes(l) && !controls.some((c) => c.label === l)).map(([l]) => l);
  add("risks_cia", ...[controls.length && `Controls described: ${controls.map((c) => c.label).join(", ")}`, absent.length && `Not evidenced in the documents (check): ${absent.join(", ")}`,
    parties.length && `Data shared with ${parties.length} integrated service${parties.length > 1 ? "s" : ""}, each a confidentiality risk if not under contract`].filter((x): x is string => !!x));
  // 8 Harms
  add("harms", ...[data.some((d) => /BVN|NIN|Bank|card|Passport/.test(d.label)) && "Financial or identity data is processed (fraud and identity theft risk)", sens.length && `Sensitive data could cause discrimination or serious distress if disclosed: ${sens.map((x) => x.label).join(", ")}`,
    auto.length && "Automated decisions could unfairly deny services without human review"].filter((x): x is string => !!x));
  // 9 Transfers
  add("transfers", ...[local.length && `In-country hosting mentioned: ${local.map(line).join("; ")}`, abroad.length && `Countries or regions outside Nigeria mentioned: ${abroad.map(line).join("; ")}`,
    hosts.length && `Cloud providers: ${hosts.map(line).join("; ")}. Confirm the hosting region.`].filter((x): x is string => !!x), ...quotes(docs, /\b(standard contractual clauses|adequacy|transfer impact|cross[- ]border)\b/i, 2));
  // 10 Principles and rights
  add("principles_rights", ...quotes(docs, /\b(data subject|right to (access|erasure|rectif|object|portab)|subject access|withdraw (their )?consent|opt[- ]?out|unsubscribe)\b/i, 4));
  // 12 Measures
  add("measures", ...controls.map(line), ...quotes(docs, /\b(backup|replicat)\w*\b[^.]{0,100}\b(daily|hourly|weekly|every|nightly|real[- ]time)\b/i, 2));
  // 13 Outcome: documents reviewed
  add("conclusion", ...all.map((d) => `${d.name}${types.get(d.name) ? ` — ${types.get(d.name)}` : ""}${d.text.trim() ? "" : " (no readable text; review manually)"}`),
    ...(missing.length ? [`Not yet provided: ${missing.join("; ")}`] : []), ...quotes(docs, /\b(72 hours|notify (the )?(ndpc|commission|regulator)|breach notification|incident response)\b/i, 2));

  // Risks the documents point to, beyond the standard list.
  const risks: Risk[] = [];
  if (sens.length) risks.push({ description: "Disclosure of sensitive personal data", detail: `Documents show ${sens.map((x) => x.label.toLowerCase()).join(", ")}`, harm: "Discrimination, exclusion, serious distress", likelihood: 2, impact: 5, mitigation: "Explicit consent or another s.30 condition; restricted access; encryption; additional logging", owner: "DPO / IT" });
  if (found([T("x", "\\b(biometric|facial recognition|machine learning|artificial intelligence)\\b")], docs).length) risks.push({ description: "Use of new technology (AI or biometrics)", detail: "Biometric or AI processing described in the system documents", harm: "Unfair or opaque outcomes, misidentification", likelihood: 3, impact: 4, mitigation: "Human review of outcomes, accuracy testing, transparency notice, DPO sign-off before go-live", owner: "Product owner / DPO" });
  return { reviewed: docs, unreadable, sections: s, risks };
}

/** Write the findings into a DPIA body: each step's "From the uploaded documents" section is replaced; the rest is kept. */
export function applyFindings(body: DpiaBody, f: Findings): { body: DpiaBody; steps: number } {
  const out: DpiaBody = { ...body };
  let steps = 0;
  for (const st of DPIA_STEPS) {
    if (st.key === "scoring") continue;
    const cur = out[st.key] ?? "", i = cur.indexOf(DOC_HEADING);
    const kept = (i >= 0 ? cur.slice(0, i) : cur).trimEnd();
    const lines = f.sections[st.key];
    out[st.key] = lines?.length ? `${kept}${kept ? "\n\n" : ""}${DOC_HEADING}\n${lines.map((l) => `- ${l}`).join("\n")}` : kept;
    if (lines?.length) steps++;
  }
  const list = out.risks_list ?? [];
  for (const r of f.risks) if (!list.some((x) => x.description.toLowerCase() === r.description.toLowerCase())) list.push(r);
  out.risks_list = list;
  return { body: out, steps };
}

/** Short excerpts of each document, for the AI drafter. */
export const docFacts = (docs: Doc[]) => docs.filter((d) => d.text.trim()).map((d) => ({ document: d.name, type: docType(d), excerpt: d.text.replace(/\s+/g, " ").slice(0, 4000) })).slice(0, 12);
