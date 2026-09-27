// End-to-end smoke test: drives real pages and server actions over HTTP (no-JS form posts).
// Usage: DEV_SKIP_MFA=1 npm run dev > dev.log 2>&1   then   npm run smoke -- dev.log
// Invitation links and signing codes are read from the dev log (no email relay in dev).
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const BASE = process.env.BASE ?? "http://localhost:3000";
const LOG = process.argv[2] ?? "dev.log";
const ok = (m) => console.log("  ✓", m);
process.on("uncaughtException", (e) => { console.log("  ✗", String(e.message).slice(0, 900).replace(/\s+/g, " ")); if (e.stack) console.log(e.stack.split(/\n/).find((l) => l.includes("smoke.mjs"))); process.exit(1); });

class S {
  jar = {};
  c() { return Object.entries(this.jar).map(([k, v]) => `${k}=${v}`).join("; "); }
  store(r) { for (const h of r.headers.getSetCookie()) { const [kv] = h.split(";"); const [k, v] = kv.split("="); if (v === "" || /Max-Age=0|expires=Thu, 01 Jan 1970/i.test(h)) delete this.jar[k]; else this.jar[k] = v; } }
  async get(path) {
    let r = await fetch(BASE + path, { headers: { cookie: this.c() }, redirect: "manual" });
    this.store(r);
    let hops = 0;
    while (r.status >= 300 && r.status < 400 && hops++ < 5) { path = new URL(r.headers.get("location"), BASE).pathname + new URL(r.headers.get("location"), BASE).search; r = await fetch(BASE + path, { headers: { cookie: this.c() }, redirect: "manual" }); this.store(r); }
    return { status: r.status, path, html: (await r.text()).replace(/<!-- -->/g, "") };
  }
  /** Submit the form on `path` that contains `marker`, with `fields` (arrays = repeated names, File-like = upload). */
  async submit(path, marker, fields = {}, button) {
    const page = await this.get(path);
    const forms = page.html.match(/<form[\s\S]*?<\/form>/g) ?? [];
    const form = forms.find((f) => f.includes(marker));
    if (!form) throw new Error(`No form containing "${marker}" on ${path} (got ${page.status} ${page.path}): ${(page.html.split('id="main"')[1] ?? page.html).replace(/<script[\s\S]*?<\/script>|<svg[\s\S]*?<\/svg>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 600)}`);
    const fd = new FormData();
    for (const m of form.matchAll(/<input type="hidden" name="([^"]+)"(?: value="([^"]*)")?/g)) fd.append(m[1], (m[2] ?? "").replace(/&amp;/g, "&").replace(/&quot;/g, '"'));
    for (const [k, v] of Object.entries(fields)) for (const x of [].concat(v)) fd.append(k, x);
    if (button) fd.append(button[0], button[1]);
    const r = await fetch(BASE + path, { method: "POST", body: fd, headers: { cookie: this.c(), origin: BASE }, redirect: "manual" });
    this.store(r);
    const loc = r.headers.get("location") ?? r.headers.get("x-action-redirect");
    return { status: r.status, loc: loc ? decodeURIComponent(loc) : null };
  }
}
const logText = () => readFileSync(LOG, "utf8");
const lastMatch = (re) => [...logText().matchAll(new RegExp(re.source, "g"))].pop();

const run = Date.now().toString(36);
const admin = new S();
console.log("Firm sign-up and client onboarding");
let r = await admin.submit("/sign-up", "Create firm", { name: "Adaeze Okafor", email: `ada-${run}@firm.ng`, password: "correct-horse-1", firm: "Lagos Privacy Partners" });
assert.match(r.loc ?? "", /\/app/); ok("sign-up creates firm and lands on /app");
let p = await admin.get("/app");
assert.match(p.html, /Add your first client/); ok("empty dashboard");

r = await admin.submit("/app/clients/new", "Create client", { name: "Ikeja Clinic", sector: "Health", contact_name: "Tunde Bello", contact_email: `tunde-${run}@clinic.ng` });
const clientId = r.loc.match(/clients\/([0-9a-f-]{36})/)[1];
const C = `/app/clients/${clientId}`;
p = await admin.get(C);
assert.match(p.html, /Onboarding/); assert.match(p.html, /0%/); ok("client created with status Onboarding and 0% readiness");

