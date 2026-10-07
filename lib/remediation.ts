// Remediation tracker per client and audit year, in the DPCO tracker format (blog/IAUE_NDPA_Remediation_Tracker.xlsx):
// built from the audit's open items and findings, then maintained in the app and exported as a live Excel workbook.
import ExcelJS from "exceljs";
import { q, one } from "./db";
import { loadCarReport, observation, recommendation, CSS } from "./car-report";
import { CONTROLS, PART_OWNER } from "./car-template";
import { CAR_CATEGORIES, remediationDue, trackerStatus, todayWAT, fmtDate, type TrackerStatus } from "./rules";

export type Action = {
  id: string; audit_part: string; control_area: string; non_conformity: string; recommendation: string; priority: string;
  owner: string | null; target_date: string | null; status: string; evidence: string | null; date_closed: string | null;
};
const OTHER_PART = "Other findings and observations";
const RISK_ORDER = "hml";

/** Add tracker rows for open items and findings not yet tracked. Rows already in the tracker are never overwritten. */
export async function buildTracker(clientId: string, year: number, userId: string): Promise<number | null> {
  const d = await loadCarReport(clientId, year);
  if (!d) return null;
  const firm = (await one<{ firm_id: string }>("select firm_id from clients where id = $1", [clientId]))!;
  const rows = [
    ...d.items.filter((i) => i.status === "missing" || i.status === "in_progress").map((i) => ({
      source: "item", key: i.id, part: CAR_CATEGORIES[i.category_key] ?? i.category_key, partOrder: Object.keys(CAR_CATEGORIES).indexOf(i.category_key),
      control: CONTROLS[i.item_text]?.[0] ?? i.section ?? i.item_text.replace(/\?$/, "").slice(0, 80),
      owner: CONTROLS[i.item_text]?.[1] ?? PART_OWNER[i.category_key] ?? "DPO",
      finding: observation(i) === "Not in place, or no evidence was provided." ? `${i.item_text} Not in place, or no evidence was provided.` : observation(i),
      action: recommendation(i), risk: d.risk(i),
    })),
    ...d.findings.filter((f) => f.status === "open").map((f) => ({
      source: "finding", key: f.id, part: OTHER_PART, partOrder: 99, control: "Other finding", owner: "DPO", finding: f.observation,
      action: f.recommendation ?? "Agree a corrective action with management and retain evidence of implementation.", risk: f.risk,
    })),
  ].sort((a, b) => a.partOrder - b.partOrder || RISK_ORDER.indexOf(a.risk[0]) - RISK_ORDER.indexOf(b.risk[0]));
  let pos = (await one<{ n: number }>("select coalesce(max(position), 0)::int as n from remediation_actions where client_id = $1 and audit_year = $2", [clientId, year]))!.n;
  let added = 0;
  for (const r of rows) {
    const ins = await q(`insert into remediation_actions (firm_id, client_id, audit_year, source, source_key, audit_part, control_area, non_conformity, recommendation, priority, owner, target_date, position, updated_by)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) on conflict (client_id, audit_year, source, source_key) do nothing returning 1`,
      [firm.firm_id, clientId, year, r.source, r.key, r.part, r.control, r.finding, r.action, r.risk, r.owner, remediationDue(d.reportDate, r.risk), pos + 1, userId]);
    if (ins.length) { added++; pos++; }
  }
  return added;
}

export const loadTracker = (clientId: string, year: number) =>
  q<Action>("select * from remediation_actions where client_id = $1 and audit_year = $2 order by position", [clientId, year]);

/** Dashboard figures, as on the template's Dashboard sheet. */
export function trackerSummary(rows: Action[], today = todayWAT()) {
  const st = rows.map((r) => trackerStatus(r, today));
  const count = (s: TrackerStatus) => st.filter((x) => x === s).length;
  const parts = [...new Set(rows.map((r) => r.audit_part))];
  return {
    total: rows.length, high: rows.filter((r) => r.priority === "high").length, medium: rows.filter((r) => r.priority === "medium").length, low: rows.filter((r) => r.priority === "low").length,
    status: { "Not Started": count("Not Started"), "In Progress": count("In Progress"), Completed: count("Completed"), Overdue: count("Overdue") } as Record<TrackerStatus, number>,
    completion: rows.length ? Math.round((100 * count("Completed")) / rows.length) : 0,
    byPart: parts.map((p) => [p, rows.filter((r) => r.audit_part === p).length] as [string, number]),
  };
}

