// LIA supporting documents → evidence for the LIA's written answers. Same rule-based reading as the DPIA (lib/dpia-docs):
// each answer it has evidence for gets a "[From the uploaded documents]" part; the rest of the answer is kept, so edits
// survive a re-run. Choice answers (Met / Not met, Low / Med / High) are left to the assessor.
import { q } from "./db";
import { DATA, SENSITIVE, DBS, HOSTS, PARTIES, CONTROLS, CHANNELS, ROLES, found, line, quotes, type Doc } from "./dpia-docs";
import { LIA_DOCS } from "./assessments";

export const LIA_MARK = "[From the uploaded documents]";

const LIA_TYPES: [string, RegExp][] = [
  ["Business Case / Project Proposal", /business case|proposal/i], ["Organisational Objectives and Policies", /objective|strategy|corporate polic/i], ["Business Process Documentation", /business process|process map|workflow/i],
  ["Standard Operating Procedures", /\bsop\b|standard operating/i], ["Management Justification / Approval", /justification|approval|board|memo/i], ["Privacy Policy", /privacy (policy|notice)/i],
  ["Data Collection Forms", /\b(data[\s_-]*collection|forms?|questionnaire)\b/i], ["Data Retention Policy", /retention/i], ["Data Sharing Agreements", /sharing agreement|\bdsa\b|\bdpa\b|processing agreement/i], ["System Architecture", /architect/i],
  ["Data Flow Diagram", /data[\s_-]*flow|\bdfd\b/i], ["User Access Control Matrix", /access|role|rbac|matrix/i], ["Information Security Policy", /security policy|infosec|information security/i],
  ["Data Encryption and Backup Policy", /encrypt|backup/i], ["Incident and Breach Management Policy", /incident|breach/i], ["Third-Party Integration Documentation", /integration|third[\s-]party|\bapi\b|vendor/i],
];
export const liaType = (d: Doc) => LIA_TYPES.find(([, re]) => re.test(d.name.replace(/[-_.]+/g, " ")))?.[0] ?? LIA_TYPES.find(([, re]) => re.test(d.text.slice(0, 600)))?.[0] ?? null;

