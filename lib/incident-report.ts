// Incident Report: one logged incident from the client's Data Privacy Incident Register, as a print-ready document
// (PDF through the browser, or Word). Every register field by section, the 72-hour NDPC deadline and notification status.
import { CSS as BASE } from "./car-report";
import { fmtDate, todayWAT } from "./rules";
import { SECTIONS, computed } from "./incidents";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const NONE = `<span class="muted">Not recorded</span>`;

export type IncidentReportInput = { org: string; dpo?: string; number: string; data: Record<string, string> };

export function incidentReportHtml(o: IncidentReportInput) {
  const d = o.data, x = computed(d);
  const val = (key: string, kind?: string) => {
    const v = (d[key] ?? "").trim();
    if (!v) return NONE;
    if (kind === "date") return esc(fmtDate(v));
    if (kind === "number") return esc(Number(v).toLocaleString("en-NG"));
    return esc(v).replace(/\r?\n/g, "<br>");
  };
  const late = x.status === "Overdue" || x.status === "Notified late";
  const title = `Incident Report ${o.number}`;

  const body = `
<table class="band"><tr>
  <td class="band-l"><span class="org">${esc(o.org)}</span></td>
  <td class="band-r"><span class="kicker">NDPA 2023 · Section 40 · GAID 2025</span><br><span class="doc">Data Privacy Incident Report</span></td>
</tr></table>

<table class="facts"><tr>
  <td><span class="lbl">Incident ID</span><br><b>${esc(o.number)}</b></td>
  <td><span class="lbl">Title</span><br><b>${val("title")}</b></td>
  <td><span class="lbl">Severity</span><br><b class="sev-${esc((d.severity ?? "").toLowerCase())}">${val("severity")}</b></td>
  <td><span class="lbl">Status</span><br><b>${val("status")}</b></td>
  <td><span class="lbl">Report date</span><br><b>${fmtDate(todayWAT())}</b></td>
</tr></table>

<h2>NDPC notification (72 hours)</h2>
<table class="kv">
  <tr><td class="k">NDPC notification required?</td><td>${val("ndpc_required")}</td></tr>
  <tr><td class="k">NDPC notification deadline (72h)</td><td>${x.deadline ? esc(fmtDate(x.deadline)) : `<span class="muted">${d.ndpc_required === "Yes" ? "Set the date discovered" : "Not required / not assessed"}</span>`}</td></tr>
  <tr><td class="k">Days taken to notify the NDPC</td><td>${x.days !== null ? `${x.days} day${x.days === 1 ? "" : "s"}` : NONE}</td></tr>
  <tr><td class="k">Notification status</td><td>${late ? `<b class="sev-critical">${esc(x.status)}</b>` : esc(x.status)}</td></tr>
</table>

${SECTIONS.map(([name, fields]) => `<h2>${esc(name)}</h2>
<table class="kv">${fields.map((f) => `<tr><td class="k">${esc(f.label)}</td><td>${val(f.key, f.kind)}</td></tr>`).join("")}</table>`).join("\n")}

<p class="small">Section 40 of the NDPA 2023 requires a data controller to notify the Nigeria Data Protection Commission within 72 hours of becoming aware of a personal data breach likely to result in a risk to the rights and freedoms of individuals, and to inform the data subjects without undue delay where the breach is likely to result in high risk to them.</p>

<table class="sig"><tr>
  <td class="k2">Prepared by</td><td class="ln"></td><td class="k2">Date</td><td class="ln d"></td><td class="gap"></td>
  <td class="k2">Reviewed by (DPO)</td><td class="ln">${o.dpo ? `<span class="pre">${esc(o.dpo)}</span>` : ""}</td>
</tr><tr><td></td><td class="hint">Name, designation and signature</td><td></td><td></td><td class="gap"></td><td></td><td class="hint">Name and signature</td></tr></table>
<p class="small" style="margin-top:18px">Confidential: restrict access to the DPO and authorised staff.</p>`;

  const css = BASE(`${o.org} · ${title} · Confidential`) + `
h2 { break-after: avoid; }
table.band { margin: 0 0 14px; } table.band td { border: none; background: #0d1f4a; color: #fff; padding: 14px 16px; vertical-align: middle; }
.band-l .org { font-size: 14pt; font-weight: 700; color: #fff; } .band-r { text-align: right; width: 55%; }
.kicker { font-size: 8pt; letter-spacing: .08em; text-transform: uppercase; color: #9fc0ee; } .doc { font-size: 17pt; font-weight: 700; color: #fff; }
table.facts td { border: none; border-bottom: 2px solid #e3e8f0; padding: 6px 10px 8px 0; }
.lbl { font-size: 7.5pt; text-transform: uppercase; letter-spacing: .06em; color: #5f6878; font-weight: 600; }
table.kv td.k { width: 38%; } .small { font-size: 8.5pt; color: #5f6878; }
.sev-low { color: #1e7a4c; } .sev-medium { color: #b26a00; } .sev-high, .sev-critical { color: #b42318; }
table.sig { margin-top: 26px; break-inside: avoid; } table.sig td { border: none; padding: 0 6px 0 0; vertical-align: bottom; }
table.sig td.k2 { font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #0d1f4a; white-space: nowrap; width: 1%; padding-bottom: 2px; }
table.sig td.ln { border-bottom: 1px solid #1b2433; height: 30px; width: 30%; } table.sig td.ln.d { width: 14%; } table.sig td.gap { width: 4%; }
table.sig td.hint { font-size: 7.5pt; color: #5f6878; padding-top: 3px; } .pre { font-size: 9pt; }`;
  return { title: `${o.org} - ${title}`, body, css };
}