const NAVY = "FF1F3864", LIGHT = "FFD9E2F3", YELLOW = "FFFFFF99";
const PRIORITY_FILL: Record<string, string> = { high: "FFF8CBAD", medium: "FFFFE699", low: LIGHT };
const fill = (argb: string) => ({ type: "pattern" as const, pattern: "solid" as const, fgColor: { argb } });
const thin = { style: "thin" as const, color: { argb: "FFBFBFBF" } };
const border = { top: thin, left: thin, bottom: thin, right: thin };
const cap = (p: string) => p.charAt(0).toUpperCase() + p.slice(1);
const asDate = (s: string | null) => (s ? new Date(`${s}T00:00:00Z`) : null);

/** The tracker as an Excel workbook: a formula-driven Dashboard and the Remediation Tracker sheet, styled like the template. */
export async function trackerXlsx(rows: Action[], o: { org: string; year: number; firm: string }) {
  const today = todayWAT(), s = trackerSummary(rows, today);
  const wb = new ExcelJS.Workbook();
  wb.creator = o.firm;
  const dash = wb.addWorksheet("Dashboard", { views: [{ showGridLines: false }] });
  const tr = wb.addWorksheet("Remediation Tracker", { views: [{ state: "frozen", ySplit: 1 }] });

  // Remediation Tracker sheet
  const heads = ["ID", "Audit Part", "Control Area", "Audit Non-Conformity", "Recommendation", "Priority", "Suggested Owner", "Target Completion Date", "Status", "Evidence / Comments", "Date Closed"];
  [6, 30, 26, 46, 46, 10, 22, 20, 16, 34, 16].forEach((w, i) => (tr.getColumn(i + 1).width = w));
  const h = tr.addRow(heads);
  h.eachCell((c) => { c.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } }; c.fill = fill(NAVY); c.alignment = { vertical: "middle", horizontal: "center", wrapText: true }; c.border = border; });
  h.height = 30;
  rows.forEach((r, n) => {
    const row = tr.addRow([n + 1, r.audit_part, r.control_area, r.non_conformity, r.recommendation, cap(r.priority), r.owner ?? "", asDate(r.target_date), trackerStatus(r, today), r.evidence ?? "", asDate(r.date_closed)]);
    row.eachCell({ includeEmpty: true }, (c, col) => {
      c.font = { name: "Arial", size: 10 }; c.alignment = { vertical: "top", wrapText: true }; c.border = border;
      if (col >= 8) c.fill = fill(YELLOW); // for the client's compliance team to complete
      if (col === 6) { c.fill = fill(PRIORITY_FILL[r.priority] ?? LIGHT); c.font = { name: "Arial", size: 10, bold: true }; c.alignment = { vertical: "top", horizontal: "center" }; }
      if (col === 1) c.alignment = { vertical: "top", horizontal: "center" };
      if (col === 8 || col === 11) c.numFmt = "dd-mmm-yyyy";
    });
  });
  const last = rows.length + 1;
  for (let r = 2; r <= last; r++) tr.getCell(`I${r}`).dataValidation = { type: "list", allowBlank: true, formulae: ['"Not Started,In Progress,Completed,Overdue"'] };
  const legend = [
    "Legend:",
    `Yellow cells = for the ${o.org} compliance team to complete (Target Date, Status, Evidence/Comments, Date Closed).`,
    "Priority ratings and suggested owners are defaults based on the audit report; adjust owners to match actual unit responsibilities.",
    "Set Status to Overdue when a target date passes before the action is completed. The Dashboard updates automatically from this sheet.",
  ];
  legend.forEach((text, i) => {
    const r = last + 2 + i;
    tr.mergeCells(`A${r}:K${r}`);
    const c = tr.getCell(`A${r}`);
    c.value = text; c.font = { name: "Arial", size: 9, italic: i > 0, bold: i === 0, color: { argb: "FF404040" } };
  });

  // Dashboard sheet: formulas over the tracker, with current values so it reads correctly before recalculation.
  [4, 32, 16, 16, 40, 16, 16].forEach((w, i) => (dash.getColumn(i + 1).width = w));
  const T = (col: string) => `'Remediation Tracker'!${col}2:${col}${Math.max(last, 2)}`;
  dash.getCell("B2").value = o.org.toUpperCase(); dash.getCell("B2").font = { name: "Arial", size: 16, bold: true, color: { argb: NAVY } };
  dash.getCell("B3").value = "NDPA / GAID Audit Remediation Tracker — Live Dashboard"; dash.getCell("B3").font = { name: "Arial", size: 12, bold: true, color: { argb: "FF404040" } };
  dash.getCell("B4").value = `Source: ${o.year} Data Protection Annual Audit Report, prepared by ${o.firm}`; dash.getCell("B4").font = { name: "Arial", size: 9, italic: true, color: { argb: "FF808080" } };
  const head = (ref: string, text: string) => { const c = dash.getCell(ref); c.value = text; c.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } }; c.fill = fill(NAVY); c.alignment = { horizontal: "center", vertical: "middle", wrapText: true }; c.border = border; };
  const val = (ref: string, formula: string, result: number, big = false, pct = false) => {
    const c = dash.getCell(ref); c.value = { formula, result }; c.border = border; c.alignment = { horizontal: "center", vertical: "middle" };
    c.font = { name: "Arial", size: big ? 20 : 10, bold: big, color: { argb: NAVY } }; c.fill = fill(LIGHT); if (pct) c.numFmt = "0%";
  };
  [["B6", "Total Findings"], ["C6", "High Priority"], ["D6", "Medium Priority"], ["E6", "Low Priority"]].forEach(([r, t]) => head(r, t));
  val("B7", `COUNTA(${T("A")})`, s.total, true);
  val("C7", `COUNTIF(${T("F")},"High")`, s.high, true);
  val("D7", `COUNTIF(${T("F")},"Medium")`, s.medium, true);
  val("E7", `COUNTIF(${T("F")},"Low")`, s.low, true);
  dash.getRow(7).height = 34;

  dash.getCell("B10").value = "Status Breakdown"; dash.getCell("B10").font = { name: "Arial", size: 11, bold: true, color: { argb: NAVY } };
  head("B11", "Status"); head("C11", "Count");
  (["Not Started", "In Progress", "Completed", "Overdue"] as TrackerStatus[]).forEach((st, i) => {
    const c = dash.getCell(`B${12 + i}`); c.value = st; c.font = { name: "Arial", size: 10 }; c.border = border;
    val(`C${12 + i}`, `COUNTIF(${T("I")},"${st}")`, s.status[st]);
  });
  const lbl = dash.getCell("B16"); lbl.value = "Overall Completion Rate"; lbl.font = { name: "Arial", size: 10, bold: true }; lbl.border = border;
  val("C16", "IF(B7=0,0,C14/B7)", s.total ? s.status.Completed / s.total : 0, false, true);

  dash.getCell("E10").value = "Findings by Audit Part"; dash.getCell("E10").font = { name: "Arial", size: 11, bold: true, color: { argb: NAVY } };
  head("E11", "Audit Part"); head("F11", "Count");
  s.byPart.forEach(([part, n], i) => {
    const c = dash.getCell(`E${12 + i}`); c.value = part; c.font = { name: "Arial", size: 10 }; c.border = border; c.alignment = { wrapText: true };
    val(`F${12 + i}`, `COUNTIF(${T("B")},"${part.replace(/"/g, '""')}")`, n);
  });
  const noteRow = Math.max(17, 11 + s.byPart.length) + 3;
  dash.mergeCells(`B${noteRow}:G${noteRow}`);
  dash.getCell(`B${noteRow}`).value = "Note: figures update automatically as the compliance team completes the Status column in the Remediation Tracker sheet.";
  dash.getCell(`B${noteRow}`).font = { name: "Arial", size: 9, italic: true, color: { argb: "FF808080" } };

  return Buffer.from(await wb.xlsx.writeBuffer());
}

