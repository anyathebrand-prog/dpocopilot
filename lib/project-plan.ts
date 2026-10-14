// Project plan for one client: every task with start and due dates, owner and status, and a timeline (Gantt) by week or month.
import { CSS } from "./car-report";
import { fmtDate, todayWAT } from "./rules";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const day = (s: string) => Date.parse(s + "T00:00:00Z") / 86400000;
const iso = (d: number) => new Date(d * 86400000).toISOString().slice(0, 10);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Timeline columns: weeks (Monday start) when the plan spans up to 16 weeks, otherwise months (at most 24). */
export function timeline(from: string, to: string): { label: string; start: number; end: number }[] {
  const a = day(from), b = day(to);
  if (b - a <= 16 * 7) {
    const cols = [];
    for (let s = a - ((new Date(a * 86400000).getUTCDay() + 6) % 7); s <= b; s += 7) cols.push({ label: `${Number(iso(s).slice(8))} ${MONTHS[Number(iso(s).slice(5, 7)) - 1]}`, start: s, end: s + 6 });
    return cols;
  }
  const cols = [];
  let y = Number(from.slice(0, 4)), m = Number(from.slice(5, 7)) - 1;
  while (cols.length < 24) {
    const s = Date.UTC(y, m, 1) / 86400000, e = Date.UTC(y, m + 1, 0) / 86400000;
    if (s > b) break;
    cols.push({ label: `${MONTHS[m]} ${String(y).slice(2)}`, start: s, end: e });
    if (++m === 12) { m = 0; y++; }
  }
  return cols;
}

export function projectPlanHtml(org: string, firm: any, rows: any[]) {
  const today = todayWAT();
  const dated = rows.filter((r) => r.start_on || r.due_on);
  const span = (r: any) => [r.start_on ?? r.due_on, r.due_on ?? r.start_on] as [string, string];
  const from = dated.length ? dated.map((r) => span(r)[0]).sort()[0] : today, to = dated.length ? dated.map((r) => span(r)[1]).sort().at(-1)! : today;
  const cols = timeline(from, to);
  const status = (r: any) => (r.status === "done" ? "Done" : r.due_on && r.due_on < today ? "Overdue" : r.start_on && r.start_on <= today ? "In progress" : "Not started");
  const colour = (r: any) => ({ Done: "#2E7D32", Overdue: "#C62828", "In progress": "#1F3864", "Not started": "#8EA9DB" })[status(r)];
  const days = (r: any) => (r.start_on && r.due_on ? day(r.due_on) - day(r.start_on) + 1 : null);
  const done = rows.filter((r) => r.status === "done").length;
  const body = `
<h1>Project Plan – ${esc(org)}</h1>
<table>
  <tr><td class="k">Client</td><td>${esc(org)}</td><td class="k">Prepared by</td><td>${esc(firm.name)}</td></tr>
  <tr><td class="k">Plan period</td><td>${dated.length ? `${fmtDate(from)} – ${fmtDate(to)}` : "No dated tasks yet"}</td><td class="k">Date</td><td>${fmtDate(today)}</td></tr>
  <tr><td class="k">Tasks</td><td>${rows.length} (${done} done, ${rows.filter((r) => status(r) === "Overdue").length} overdue)</td><td class="k">Progress</td><td>${rows.length ? Math.round((100 * done) / rows.length) : 0}% complete</td></tr>
</table>
<h2>1. Tasks</h2>
<table><tr><th style="width:4%">#</th><th>Project</th><th>Activity / sub-activity</th><th>Owner</th><th style="width:11%">Start</th><th style="width:11%">Due</th><th style="width:8%">Days</th><th style="width:11%">Status</th></tr>
${rows.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.project_name ?? "")}</td><td><b>${esc(r.title)}</b>${r.sub_activity ? `<br>${esc(r.sub_activity)}` : ""}</td><td>${esc(r.assignee) || "Unassigned"}</td><td>${r.start_on ? fmtDate(r.start_on) : "—"}</td><td>${r.due_on ? fmtDate(r.due_on) : "—"}</td><td>${days(r) ?? "—"}</td><td><span style="color:${colour(r)}"><b>${status(r)}</b></span>${r.done_on ? `<br>${fmtDate(r.done_on)}` : ""}</td></tr>`).join("")}
</table>
${dated.length ? `<h2 class="break">2. Timeline</h2>
<table><tr><th style="width:24%">Task</th>${cols.map((c) => `<th style="text-align:center;font-size:7.5pt;padding:4px 2px">${c.label}</th>`).join("")}</tr>
${dated.map((r) => { const [s, e] = span(r).map(day); return `<tr><td style="font-size:8.5pt">${esc(r.title)}${r.sub_activity ? ` – ${esc(r.sub_activity)}` : ""}</td>${cols.map((c) => (c.end >= s && c.start <= e ? `<td style="background:${colour(r)}"></td>` : "<td></td>")).join("")}</tr>`; }).join("")}
</table>
<p class="note">Key: <span style="color:#8EA9DB"><b>■</b></span> Not started · <span style="color:#1F3864"><b>■</b></span> In progress · <span style="color:#2E7D32"><b>■</b></span> Done · <span style="color:#C62828"><b>■</b></span> Overdue. Columns are ${cols.length && cols[0].end - cols[0].start === 6 ? "weeks (starting Monday)" : "months"}.${rows.length > dated.length ? ` ${rows.length - dated.length} task(s) without dates are not shown on the timeline.` : ""}</p>` : ""}
<h2>${dated.length ? "3" : "2"}. Approval</h2>
<table><tr><th></th><th>Name</th><th>Signature</th><th>Date</th></tr><tr><td>Prepared by (${esc(firm.name)})</td><td>${esc(firm.signatory_name ?? "")}</td><td></td><td></td></tr><tr><td>Accepted by (${esc(org)})</td><td></td><td></td><td></td></tr></table>`;
  return { title: `${org} Project Plan`, css: CSS(`${org} · Project Plan`) + "\n@page { size: A4 landscape; }\nbody { max-width: 1100px; }", body };
}
