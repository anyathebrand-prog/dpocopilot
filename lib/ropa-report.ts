// Record of Processing Activities (RoPA) as a print-ready, branded register (A4 landscape). Also the source of the Word export.
import { CSS as BASE } from "./car-report";
import { LAWFUL_BASIS } from "./templates";
import { fmtDate, fmtWAT, todayWAT } from "./rules";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const cell = (v: unknown) => (v && String(v).trim() ? esc(v) : `<span class="ns">Not recorded</span>`);


export function ropaHtml(rows: Record<string, any>[], o: { client: string; dept?: string; by: string }) {
  const title = `Record of Processing Activities${o.dept ? ` — ${o.dept}` : ""}`;
  const depts = new Set(rows.map((r) => r.department).filter(Boolean)).size;
  const sensitive = rows.filter((r) => r.involves_sensitive).length;
  const transfers = rows.filter((r) => r.has_transfer).length;
  const highRisk = rows.filter((r) => r.is_high_risk).length;

  const body = `
<table class="band"><tr>
  <td class="band-l"><span class="firm">${esc(o.client)}</span></td>
  <td class="band-r"><span class="kicker">NDPA 2023 · GAID 2025</span><br><span class="doc">${esc(title)}</span></td>
</tr></table>

<table class="facts"><tr>
  <td><span class="lbl">Organisation</span><br><b>${esc(o.client)}</b></td>
  <td><span class="lbl">Scope</span><br><b>${o.dept ? esc(o.dept) : "All departments"}</b></td>
  <td><span class="lbl">Date</span><br><b>${fmtDate(todayWAT())}</b></td>
</tr></table>

<table class="stats"><tr>
  <td><span class="n">${rows.length}</span><br>processing ${rows.length === 1 ? "activity" : "activities"}</td>
  ${o.dept ? "" : `<td><span class="n">${depts}</span><br>department${depts === 1 ? "" : "s"}</td>`}
  <td><span class="n">${sensitive}</span><br>with sensitive data</td>
  <td><span class="n">${transfers}</span><br>sent outside the country</td>
  <td><span class="n">${highRisk}</span><br>high risk (DPIA)</td>
</tr></table>

${rows.length ? `<table class="reg">
  <thead><tr><th style="width:3%">S/N</th><th style="width:14%">Processing activity</th><th style="width:10%">Lawful basis</th><th style="width:12%">Data subjects</th><th style="width:13%">Personal data</th><th style="width:11%">Recipients</th><th style="width:10%">Transfers</th><th style="width:9%">Retention</th><th style="width:11%">Security measures</th><th style="width:7%">System / owner</th></tr></thead>
  <tbody>${rows.map((r, i) => `<tr${i % 2 ? ' class="alt"' : ""}>
    <td>${i + 1}</td>
    <td><b>${esc(r.purpose)}</b>${o.dept || !r.department ? "" : `<br><span class="small">${esc(r.department)}</span>`}${r.involves_sensitive ? `<br><span class="tag">Sensitive</span>` : ""}${r.is_high_risk ? ` <span class="tag hr">High risk</span>` : ""}</td>
    <td>${r.lawful_basis ? esc(LAWFUL_BASIS[r.lawful_basis] ?? r.lawful_basis) : cell(null)}</td>
    <td>${cell(r.data_subjects)}</td>
    <td>${cell(r.data_categories)}</td>
    <td>${cell(r.recipients)}</td>
    <td>${r.has_transfer ? `Yes${r.transfer_safeguard ? `<br><span class="small">${esc(r.transfer_safeguard)}</span>` : `<br><span class="ns">No safeguard recorded</span>`}` : "No"}</td>
    <td>${cell(r.retention_period)}</td>
    <td>${cell(r.security_measures)}</td>
    <td>${cell(r.system_owner)}</td>
  </tr>`).join("")}</tbody>
</table>` : `<p class="empty">No processing activities recorded${o.dept ? ` for ${esc(o.dept)}` : ""} yet.</p>`}

<p class="note">This record is kept under the Nigeria Data Protection Act 2023 and the GAID 2025. It lists each processing activity, its lawful basis, the personal data involved, who receives it, transfers outside the country, how long it is kept and how it is protected. Review it at least once a year and whenever processing changes.</p>

<table class="sig"><tr>
  <td class="k2">Prepared by</td><td class="ln"></td><td class="k2">Date</td><td class="ln d"></td><td class="gap"></td>
  <td class="k2">Approved by</td><td class="ln"></td><td class="k2">Date</td><td class="ln d"></td>
</tr><tr><td></td><td class="hint">Name, designation and signature</td><td></td><td></td><td class="gap"></td><td></td><td class="hint">Name, designation and signature</td><td></td><td></td></tr></table>
<p class="small foot">Generated ${esc(fmtWAT(new Date()))} by ${esc(o.by)} with DPO Copilot.</p>`;

  const css = BASE(`${o.client} · ${title}`).replace("@page { size: A4;", "@page { size: A4 landscape;").replace("max-width: 820px", "max-width: 1100px") + `
body { font-size: 9.5pt; }
table.band { margin: 0 0 14px; } table.band td { border: none; background: #0d1f4a; color: #fff; padding: 12px 16px; vertical-align: middle; }
.band-l .firm { font-size: 14pt; font-weight: 700; color: #fff; } .band-l .small { color: #c9d4ea; }
.band-r { text-align: right; width: 45%; } .kicker { font-size: 8pt; letter-spacing: .08em; text-transform: uppercase; color: #9fc0ee; } .doc { font-size: 17pt; font-weight: 700; color: #fff; }
table.facts td { border: none; border-bottom: 2px solid #e3e8f0; padding: 6px 10px 8px 0; width: 33%; }
.lbl { font-size: 7.5pt; text-transform: uppercase; letter-spacing: .06em; color: #5f6878; font-weight: 600; }
table.stats { margin: 8px 0 12px; } table.stats td { border: none; background: #f2f5fa; border-left: 4px solid #2a6aa8; padding: 6px 12px; font-size: 8.5pt; color: #5f6878; }
table.stats td + td { border-left-width: 4px; } .n { font-size: 16pt; font-weight: 700; color: #0d1f4a; }
table.reg { font-size: 8.3pt; } table.reg th { font-size: 8pt; padding: 7px 6px; } table.reg td { padding: 6px; border-color: #dde2ea; }
table.reg thead { display: table-header-group; } tr.alt td { background: #f7f9fc; }
.small { font-size: 7.8pt; color: #5f6878; } .ns { color: #b26a00; font-style: italic; font-size: 7.8pt; }
.tag { display: inline-block; font-size: 7pt; font-weight: 700; padding: 1px 5px; border-radius: 3px; background: #fdecea; color: #b42318; margin-top: 3px; } .tag.hr { background: #fff4e0; color: #b26a00; }
.empty { padding: 24px; text-align: center; background: #f7f9fc; color: #5f6878; }
.note { margin-top: 8px; }
table.sig { margin-top: 22px; break-inside: avoid; } table.sig td { border: none; padding: 0 6px 0 0; vertical-align: bottom; }
table.sig td.k2 { font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #0d1f4a; white-space: nowrap; width: 1%; padding-bottom: 2px; }
table.sig td.ln { border-bottom: 1px solid #1b2433; height: 30px; width: 24%; } table.sig td.ln.d { width: 11%; } table.sig td.gap { width: 4%; }
table.sig td.hint { font-size: 7.5pt; color: #5f6878; padding-top: 3px; }
.foot { margin-top: 8px; text-align: right; }`;
  return { title: `${o.client} - ${title}`, body, css };
}