const esc = (v: unknown) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** The tracker as a printable page (PDF via the browser, or Word): dashboard figures, then the tracker table. */
export function trackerHtml(rows: Action[], o: { org: string; year: number; firm: string }) {
  const today = todayWAT(), s = trackerSummary(rows, today);
  const body = `
  <h1>${esc(o.org)}</h1>
  <p style="font-size:12pt;font-weight:700;color:#404040;margin:0">NDPA / GAID Audit Remediation Tracker</p>
  <p class="note">Source: ${o.year} Data Protection Annual Audit Report, prepared by ${esc(o.firm)}. Status as at ${fmtDate(today)}.</p>
  <table><tr><th>Total Findings</th><th>High Priority</th><th>Medium Priority</th><th>Low Priority</th><th>Completion Rate</th></tr>
    <tr style="font-size:16pt;font-weight:700;text-align:center"><td>${s.total}</td><td class="r-high">${s.high}</td><td class="r-medium">${s.medium}</td><td class="r-low">${s.low}</td><td>${s.completion}%</td></tr></table>
  <div style="display:flex;gap:16px"><table style="flex:1"><tr><th>Status</th><th>Count</th></tr>${Object.entries(s.status).map(([k, n]) => `<tr><td>${k}</td><td>${n}</td></tr>`).join("")}</table>
    <table style="flex:2"><tr><th>Audit Part</th><th>Count</th></tr>${s.byPart.map(([p, n]) => `<tr><td>${esc(p)}</td><td>${n}</td></tr>`).join("")}</table></div>
  <h2>Remediation Tracker</h2>
  ${rows.length ? `<table style="font-size:8.5pt"><tr><th>ID</th><th>Audit Part</th><th>Control Area</th><th>Audit Non-Conformity</th><th>Recommendation</th><th>Priority</th><th>Suggested Owner</th><th>Target Completion Date</th><th>Status</th><th>Evidence / Comments</th><th>Date Closed</th></tr>
  ${rows.map((r, n) => { const st = trackerStatus(r, today); return `<tr><td>${n + 1}</td><td>${esc(r.audit_part)}</td><td>${esc(r.control_area)}</td><td>${esc(r.non_conformity)}</td><td>${esc(r.recommendation)}</td><td class="r-${r.priority}">${cap(r.priority)}</td><td>${esc(r.owner)}</td><td>${r.target_date ? fmtDate(r.target_date) : ""}</td><td${st === "Overdue" ? ' class="r-high"' : ""}>${st}</td><td>${esc(r.evidence)}</td><td>${r.date_closed ? fmtDate(r.date_closed) : ""}</td></tr>`; }).join("")}</table>`
    : "<p><b>No remediation actions.</b> All assessed controls are in place.</p>"}
  <p class="note">Priority ratings and suggested owners are defaults based on the audit report; adjust owners to match actual unit responsibilities.</p>
  <h3>Management agreement</h3>
  <p>We agree to implement the actions above by the target dates and to provide evidence of closure to ${esc(o.firm)}.</p>
  <table><tr><td class="k">Name</td><td style="height:28px"></td></tr><tr><td class="k">Position</td><td style="height:28px"></td></tr><tr><td class="k">Signature and date</td><td style="height:40px"></td></tr></table>`;
  return { title: `${o.org} NDPA Remediation Tracker ${o.year}`, css: CSS(`${o.org} NDPA Remediation Tracker ${o.year} © ${o.firm}`).replace(/@page :first \{[^}]*\}[^}]*\}[^}]*\}/, "") + " @page { size: A4 landscape; }", body };
}
