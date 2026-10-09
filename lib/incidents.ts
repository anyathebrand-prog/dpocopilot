// Data Privacy Incident Register (blog/Data_Privacy_Incident_Register.xlsx): the client's own log of personal data incidents
// under NDPA 2023 s.40 / GAID 2025, with the 72-hour NDPC deadline (Date Discovered + 3 days) and notification compliance.
import { fmtDate, todayWAT } from "./rules.ts";

export const LISTS = {
  type: ["Unauthorised access", "Unauthorised disclosure", "Loss of data / device", "Theft of data / device", "Ransomware / malware", "Phishing / social engineering", "Misdirected email / mail", "Accidental deletion / alteration", "Improper disposal", "Insider misuse", "Processor / vendor breach", "Other"],
  category: ["Confidentiality", "Integrity", "Availability", "Combination"],
  data: ["Personal data", "Sensitive personal data", "Children's data", "Financial data", "Health data", "Credentials / IDs", "Mixed"],
  severity: ["Low", "Medium", "High", "Critical"],
  risk: ["Unlikely", "Likely", "High risk"],
  yesno: ["Yes", "No"],
  status: ["Reported", "Under Investigation", "Contained", "Remediated", "Closed"],
  source: ["Employee", "Customer / Data subject", "Processor / Vendor", "Monitoring / SOC", "Regulator", "Audit", "Media", "Other"],
};

type F = { key: string; label: string; kind?: "date" | "time" | "number" | "textarea" | "dept"; list?: keyof typeof LISTS; required?: boolean };
/** The register's columns, in the workbook's order (computed columns are added by `computed`). */
export const SECTIONS: [string, F[]][] = [
  ["Reporting", [
    { key: "date_reported", label: "Date Reported", kind: "date", required: true }, { key: "reported_by", label: "Reported By" }, { key: "source", label: "Source of Report", list: "source" },
    { key: "occurred_on", label: "Date Incident Occurred", kind: "date" }, { key: "discovered_on", label: "Date Discovered", kind: "date", required: true }, { key: "discovered_time", label: "Time Discovered", kind: "time" }]],
  ["Incident", [
    { key: "title", label: "Incident Title", required: true }, { key: "description", label: "Description", kind: "textarea" }, { key: "incident_type", label: "Incident Type", list: "type", required: true },
    { key: "breach_category", label: "Breach Category", list: "category" }, { key: "systems", label: "Systems / Assets Affected" }, { key: "department", label: "Department / Unit", kind: "dept" }]],
  ["Data and people affected", [
    { key: "data_categories", label: "Data Categories", list: "data" }, { key: "subjects_type", label: "Data Subjects Affected (Type)" }, { key: "subjects_count", label: "No. of Data Subjects", kind: "number" },
    { key: "records_count", label: "No. of Records", kind: "number" }, { key: "cross_border", label: "Cross-border Data Involved?", list: "yesno" }, { key: "processor", label: "Processor / Third Party Involved?", list: "yesno" }]],
  ["Assessment and containment", [
    { key: "severity", label: "Severity", list: "severity", required: true }, { key: "risk", label: "Risk to Data Subjects' Rights & Freedoms", list: "risk" },
    { key: "containment", label: "Containment Actions Taken", kind: "textarea" }, { key: "root_cause", label: "Root Cause", kind: "textarea" }]],
  ["Notification (NDPA s.40)", [
    { key: "ndpc_required", label: "NDPC Notification Required?", list: "yesno" }, { key: "ndpc_notified_on", label: "Date NDPC Notified", kind: "date" },
    { key: "subjects_notified", label: "Data Subjects Notified?", list: "yesno" }, { key: "subjects_notified_on", label: "Date Data Subjects Notified", kind: "date" }]],
  ["Remediation and closure", [
    { key: "remediation", label: "Remediation / Corrective Actions", kind: "textarea" }, { key: "action_owner", label: "Action Owner" }, { key: "remediation_due", label: "Remediation Due Date", kind: "date" },
    { key: "status", label: "Status", list: "status", required: true }, { key: "closed_on", label: "Date Closed", kind: "date" }, { key: "lessons", label: "Lessons Learned", kind: "textarea" }, { key: "remarks", label: "Remarks", kind: "textarea" }]],
];
export const FIELDS = SECTIONS.flatMap(([, fs]) => fs);

