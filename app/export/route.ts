import { getUser, clientScope, scopeArgs, audit } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { getVersion, signatureFor } from "@/lib/data";
import { dpiaText, LAWFUL_BASIS } from "@/lib/templates";
import { fmtWAT, riskLevel, readiness, CAR_CATEGORIES, carItemRisk, carRisk } from "@/lib/rules";
import { TODO } from "@/lib/templates";
import { loadCarReport, carReportHtml } from "@/lib/car-report";
import { buildTracker, loadTracker, trackerHtml, trackerXlsx } from "@/lib/remediation";
import { loadDpiaReport, dpiaReportHtml } from "@/lib/dpia-report";
import { htmlToDocx } from "@/lib/docx";
import { assessmentHtml } from "@/lib/assessments";
import { loadLiaReport, liaReportHtml } from "@/lib/lia-report";
import { invoiceHtml } from "@/lib/invoice";
import { loadFramework, frameworkHtml } from "@/lib/framework";
import { planHtml } from "@/lib/training";
import { projectPlanHtml } from "@/lib/project-plan";
import { proposalHtml, coverLetterHtml } from "@/lib/proposal";
import { reportCover } from "@/lib/cover-letter";

// F15 export. ponytail: PDF = print-ready HTML the browser saves as PDF; Word = HTML served as .doc, which Word opens.
// Swap for Playwright PDF + the `docx` package (TRD §1) when tagged PDFs or native .docx become a requirement.

const CSS = `body{font:17px/28px "Source Serif 4",Georgia,serif;color:#1b2433;max-width:760px;margin:40px auto;padding:0 24px}
h1{font-size:26px;line-height:34px}h2{font-size:20px;margin-top:28px}.todo{background:#fff3d6}
.seal{border:2px solid #2a3f9d;outline:2px solid #2a3f9d;outline-offset:2px;padding:10px 14px;margin:24px 4px;font:14px/20px Arial,sans-serif}
.meta{font:13px/18px Arial,sans-serif;color:#5f6878}table{border-collapse:collapse;width:100%;font:13px/18px Arial,sans-serif}
td,th{border:1px solid #c9ced6;padding:6px;text-align:left;vertical-align:top}.noprint{margin:16px 0}@media print{.noprint{display:none}}.break{break-before:page}.note{font:13px/18px Arial,sans-serif;color:#5f6878}`;