/** Evidence for each LIA answer key, as lines. */
export function analyseLia(all: Doc[]): { add: Record<string, string[]>; read: number; unreadable: string[] } {
  const docs = all.filter((d) => d.text.trim());
  const a: Record<string, string[]> = {};
  const put = (k: string, ...xs: (string | false | 0 | undefined)[]) => { const v = xs.filter((x): x is string => !!x); if (v.length) (a[k] ??= []).push(...v); };
  const data = found(DATA, docs), sens = found(SENSITIVE, docs), dbs = found(DBS, docs), hosts = found(HOSTS, docs), parties = found(PARTIES, docs);
  const controls = found(CONTROLS, docs), channels = found(CHANNELS, docs), roles = found(ROLES, docs);
  const masking = controls.filter((c) => /masking|pseudonym/i.test(c.label));
  const types = new Map(all.map((d) => [d.name, liaType(d)]));
  const have = new Set(types.values());

  // Context
  put("business_owner", ...quotes(docs, /\b(business owner|process owner|system owner|project sponsor|responsible (officer|department)|owned by)\b/i, 2));
  put("description", ...quotes(docs, /\b(step \d|the process|procedure|workflow|is used to|will be used to)\b/i, 3),
    `Documents reviewed: ${all.map((d) => `${d.name}${types.get(d.name) ? ` (${types.get(d.name)})` : ""}`).join("; ")}`,
    LIA_DOCS.filter((t) => !have.has(t)).length > 0 && `Not yet provided: ${LIA_DOCS.filter((t) => !have.has(t)).join("; ")}`);
  put("systems", dbs.length && `Databases: ${dbs.map(line).join("; ")}`, hosts.length && `Hosting: ${hosts.map(line).join("; ")}`, parties.length && `Processors and integrated services: ${parties.map(line).join("; ")}`);
  put("frequency", ...quotes(docs, /\b(daily|weekly|monthly|quarterly|annually|real[- ]time|go[- ]live|launch|start date)\b/i, 2));
  put("scale", ...quotes(docs, /\b\d[\d,.]*\s*(k|m|million|thousand)?\s*(customers|users|records|data subjects|subscribers|employees|members|accounts)\b/i, 2));
  put("source", channels.length && `Collected through: ${channels.map(line).join("; ")}`, ...quotes(docs, /\b(collected (directly|from)|obtained from|provided by (the )?(customer|user|third party)|third[- ]party source)\b/i, 2));
  put("retention", ...quotes(docs, /\b(retain|retention|kept for|stored for|deleted after|purged|disposal)\b/i, 3));
  // Purpose test
  put("interest", ...quotes(docs, /\b(objective|aim|goal|purpose|in order to|seeks to|to prevent|to detect|fraud|marketing|to improve)\b/i, 3));
  put("benefit", ...quotes(docs, /\b(benefit|improv\w+|reduc\w+|increas\w+|efficien\w+|revenue|cost sav\w+|customer experience)\b/i, 3));
  put("if_not", ...quotes(docs, /\b(without (this|the)|otherwise|if (we|the company) (do|does) not|failure to|risk of not)\b/i, 2));
  put("support", ...quotes(docs, /\b(regulation|guideline|circular|code of (practice|conduct)|cbn|ncc|sec |ndpa|ndpc|gaid|act 20\d\d)\b/i, 3));
  put("real", ...quotes(docs, /\b(approved|approval|board resolution|signed off|budget)\b/i, 2));
  // Necessity test
  put("minimisation", data.length && `Data fields in the documents: ${data.map((x) => x.label).join(", ")}`, sens.length && `Sensitive fields: ${sens.map((x) => x.label).join(", ")}`);
  put("anonymised", masking.length ? `Described in the documents: ${masking.map(line).join("; ")}` : docs.length > 0 && "No pseudonymisation or masking is described in the documents.");
  put("retention_ok", ...quotes(docs, /\b(retain|retention|deleted after|purged|disposal)\b[^.]{0,120}\b\d+\s*(year|month|day|week)s?\b/i, 2));
  put("access", roles.length && `Roles with access: ${roles.map(line).join("; ")}`, ...controls.filter((c) => /access|sign-on|multi-factor/i.test(c.label)).map(line));
  // Balancing test
  put("relationship", ...quotes(docs, /\b(existing (customers?|clients?|members?)|our (customers|employees|members|subscribers)|customer relationship)\b/i, 2));
  put("nature", data.length && `Personal data involved: ${data.map((x) => x.label).join(", ")}`, sens.length && `Sensitive personal data involved: ${sens.map(line).join("; ")}. Legitimate interest is not an appropriate basis for sensitive data (NDPA s.30).`);
  put("vulnerable", ...sens.filter((s) => /children/i.test(s.label)).map((s) => `Children's data appears in the documents${line(s).slice(s.label.length)}`));
  put("expected", ...quotes(docs, /\b(reasonabl[ey] expect|would expect|as stated (in|at) (the time of )?collection)\b/i, 2));
  put("notice", ...quotes(docs, /\b(legitimate interest|we (use|may use|process) your|privacy (notice|policy)|direct marketing)\b/i, 3));
  put("consistent", ...quotes(docs, /\b(original purpose|compatible|further processing|secondary use)\b/i, 2));
  // Safeguards (evidence beside owner / due date)
  put("sg_transparency", ...quotes(docs, /\b(privacy (notice|policy)|legitimate interest)\b/i, 1));
  put("sg_objection", ...quotes(docs, /\b(opt[- ]?out|unsubscribe|right to object|objection)\b/i, 2));
  put("sg_minimisation", ...masking.map(line));
  put("sg_retention", ...quotes(docs, /\b(retention schedule|automatic(ally)? delet\w+|purge|disposal)\b/i, 1));
  put("sg_security", controls.length > 0 && `Controls described: ${controls.map((c) => c.label).join(", ")}`);
  put("sg_processors", ...quotes(docs, /\b(data (sharing|processing) agreement|\bdpa\b|contract with|service level agreement)\b/i, 2));
  put("sg_breach", ...quotes(docs, /\b(72 hours|breach notification|notify (the )?(ndpc|commission)|incident response)\b/i, 2));
  put("sg_monitoring", ...quotes(docs, /\b(audit|review(ed)? (annually|quarterly|periodically)|monitor\w*)\b/i, 1));
  return { add: a, read: docs.length, unreadable: all.filter((d) => !d.text.trim()).map((d) => d.name) };
}

/** Merge the evidence into an LIA's answers: each answer's documents part is replaced, everything else kept. */
export function applyLia(answers: Record<string, string>, add: Record<string, string[]>) {
  const out = { ...answers };
  let n = 0;
  const keys = new Set([...Object.keys(out).filter((k) => (out[k] ?? "").includes(LIA_MARK)), ...Object.keys(add)]);
  for (const k of keys) {
    const cur = out[k] ?? "", i = cur.indexOf(LIA_MARK);
    const kept = (i >= 0 ? cur.slice(0, i) : cur).trimEnd().replace(/^\[To be completed\]$/, "");
    const lines = add[k];
    out[k] = lines?.length ? `${kept}${kept ? "\n\n" : ""}${LIA_MARK}\n${lines.map((l) => `- ${l}`).join("\n")}` : kept;
    if (lines?.length) n++;
  }
  return { answers: out, n };
}

/** Read the LIA's documents and update its answers. Returns a summary for the flash message. */
export async function analyseLiaInto(assessmentId: string) {
  const a = (await q<{ answers: Record<string, string> }>("select answers from assessments where id = $1", [assessmentId]))[0];
  const docs = await q<Doc>("select original_name as name, coalesce(text_content, '') as text from files where assessment_id = $1 order by created_at", [assessmentId]);
  if (!a || !docs.length) return { n: 0, msg: "" };
  const r = analyseLia(docs);
  const { answers, n } = applyLia(a.answers ?? {}, r.add);
  await q("update assessments set answers = $2, updated_at = now() where id = $1", [assessmentId, JSON.stringify(answers)]);
  return { n, msg: `${r.read} of ${docs.length} document${docs.length === 1 ? "" : "s"} read; ${n} answer${n === 1 ? "" : "s"} updated from them${r.unreadable.length ? `. No text could be read from: ${r.unreadable.join(", ")}` : ""}.` };
}