const addDays = (d: string, n: number) => new Date(Date.parse(d + "T00:00:00Z") + n * 86400000).toISOString().slice(0, 10);
const dayDiff = (a: string, b: string) => Math.round((Date.parse(a + "T00:00:00Z") - Date.parse(b + "T00:00:00Z")) / 86400000);

/** The workbook's calculated columns: 72-hour deadline, days to notify, and notification status. */
export function computed(d: Record<string, string>, today = todayWAT()) {
  const deadline = d.ndpc_required === "Yes" && d.discovered_on ? addDays(d.discovered_on, 3) : "";
  const days = d.ndpc_notified_on && d.discovered_on ? dayDiff(d.ndpc_notified_on, d.discovered_on) : null;
  const status = d.ndpc_required !== "Yes" ? (d.ndpc_required === "No" ? "Not required" : "To be assessed")
    : d.ndpc_notified_on ? (days! <= 3 ? "Notified within 72h" : "Notified late") : deadline && today > deadline ? "Overdue" : "Pending";
  return { deadline, days, status };
}

/** The Dashboard sheet's figures. */
export function dashboard(rows: Record<string, string>[], today = todayWAT()) {
  const c = rows.map((r) => ({ r, x: computed(r, today) }));
  const count = (f: (r: Record<string, string>) => boolean) => rows.filter(f).length;
  return {
    total: rows.length, open: count((r) => r.status !== "Closed"), closed: count((r) => r.status === "Closed"),
    highCritical: count((r) => r.severity === "High" || r.severity === "Critical"), required: count((r) => r.ndpc_required === "Yes"),
    notified: count((r) => !!r.ndpc_notified_on), within: c.filter(({ x }) => x.days !== null && x.days >= 0 && x.days <= 3).length,
    late: c.filter(({ x }) => x.days !== null && x.days > 3).length, overdue: c.filter(({ x }) => x.status === "Overdue").length,
    subjects: rows.reduce((a, r) => a + (Number(r.subjects_count) || 0), 0), records: rows.reduce((a, r) => a + (Number(r.records_count) || 0), 0),
    bySeverity: LISTS.severity.map((s) => [s, count((r) => r.severity === s)] as const),
    byStatus: LISTS.status.map((s) => [s, count((r) => r.status === s)] as const),
    byType: LISTS.type.map((s) => [s, count((r) => r.incident_type === s)] as const).filter(([, n]) => n),
  };
}