const answers = [
  { org_legal_name: "Ikeja Clinic Ltd", org_sector: "Health", org_address: "12 Allen Avenue, Ikeja" },
  { subjects: ["Patients", "Employees"] },
  { categories: ["Contact details", "Health information", "NIN, BVN or other ID numbers"] },
  { purposes: "Patient records\nPayroll" },
  { systems: "Clinic EMR (cloud)" },
  { recipients: "Payroll provider\nNHIA" },
  { transfers_yes: "yes", transfer_countries: "Google Workspace (USA)", transfer_safeguard: "" },
  { retention_default: "10 years after last visit" },
  { security: ["Access controls by role", "Regular backups"] },
  { subjects_6mo: "4200", mi_significance: "yes" },
];
for (const [s, a] of answers.entries()) {
  r = await admin.submit(`${C}/onboarding?s=${s}`, "Section " + (s + 1) + " of", a);
  assert.match(r.loc ?? "", /Saved/, `section ${s} save`);
}
ok("all 10 questionnaire sections saved");
r = await admin.submit(`${C}/onboarding?s=9`, "Mark complete");
assert.match(r.loc, /data-inventory/); ok("completing builds the data inventory");
p = await admin.get(`${C}/data-inventory`);
assert.match(p.html, /Likely a data controller or processor of major importance/); assert.match(p.html, /v0-seed/); ok("major-importance indicator: likely, cites criteria version");
r = await admin.submit(`${C}/data-inventory`, "Save classification", { mi_class: "major_importance" });
assert.match(r.loc, /Classification saved/); ok("Firm Admin classifies client");

console.log("RoPA, documents and approval");
p = await admin.get(`${C}/ropa`);
const ropaIds = [...new Set([...p.html.matchAll(/ropa\/([0-9a-f-]{36})/g)].map((m) => m[1]))];
assert.equal(ropaIds.length, 2); ok("2 proposed RoPA entries from the questionnaire");
r = await admin.submit(`${C}/ropa/${ropaIds[0]}`, "Accept and save", { purpose: "Patient records", lawful_basis: "contract", data_subjects: "Patients", data_categories: "Health information", retention_period: "10 years", security_measures: "Role-based access", system_owner: "EMR", involves_sensitive: "on", has_transfer: "on", transfer_safeguard: "" });
assert.match(r.loc, /Entry saved/); ok("proposed entry accepted and active");

r = await admin.submit(`${C}/gaps`, "Run gap check");
assert.match(r.loc, /found \d+ gaps/); p = await admin.get(`${C}/gaps`);
for (const g of ["has no DPIA", "transfers data outside Nigeria with no documented safeguard", "No approved Privacy Notice", "CAR item missing"]) assert.ok(p.html.includes(g), g);
ok("gap check finds DPIA, transfer, policy and CAR gaps");

r = await admin.submit(`${C}/documents`, "Generate document", { template_key: "privacy_notice" });
const docPath = r.loc.split("?")[0];
p = await admin.get(docPath);
assert.match(p.html, /Ikeja Clinic Ltd/); assert.match(p.html, /Patient records: Performance of a contract/); ok("Privacy Notice pre-filled from the data map");
r = await admin.submit(docPath, "Improve with AI");
assert.match(r.loc, /AI draft ready/); r = await admin.submit(docPath, ">Accept<");
assert.match(r.loc, /accepted/); p = await admin.get(docPath); assert.match(p.html, /AI draft/); ok("AI draft accepted and labelled 'AI draft'");
r = await admin.submit(docPath, "Send for review"); assert.match(r.loc, /Sent for review/);
p = await admin.get("/app"); assert.match(p.html, /Waiting for my review/); assert.match(p.html, /Privacy Notice/); ok("item appears in 'Waiting for my review'");
r = await admin.submit(docPath, ">Approve<"); assert.match(r.loc, /Approved/);
p = await admin.get("/app"); assert.doesNotMatch(p.html.split("Clients</h1>")[0], /Privacy Notice/); ok("approved item leaves the review queue");
p = await admin.get(docPath); assert.match(p.html, /class="seal"/); ok("approval seal shown");
const exp = await admin.get(`/export?kind=version&id=${p.html.match(/kind=version&amp;id=([0-9a-f-]{36})/)[1]}&format=doc`);
assert.equal(exp.status, 200); assert.match(exp.html, /Version 1, approved by Adaeze Okafor/); ok("Word export includes version and approval");