/** `letter` (?cover=only) replaces the report with its cover letter. */
async function page(title: string, inner: string, format: string, filename: string, css = CSS, letter = "") {
  if (letter) { inner = letter; title = `Cover letter - ${title}`; filename = `cover-letter-${filename}`; }
  if (format === "doc") {
    // Native Word: same content as the PDF, with its page header text and orientation.
    const header = css.match(/@top-center\s*\{\s*content:\s*"((?:[^"\\]|\\.)*)"/)?.[1]?.replace(/\\(.)/g, "$1");
    const docx = await htmlToDocx(inner, { title, header, landscape: /size:\s*A4 landscape/.test(css) });
    return new Response(new Uint8Array(docx), { headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "content-disposition": `attachment; filename="${filename}.docx"` } });
  }
  const html = `<!doctype html><html lang="en-NG"><head><meta charset="utf-8"><title>${title}</title><style>${css}</style></head><body>
    <div class="noprint"><button onclick="print()">Print or save as PDF</button></div>${inner}</body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
/** Same plain-text document format as components/ui Doc, rendered to an HTML string. */
function docHtml(body: string) {
  const out: string[] = [];
  let list: string[] = [];
  const mark = (s: string) => esc(s).split(esc(TODO)).join(`<span class="todo">${esc(TODO)}</span>`);
  const flush = () => { if (list.length) out.push(`<ul>${list.map((l) => `<li>${mark(l)}</li>`).join("")}</ul>`); list = []; };
  for (const line of body.split(/\n/)) {
    if (line.startsWith("- ")) { list.push(line.slice(2)); continue; }
    flush();
    if (line.startsWith("# ")) out.push(`<h1>${mark(line.slice(2))}</h1>`);
    else if (line.startsWith("## ")) out.push(`<h2>${mark(line.slice(3))}</h2>`);
    else if (line.trim()) out.push(`<p>${mark(line)}</p>`);
  }
  flush();
  return out.join("");
}
const slug = (s: string) => s.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
const denied = () => new Response("Not found", { status: 404 });

export async function GET(req: Request) {
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind"), format = url.searchParams.get("format") === "doc" ? "doc" : "pdf";
  const u = await getUser();
  if (!u) return denied();
  // Each client report has a cover letter, downloaded on its own with ?cover=only (the "Cover letter" buttons).
  const cover = (clientId: string, k: Parameters<typeof reportCover>[1], title: string) => (url.searchParams.get("cover") === "only" ? reportCover(clientId, k, title) : Promise.resolve(""));

  const canSeeClient = async (clientId: string) =>
    u.kind === "firm" ? !!(await one(`select 1 from clients c where c.id = $3 and ${clientScope(u)}`, [...scopeArgs(u), clientId])) : false;

  if (kind === "version") {
    const v = await getVersion(url.searchParams.get("id") ?? "");
    if (!v || !["approved", "awaiting_client_signoff", "client_signed_off"].includes(v.status)) return denied(); // FR11.4: approved only
    const contactOk = u.kind === "contact" && u.client_id === v.client_id && !!(await one("select 1 from signoff_requests where version_id = $1", [v.id]));
    if (!contactOk && !(await canSeeClient(v.client_id))) return denied();
    const client = await one("select name from clients where id = $1", [v.client_id]);
    let title = "Document", body = v.body;
    if (v.parent_type === "dpia") { const d = await one("select title from dpias where id = $1", [v.parent_id]); title = `DPIA: ${d!.title}`; body = dpiaText(d!.title, v.body, riskLevel); }
    else if (v.parent_type === "document") title = (await one("select title from documents where id = $1", [v.parent_id]))!.title;
    else if (v.parent_type === "dsar") title = "DSAR response";
    else title = "Breach notification";
    const sig = await signatureFor(v.id);
    const seal = `<div class="seal"><b>${sig ? "Signed by client" : "Approved"}</b><br>${esc(client!.name)} · Version ${v.version_no}, approved by ${esc(v.approved_by_name)}<br>${fmtWAT(v.approved_at!)}${sig ? `<br>Signed by ${esc(sig.typed_name)} (${esc(sig.contact_name)}) on ${fmtWAT(sig.signed_at)}. Code sent by ${sig.otp_channel}. Document fingerprint (SHA-256): ${sig.content_sha256}` : ""}</div>`;
    await audit(u, "export", v.parent_type, v.parent_id, { client_id: v.client_id, details: { version: v.version_no, format } });
    return page(title, seal + docHtml(body), format, slug(`${client!.name}-${title}-v${v.version_no}`), CSS, await cover(v.client_id, "version", title));
  }

  if (kind === "dpia-report") {
    // DPIA report in the DPCO format, from the DPIA's current version (drafts included, marked as such). Firm users only.
    const id = url.searchParams.get("id") ?? "";
    const dp = /^[0-9a-f-]{36}$/.test(id) ? await one("select client_id from dpias where id = $1", [id]) : null;
    if (!dp || !(await canSeeClient(dp.client_id))) return denied();
    const r = dpiaReportHtml((await loadDpiaReport(id))!);
    await audit(u, "export", "dpia_report", id, { client_id: dp.client_id, details: { format } });
    return page(r.title, r.body, format, slug(r.title), r.css, await cover(dp.client_id, "dpia-report", "Data Protection Impact Assessment Report"));
  }

  if (kind === "invoice" || kind === "receipt") {
    const id = url.searchParams.get("id") ?? "";
    const inv = /^[0-9a-f-]{36}$/.test(id) ? await one("select * from invoices where id = $1", [id]) : null;
    const contactOk = !!inv && u.kind === "contact" && u.client_id === inv.client_id && inv.status !== "cancelled";
    if (!inv || !(contactOk || (u.kind === "firm" && (await canSeeClient(inv.client_id))))) return denied();
    if (kind === "receipt" && (inv.status !== "paid" || !inv.receipt_no)) return denied();
    const firm = (await one("select * from firms where id = $1", [inv.firm_id]))!;
    const ans = Object.fromEntries((await q("select question_key, answer from answers where client_id = $1 and question_key in ('org_legal_name','org_address','org_email','org_phone')", [inv.client_id])).map((r) => [r.question_key, r.answer]));
    const c = (await one("select name from clients where id = $1", [inv.client_id]))!;
    const r = invoiceHtml(inv, firm, { name: String(ans.org_legal_name || c.name), address: ans.org_address, email: ans.org_email, phone: ans.org_phone }, kind === "receipt");
    await audit(u, "export", kind, id, { client_id: inv.client_id, details: { format } });
    return page(r.title, r.body, format, slug(r.title), r.css);
  }
  if (kind === "proposal") { // prospect, not a client yet: firm-scoped
    const id = url.searchParams.get("id") ?? "";
    const p = u.kind === "firm" && /^[0-9a-f-]{36}$/.test(id) ? await one("select * from proposals where id = $1 and firm_id = $2", [id, u.firm_id]) : null;
    if (!p) return denied();
    const firm = (await one("select * from firms where id = $1", [u.firm_id]))!;
    const created = p.created_at instanceof Date ? p.created_at.toISOString() : String(p.created_at);
    const r = (url.searchParams.get("doc") === "letter" ? coverLetterHtml : proposalHtml)({ ...p, created_at: created } as any, firm);
    await audit(u, "export", "proposal", id, { details: { format, doc: url.searchParams.get("doc") ?? "proposal" } });
    return page(r.title, r.body, format, slug(r.title), r.css);
  }
  if (kind === "assessment") {
    const id = url.searchParams.get("id") ?? "";
    const a = /^[0-9a-f-]{36}$/.test(id) ? await one("select a.*, u.name as approver from assessments a left join users u on u.id = a.approved_by where a.id = $1", [id]) : null;
    if (!a || !(await canSeeClient(a.client_id))) return denied();
    const c = (await one("select c.name, f.name as firm from clients c join firms f on f.id = c.firm_id where c.id = $1", [a.client_id]))!;
    const ans = await one("select answer from answers where client_id = $1 and question_key = 'org_legal_name'", [a.client_id]);
    const ropa = a.ropa_entry_id ? await one("select * from ropa_entries where id = $1", [a.ropa_entry_id]) : null;
    if (a.kind === "lia") { // LIA report in the DPCO's LIA report format
      const lr = liaReportHtml((await loadLiaReport(id))!);
      await audit(u, "export", "assessment_lia", id, { client_id: a.client_id, details: { format } });
      return page(lr.title, lr.body, format, slug(lr.title), lr.css, await cover(a.client_id, "lia", "Legitimate Interest Assessment Report"));
    }
    const r = assessmentHtml(a as any, { org: String(ans?.answer || c.name), firm: c.firm, ropa: ropa as any });
    await audit(u, "export", `assessment_${a.kind}`, id, { client_id: a.client_id, details: { format } });
    return page(r.title, r.body, format, slug(r.title), CSS, await cover(a.client_id, a.kind, a.kind === "tia" ? "Cross-Border Transfer Risk Assessment" : "Data Processor Third Party Risk Assessment"));
  }

  const clientId = url.searchParams.get("client") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(clientId) || !(await canSeeClient(clientId))) return denied();
  const client = await one("select name, car_audit_year from clients where id = $1", [clientId]);
  const stamp = `<p class="meta">${esc(client!.name)} · exported ${fmtWAT(new Date())} by ${esc(u.name)}</p>`;

  if (kind === "project-plan") {
    const rows = await q(`select t.*, us.name as assignee from tasks t left join memberships m on m.id = t.assignee_membership_id left join users us on us.id = m.user_id
      where t.client_id = $1 order by coalesce(t.start_on, t.due_on) nulls last, t.created_at`, [clientId]);
    const org = (await one("select answer from answers where client_id = $1 and question_key = 'org_legal_name'", [clientId]))?.answer || client!.name;
    const firm = (await one("select f.* from firms f join clients c on c.firm_id = f.id where c.id = $1", [clientId]))!;
    const r = projectPlanHtml(String(org), firm, rows);
    await audit(u, "export", "project_plan", clientId, { client_id: clientId, details: { format } });
    return page(r.title, r.body, format, slug(r.title), r.css, await cover(clientId, "project-plan", "Project Plan"));
  }
  if (kind === "training-plan") {
    const year = /^\d{4}$/.test(url.searchParams.get("year") ?? "") ? url.searchParams.get("year")! : String(client!.car_audit_year ?? new Date().getFullYear());
    const rows = await q("select * from trainings where client_id = $1 and extract(year from starts_on) = $2 order by starts_on, created_at", [clientId, Number(year)]);
    const files = await q<{ training_id: string; evidence_kind: string | null }>("select training_id, evidence_kind from files where training_id = any($1::uuid[])", [rows.map((r) => r.id)]);
    const ev: Record<string, { evidence_kind: string | null }[]> = {};
    for (const f of files) (ev[f.training_id] ??= []).push(f);
    const org = (await one("select answer from answers where client_id = $1 and question_key = 'org_legal_name'", [clientId]))?.answer || client!.name;
    const firm = (await one("select f.name from firms f join clients c on c.firm_id = f.id where c.id = $1", [clientId]))!.name;
    const r = planHtml(String(org), firm, year, rows, ev);
    await audit(u, "export", "training_plan", clientId, { client_id: clientId, details: { format, year } });
    return page(r.title, r.body, format, slug(r.title), r.css, await cover(clientId, "training-plan", `Capacity Building Plan ${year}`));
  }
  if (kind === "framework") { // Data Protection Framework in the DPCO's framework format
    const r = frameworkHtml(await loadFramework(clientId));
    await audit(u, "export", "data_protection_framework", clientId, { client_id: clientId, details: { format } });
    return page(r.title, r.body, format, slug(r.title), r.css, await cover(clientId, "framework", "Data Protection Framework"));
  }
  if (kind === "ropa") {
    const rows = await q("select * from ropa_entries where client_id = $1 and state = 'active' order by purpose", [clientId]);
    const cols: [string, (r: any) => string][] = [["Purpose", (r) => r.purpose], ["Department", (r) => r.department], ["Lawful basis", (r) => (r.lawful_basis ? LAWFUL_BASIS[r.lawful_basis] : "")], ["Data subjects", (r) => r.data_subjects], ["Data categories", (r) => r.data_categories],
      ["Recipients", (r) => r.recipients], ["Transfers outside Nigeria", (r) => (r.has_transfer ? `Yes. ${r.transfer_safeguard ?? "No safeguard recorded"}` : "No")], ["Retention", (r) => r.retention_period], ["Security measures", (r) => r.security_measures], ["System / owner", (r) => r.system_owner]];
    await audit(u, "export", "ropa", clientId, { client_id: clientId, details: { format } });
    return page("Record of processing activities", `<h1>Record of processing activities</h1>${stamp}<table><tr>${cols.map(([h]) => `<th>${h}</th>`).join("")}</tr>${rows.map((r) => `<tr>${cols.map(([, f]) => `<td>${esc(f(r))}</td>`).join("")}</tr>`).join("")}</table>`, format, slug(`${client!.name}-ropa`), CSS, await cover(clientId, "ropa", "Record of Processing Activities"));
  }

  if (kind === "car-report" || kind === "car-plan" || kind === "car-tracker") {
    const asked = Number(url.searchParams.get("year"));
    const year: number = Number.isInteger(asked) && asked >= 2019 && asked <= 2100 ? asked : client!.car_audit_year;
    const d = await loadCarReport(clientId, year);
    if (!d) return new Response(`No CAR readiness has been recorded for ${year}.`, { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
    if (kind === "car-report") {
      const r = carReportHtml(d);
      await audit(u, "export", "car_report", clientId, { client_id: clientId, details: { format, audit_year: year } });
      return page(r.title, r.body, format, slug(r.title), r.css, await cover(clientId, "car-report", `Data Protection Compliance Audit Report ${year}`));
    }
    // Remediation tracker: built from the audit the first time, then whatever the team has maintained in the app.
    let rows = await loadTracker(clientId, year);
    if (!rows.length) { await buildTracker(clientId, year, u.id); rows = await loadTracker(clientId, year); }
    const o = { org: d.org, year, firm: d.client.firm_name };
    await audit(u, "export", "remediation_tracker", clientId, { client_id: clientId, details: { format: kind === "car-tracker" ? "xlsx" : format, audit_year: year } });
    if (kind === "car-tracker") {
      return new Response(new Uint8Array(await trackerXlsx(rows, o)), { headers: {
        "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": `attachment; filename="${slug(`${d.org} NDPA Remediation Tracker ${year}`)}.xlsx"` } });
    }
    const r = trackerHtml(rows, o);
    return page(r.title, r.body, format, slug(r.title), r.css, await cover(clientId, "car-plan", `NDPA Remediation Plan ${year}`));
  }

  if (kind === "car") {
    const asked = Number(url.searchParams.get("year"));
    const auditYear: number = Number.isInteger(asked) && asked >= 2019 && asked <= 2100 ? asked : client!.car_audit_year;
    const items = await q("select * from client_car_items where client_id = $1 and audit_year = $2 order by category_key, position", [clientId, auditYear]);
    const findings = await q("select * from car_findings where client_id = $1 and audit_year = $2 order by status, created_at", [clientId, auditYear]);
    if (!items.length) return new Response(`No CAR readiness has been recorded for ${auditYear}.`, { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
    const r = readiness(items as { category_key: string; status: string }[]);
    const label: Record<string, string> = { complete: "Complete", in_progress: "In progress", missing: "Missing", not_applicable: "Not applicable" };
    const riskLabel = (x: string | null | undefined) => (x ? x[0].toUpperCase() + x.slice(1) : "—");
    const risk = carRisk(items as { category_key: string; status: string }[]);
    const year = ` · ${auditYear} audit`;
    await audit(u, "export", "car_checklist", clientId, { client_id: clientId, details: { format, audit_year: auditYear } });
    return page("CAR readiness checklist", `<h1>CAR readiness checklist${year}</h1>${stamp}<p>Overall readiness: <b>${r.overall.pct}%</b> (${r.overall.complete} of ${r.overall.applicable} applicable items complete)</p>` +
      (risk ? `<p>Risk score: <b>${risk.score} / 100 (${riskLabel(risk.rating)})</b>. Item risk follows status and question priority: Missing high, In progress medium, Complete low; a Medium-priority question drops one level.</p>` : "") +
      Object.entries(CAR_CATEGORIES).filter(([k]) => items.some((i) => i.category_key === k)).map(([k, l]) => {
        const cat = items.filter((i) => i.category_key === k); const cr = carRisk(cat as { category_key: string; status: string; priority: string | null }[]);
        const row = (i: any, n: number) => (i.section && i.section !== cat[n - 1]?.section ? `<tr><th colspan="8">${esc(i.section)}</th></tr>` : "") +
          `<tr><td>${esc(i.item_text)}</td><td>${riskLabel(i.priority)}</td><td>${esc(i.answer ?? "")}</td><td>${esc(i.evidence_notes ?? "")}</td><td>${label[i.status]}</td><td>${esc(i.na_reason ?? "")}</td><td>${riskLabel(carItemRisk(i.status, i.priority))}</td><td>${esc(i.recommendation ?? "")}</td></tr>`;
        return `<h2>${l} (${r.byCategory[k].pct}%${cr ? `, ${riskLabel(cr.rating)} risk` : ""})</h2><table><tr><th>Audit parameter</th><th>Priority</th><th>Answer / facts</th><th>Evidence / documents</th><th>Status</th><th>Non-conformity / observation</th><th>Risk</th><th>Recommendation</th></tr>${cat.map(row).join("")}</table>`;
      }).join("") +
      `<h2>Other findings and observations</h2>` + (findings.length
        ? `<table><tr><th>Finding / observation</th><th>Risk</th><th>Status</th><th>Recommendation</th></tr>${findings.map((f) => `<tr><td>${esc(f.observation)}</td><td>${riskLabel(f.risk)}</td><td>${f.status === "resolved" ? "Resolved" : "Open"}</td><td>${esc(f.recommendation ?? "")}</td></tr>`).join("")}</table>`
        : `<p>None recorded.</p>`),
      format, slug(`${client!.name}-car-readiness-${auditYear}`), CSS, await cover(clientId, "car", `CAR Readiness Checklist ${auditYear}`));
  }
  return denied();
}
