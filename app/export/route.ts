import { getUser, clientScope, scopeArgs, audit } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { getVersion, signatureFor } from "@/lib/data";
import { dpiaText, LAWFUL_BASIS } from "@/lib/templates";
import { fmtWAT, riskLevel, readiness, CAR_CATEGORIES } from "@/lib/rules";
import { TODO } from "@/lib/templates";

// F15 export. ponytail: PDF = print-ready HTML the browser saves as PDF; Word = HTML served as .doc, which Word opens.
// Swap for Playwright PDF + the `docx` package (TRD §1) when tagged PDFs or native .docx become a requirement.

const CSS = `body{font:17px/28px "Source Serif 4",Georgia,serif;color:#1b2433;max-width:760px;margin:40px auto;padding:0 24px}
h1{font-size:26px;line-height:34px}h2{font-size:20px;margin-top:28px}.todo{background:#fff3d6}
.seal{border:2px solid #2a3f9d;outline:2px solid #2a3f9d;outline-offset:2px;padding:10px 14px;margin:24px 4px;font:14px/20px Arial,sans-serif}
.meta{font:13px/18px Arial,sans-serif;color:#5f6878}table{border-collapse:collapse;width:100%;font:13px/18px Arial,sans-serif}
td,th{border:1px solid #c9ced6;padding:6px;text-align:left;vertical-align:top}.noprint{margin:16px 0}@media print{.noprint{display:none}}`;

function page(title: string, inner: string, format: string, filename: string) {
  const html = `<!doctype html><html lang="en-NG"><head><meta charset="utf-8"><title>${title}</title><style>${CSS}</style></head><body>
    ${format === "pdf" ? `<div class="noprint"><button onclick="print()">Print or save as PDF</button></div>` : ""}${inner}</body></html>`;
  return new Response(html, {
    headers: format === "doc"
      ? { "content-type": "application/msword", "content-disposition": `attachment; filename="${filename}.doc"` }
      : { "content-type": "text/html; charset=utf-8" },
  });
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
    return page(title, seal + docHtml(body), format, slug(`${client!.name}-${title}-v${v.version_no}`));
  }

  const clientId = url.searchParams.get("client") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(clientId) || !(await canSeeClient(clientId))) return denied();
  const client = await one("select name from clients where id = $1", [clientId]);
  const stamp = `<p class="meta">${esc(client!.name)} · exported ${fmtWAT(new Date())} by ${esc(u.name)}</p>`;

  if (kind === "ropa") {
    const rows = await q("select * from ropa_entries where client_id = $1 and state = 'active' order by purpose", [clientId]);
    const cols: [string, (r: any) => string][] = [["Purpose", (r) => r.purpose], ["Lawful basis", (r) => (r.lawful_basis ? LAWFUL_BASIS[r.lawful_basis] : "")], ["Data subjects", (r) => r.data_subjects], ["Data categories", (r) => r.data_categories],
      ["Recipients", (r) => r.recipients], ["Transfers outside Nigeria", (r) => (r.has_transfer ? `Yes. ${r.transfer_safeguard ?? "No safeguard recorded"}` : "No")], ["Retention", (r) => r.retention_period], ["Security measures", (r) => r.security_measures], ["System / owner", (r) => r.system_owner]];
    await audit(u, "export", "ropa", clientId, { client_id: clientId, details: { format } });
    return page("Record of processing activities", `<h1>Record of processing activities</h1>${stamp}<table><tr>${cols.map(([h]) => `<th>${h}</th>`).join("")}</tr>${rows.map((r) => `<tr>${cols.map(([, f]) => `<td>${esc(f(r))}</td>`).join("")}</tr>`).join("")}</table>`, format, slug(`${client!.name}-ropa`));
  }

  if (kind === "car") {
    const items = await q("select * from client_car_items where client_id = $1 order by category_key, position", [clientId]);
    const r = readiness(items as { category_key: string; status: string }[]);
    const label: Record<string, string> = { complete: "Complete", in_progress: "In progress", missing: "Missing", not_applicable: "Not applicable" };
    await audit(u, "export", "car_checklist", clientId, { client_id: clientId, details: { format } });
    return page("CAR readiness checklist", `<h1>CAR readiness checklist</h1>${stamp}<p>Overall readiness: <b>${r.overall.pct}%</b> (${r.overall.complete} of ${r.overall.applicable} applicable items complete)</p>` +
      Object.entries(CAR_CATEGORIES).map(([k, l]) => `<h2>${l} (${r.byCategory[k].pct}%)</h2><table>${items.filter((i) => i.category_key === k).map((i) => `<tr><td>${esc(i.item_text)}</td><td>${label[i.status]}${i.na_reason ? `: ${esc(i.na_reason)}` : ""}</td></tr>`).join("")}</table>`).join(""),
      format, slug(`${client!.name}-car-readiness`));
  }
  return denied();
}