console.log("Client portal: invitation, signing, breach, DSAR, evidence");
const invite = lastMatch(new RegExp(`tunde-${run}@clinic.ng\\] invitation: .*?/invite/([A-Za-z0-9_-]+)`));
const contact = new S();
r = await contact.submit(`/invite/${invite[1]}`, ">Join<", { name: "Tunde Bello", password: "portal-pass-99" });
p = await contact.get("/"); assert.equal(p.path, "/portal"); ok("contact accepts invite and lands on the portal");
r = await admin.submit(docPath, "Send for client sign-off"); assert.match(r.loc, /Sent for client sign-off/);
p = await contact.get("/portal"); const signPath = p.html.match(/\/portal\/documents\/([0-9a-f-]{36})\/sign/)[0]; ok("sign-off request appears in portal To do");
r = await contact.submit(signPath, "Send code"); assert.match(r.loc, /sent a 6-digit code/);
const code = lastMatch(/signing code is (\d{6})/)[1];
r = await contact.submit(signPath, "Sign document", { typed_name: "Tunde Bello", code: code === "000000" ? "111111" : "000000", consent: "on" });
assert.match(r.loc, /code is wrong\. 4 attempts left/); ok("wrong OTP rejected with attempts remaining");
r = await contact.submit(signPath, "Sign document", { typed_name: "Tunde Bello", code, consent: "on" });
assert.match(r.loc, /Signed\./); ok("document signed with typed name + OTP");
p = await admin.get(docPath); assert.match(p.html, /Signed by client/); assert.match(p.html, /Fingerprint/); ok("firm sees client signature seal");

r = await contact.submit("/portal/report-breach", "Send report", { aware_at: new Date(Date.now() + 3600e3 - 5 * 3600e3).toISOString().slice(0, 16), description: "Laptop with patient list stolen", affected: "Patient names and phone numbers", phone: "08030000000" });
assert.match(r.loc, /DPCO has been alerted\. Reference BR-/); ok("client reports a breach");
p = await admin.get("/app"); assert.match(p.html, /Active breach/); assert.match(p.html, /reported by client/); assert.match(p.html, /66h \d+m left|67h 0m left/); ok("dashboard pins breach with ~67h countdown");
p = await admin.get("/app/notifications"); assert.match(p.html, /Suspected breach reported by Ikeja Clinic/); ok("in-app breach alert");
const breachPath = p.html.match(/\/app\/clients\/[0-9a-f-]{36}\/breaches\/[0-9a-f-]{36}/)?.[0] ?? (await admin.get(`${C}/breaches`)).html.match(/\/app\/clients\/[0-9a-f-]{36}\/breaches\/[0-9a-f-]{36}/)[0];
r = await admin.submit(breachPath, "Generate notification drafts"); assert.match(r.loc, /Notification drafts ready/);
p = await admin.get(breachPath); assert.match(p.html, /To the NDPC/); assert.match(p.html, /AI draft/); ok("NDPC and data-subject notices drafted, marked AI draft");
r = await admin.submit(breachPath, "Record as sent", { sent_at: new Date(Date.now() + 3600e3).toISOString().slice(0, 16), sent_method: "Email" });
assert.match(r.loc, /Approve the notification before/); ok("cannot record as sent before approval");

r = await contact.submit("/portal/log-request", "Send request", { request_type: "access", received_on: new Date(Date.now() + 3600e3).toISOString().slice(0, 10), requester_name: "Chioma Eze" });
assert.match(r.loc, /Request logged/); p = await admin.get(`${C}/dsars`); assert.match(p.html, /Chioma Eze/); assert.match(p.html, /30 days|29 days/); ok("portal DSAR appears with 30-day deadline");