/** The register as an Excel workbook in the template's layout (Incident Register + Dashboard sheets). */
export async function registerXlsx(org: string, dpo: string, rows: { number: string; data: Record<string, string> }[]) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Incident Register", { views: [{ state: "frozen", ySplit: 4, xSplit: 1 }] });
  const cols =["Incident ID", "Date Reported", "Reported By", "Source of Report", "Date Incident Occurred", "Date Discovered", "Time Discovered", "Incident Title", "Description", "Incident Type", "Breach Category", "Systems / Assets Affected", "Department / Unit", "Data Categories", "Data Subjects Affected (Type)", "No. of Data Subjects", "No. of Records", "Cross-border Data Involved?", "Processor / Third Party Involved?", "Severity", "Risk to Data Subjects' Rights & Freedoms", "Containment Actions Taken", "Root Cause", "NDPC Notification Required?", "NDPC Notification Deadline (72h)", "Date NDPC Notified", "Days to Notify NDPC", "NDPC Notification Status", "Data Subjects Notified?", "Date Data Subjects Notified", "Remediation / Corrective Actions", "Action Owner", "Remediation Due Date", "Status", "Date Closed", "Lessons Learned", "Remarks"];
  ws.addRow(["DATA PRIVACY INCIDENT REGISTER"]).font = { bold: true, size: 14, color: { argb: "FF0D1F4A" } };
  ws.addRow([`Prepared in line with the Nigeria Data Protection Act 2023 (NDPA) and the GAID 2025 | Organisation: ${org} | DPO: ${dpo} | Exported ${fmtDate(todayWAT())}`]).font = { italic: true, size: 9 };
  ws.addRow([]);
  const hr = ws.addRow(cols);
  hr.eachCell((c) => { c.font = { bold: true, color: { argb: "FFFFFFFF" } }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0D1F4A" } }; c.alignment = { wrapText: true, vertical: "middle" }; });
  hr.height = 42;
  const sev: Record<string, string> = { Low: "FFD4EDDA", Medium: "FFFFF3CD", High: "FFF8D7DA", Critical: "FFC62828" };
  for (const { number, data: d } of rows) {
    const x = computed(d), date = (v?: string) => (v ? new Date(v + "T00:00:00Z") : null);
    const r = ws.addRow([number, date(d.date_reported), d.reported_by, d.source, date(d.occurred_on), date(d.discovered_on), d.discovered_time, d.title, d.description, d.incident_type, d.breach_category, d.systems, d.department, d.data_categories, d.subjects_type,
      d.subjects_count ? Number(d.subjects_count) : null, d.records_count ? Number(d.records_count) : null, d.cross_border, d.processor, d.severity, d.risk, d.containment, d.root_cause, d.ndpc_required,
      date(x.deadline), date(d.ndpc_notified_on), x.days, x.status, d.subjects_notified, date(d.subjects_notified_on), d.remediation, d.action_owner, date(d.remediation_due), d.status, date(d.closed_on), d.lessons, d.remarks]);
    r.alignment = { wrapText: true, vertical: "top" };
    for (const i of [2, 5, 6, 25, 26, 30, 33, 35]) r.getCell(i).numFmt = "dd-mmm-yyyy";
    if (sev[d.severity]) r.getCell(20).fill = { type: "pattern", pattern: "solid", fgColor: { argb: sev[d.severity] } };
    if (x.status === "Overdue") r.getCell(25).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8D7DA" } };
  }
  cols.forEach((_, i) => { ws.getColumn(i + 1).width = [9, 22, 30, 36, 38].includes(i + 1) || [21, 22, 23, 31, 36, 37].includes(i + 1) ? 34 : 16; });
  const db = wb.addWorksheet("Dashboard"), m = dashboard(rows.map((r) => r.data));
  db.addRow(["INCIDENT DASHBOARD"]).font = { bold: true, size: 14, color: { argb: "FF0D1F4A" } };
  db.addRow([]);
  for (const [k, v] of [["Total incidents logged", m.total], ["Open incidents (not Closed)", m.open], ["Closed incidents", m.closed], ["Critical / High severity", m.highCritical], ["NDPC notification required", m.required], ["NDPC notified", m.notified], ["Notified within 72 hours", m.within], ["Notified late (>72 hours)", m.late], ["Notification overdue (not yet notified)", m.overdue], ["Total data subjects affected", m.subjects], ["Total records affected", m.records]] as [string, number][]) db.addRow([k, v]);
  for (const [title, list] of [["By Severity", m.bySeverity], ["By Status", m.byStatus], ["By Incident Type", m.byType]] as [string, readonly (readonly [string, number])[]][]) { db.addRow([]); db.addRow([title]).font = { bold: true }; for (const [k, v] of list) db.addRow([k, v]); }
  db.getColumn(1).width = 42; db.getColumn(2).width = 12;
  return Buffer.from(await wb.xlsx.writeBuffer());
}