r = await admin.submit(`${C}/evidence`, "Request evidence", { title: "Staff training records", due_on: "2026-12-01" });
assert.match(r.loc, /Evidence requested/);
p = await contact.get("/portal/evidence"); const evPath = p.html.match(/\/portal\/evidence\/[0-9a-f-]{36}/)[0];
r = await contact.submit(evPath, ">Upload<", { file: new File(["training log"], "training.pdf", { type: "application/pdf" }) });
assert.match(r.loc, /File uploaded/);
r = await contact.submit(evPath, ">Upload<", { file: new File(["MZ"], "tool.exe") });
assert.match(r.loc, /isn't allowed/); ok("upload accepted; .exe rejected");
p = await admin.get(`${C}/evidence`); const evFirm = p.html.match(/\/app\/clients\/[0-9a-f-]{36}\/evidence\/[0-9a-f-]{36}/)[0];
r = await admin.submit(evFirm, "Decision", { comment: "" }, ["decision", "rejected"]);
assert.match(r.loc, /Add a comment/); ok("rejecting evidence requires a comment");

console.log("Tenant isolation and roles");
const other = new S();
await other.submit("/sign-up", "Create firm", { name: "Other Admin", email: `other-${run}@x.ng`, password: "another-pass-1", firm: "Other DPCO" });
p = await other.get(C); assert.equal(p.path, "/forbidden"); ok("another firm is denied the client by direct URL");
p = await other.get(docPath); assert.equal(p.path, "/forbidden");
const ex2 = await fetch(`${BASE}/export?kind=ropa&client=${clientId}&format=pdf`, { headers: { cookie: other.c() } }); assert.equal(ex2.status, 404); ok("another firm cannot export the client's RoPA");
p = await contact.get("/app"); assert.equal(p.path, "/forbidden"); ok("client contact cannot reach the firm workspace");
p = await contact.get("/app/ask?q=breach"); assert.equal(p.path, "/forbidden"); ok("client contact has no Q&A access");

r = await admin.submit("/app/settings/team", "Send invitation", { email: `assoc-${run}@firm.ng`, role: "associate" });
const aInv = lastMatch(new RegExp(`assoc-${run}@firm.ng\\] invitation: .*?/invite/([A-Za-z0-9_-]+)`));
const assoc = new S();
await assoc.submit(`/invite/${aInv[1]}`, ">Join<", { name: "Kemi Associate", password: "assoc-pass-123" });
p = await assoc.get(C); assert.equal(p.path, "/forbidden"); ok("unassigned Associate is denied");
p = await assoc.get("/app"); assert.match(p.html, /haven&#x27;t been assigned|haven't been assigned/); assert.doesNotMatch(p.html, /Waiting for my review/); ok("Associate sees no clients and no review queue");

console.log("Regulatory Q&A and Secretary console");
p = await admin.get("/app/ask?q=" + encodeURIComponent("How long do we have to notify the NDPC of a breach?"));
assert.match(p.html, /Section 40/); assert.match(p.html, /not legal advice/); ok("Q&A cites Section 40 with notice");
p = await admin.get("/app/ask?q=" + encodeURIComponent("zebra crossing football"));
assert.match(p.html, /doesn&#x27;t cover this question|doesn't cover this question/); ok("Q&A says when the library doesn't cover it");

const sec = new S();
r = await sec.submit("/sign-in", "Sign in", { email: "secretary@dpocopilot.local", password: "secretary-dev-only" });
p = await sec.get("/"); assert.equal(p.path, "/secretary"); ok("Secretary signs in to the console");
p = await sec.get(C); assert.equal(p.path, "/forbidden"); ok("Secretary cannot see firm data");
r = await sec.submit("/secretary/car-template", "Add an item", { category_key: "governance", text: "Data protection audit filed with NDPC" });
r = await sec.submit("/secretary/publish", "This goes live for all firms immediately.");
assert.match(r.loc, /Published/);
p = await admin.get(`${C}/car-readiness`); assert.match(p.html, /Data protection audit filed with NDPC/); assert.match(p.html, /New item/); ok("published CAR item reaches existing clients as New item");

p = await admin.get("/app/settings/activity");
for (const a of ["approve", "sign", "export", "ai generate", "classify"]) assert.ok(p.html.includes(`>${a}<`), a);
ok("activity log records approve, sign, export, AI generation, classify");
console.log("DPIA, breach and DSAR approval paths, tasks, calendar, import");
r = await admin.submit(`${C}/dpias/new`, "Create DPIA", { title: "Patient records DPIA" });
assert.match(r.loc, /Select at least one processing activity/); ok("DPIA needs a linked RoPA entry");
r = await admin.submit(`${C}/dpias/new?ropa=${ropaIds[0]}`, "Create DPIA", { title: "Patient records DPIA", ropa: ropaIds[0] });
const dpiaPath = r.loc.split("?")[0];
r = await admin.submit(`${dpiaPath}?step=description`, "Draft this step with AI"); assert.match(r.loc, /AI draft ready/);
r = await admin.submit(`${dpiaPath}?step=description`, ">Accept<"); p = await admin.get(`${dpiaPath}?step=description`); assert.match(p.html, /People: Patients/); ok("AI drafts a DPIA step from the linked RoPA entry");
r = await admin.submit(`${dpiaPath}?step=scoring`, "Scoring guide", { r0_description: "Unauthorised access", r0_l: "4", r0_i: "5", r1_description: "" });
p = await admin.get(`${dpiaPath}?step=scoring`); assert.match(p.html, /20 · Very high/); ok("risk scoring saves likelihood × impact with level text");
r = await admin.submit(dpiaPath, "Send for review"); r = await admin.submit(dpiaPath, ">Approve<"); assert.match(r.loc, /Approved/);
r = await admin.submit(dpiaPath, "Edit (creates a new version)"); p = await admin.get(dpiaPath); assert.match(p.html, /Version 2/); assert.match(p.html, /Versions/); ok("editing an approved DPIA creates version 2; version 1 kept");

p = await admin.get(breachPath); const regForm = p.html.match(/To the NDPC[\s\S]*?Send for review/);
r = await admin.submit(breachPath, "Send for review"); r = await admin.submit(breachPath, ">Approve<"); assert.match(r.loc, /Approved/);
r = await admin.submit(breachPath, "Record as sent", { sent_at: new Date(Date.now() + 3600e3 - 60e3).toISOString().slice(0, 16), sent_method: "Email", sent_to: "info@ndpc.gov.ng" });
assert.match(r.loc, /Recorded as sent/); p = await admin.get("/app"); assert.doesNotMatch(p.html, /Active breach/); ok("approved NDPC notice recorded as sent; breach leaves the pinned strip");

p = await admin.get(`${C}/dsars`); const dsarPath = p.html.match(/\/app\/clients\/[0-9a-f-]{36}\/dsars\/[0-9a-f-]{36}/)[0];
r = await admin.submit(dsarPath, "Draft response with AI"); assert.match(r.loc, /Response drafted/);
r = await admin.submit(dsarPath, "Record as sent", { sent_at: new Date(Date.now() + 3600e3 - 60e3).toISOString().slice(0, 16) });
assert.match(r.loc, /must be approved|Approve the response/); ok("DSAR response can't be recorded as sent before approval");

r = await admin.submit("/app/tasks", "Create task", { title: "Chase DPO appointment letter", client_id: clientId, due_on: "2026-01-05" });
assert.match(r.loc, /Task created/); p = await admin.get("/app"); assert.match(p.html, /1 overdue|2 overdue/); ok("overdue task counted on dashboard");
p = await admin.get(`/app/calendar?client=${clientId}`);
for (const t of ["DSAR response due", "Task:"]) assert.ok(p.html.includes(t), t); ok("calendar lists DSAR and task deadlines (submitted evidence drops off)");

const csv = "name,sector,size,contact_name,contact_email\nYaba School,Education,,Ngozi,ngozi@school.ng\nIkeja Clinic,Health,,,\n,Retail,,,bad";
const imp = new FormData();
p = await admin.get("/app/import");
const form = p.html.match(/<form[\s\S]*?<\/form>/g).find((f) => f.includes("Upload and check"));
for (const m of form.matchAll(/<input type="hidden" name="([^"]+)"(?: value="([^"]*)")?/g)) imp.append(m[1], m[2] ?? "");
imp.append("file", new File([csv], "clients.csv", { type: "text/csv" }));
let res = await fetch(BASE + "/app/import", { method: "POST", body: imp, headers: { cookie: admin.c(), origin: BASE }, redirect: "manual" });
const jobPath = decodeURIComponent(res.headers.get("location") ?? res.headers.get("x-action-redirect"));
p = await admin.get(jobPath); assert.match(p.html, /2 rows have problems/); assert.match(p.html, /already exists/);
r = await admin.submit(jobPath, "Import 1 valid row"); assert.match(r.loc, /Imported 1 record/);
p = await admin.get("/app"); assert.match(p.html, /Yaba School/); ok("CSV import previews errors, imports only valid rows");

for (const path of ["/app/ask", "/app/settings/activity", "/app/settings/team", "/account", `${C}/settings`, `${C}/car-readiness`, `${C}/evidence`, `${C}/breaches`, "/app/notifications"]) {
  p = await admin.get(path); assert.equal(p.status, 200, path);
}
ok("remaining firm pages render");
for (const path of ["/portal", "/portal/documents", "/portal/evidence", "/portal/questionnaire", "/account"]) { p = await contact.get(path); assert.equal(p.status, 200, path); }
ok("portal pages render");
for (const path of ["/secretary", "/secretary/library", "/secretary/criteria", "/secretary/settings", "/secretary/publish"]) { p = await sec.get(path); assert.equal(p.status, 200, path); }
ok("secretary pages render");

console.log("\nAll smoke checks passed.");
