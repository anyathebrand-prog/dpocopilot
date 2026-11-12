// CAR Performance Trend export: a PDF/Word report (both charts, category and KPI tables, the approved copilot summary)
// and a CSV for analysis. The client portal gets locked years only, without override reasons.
import { CSS as BASE } from "./car-report";
import { fmtDate, todayWAT } from "./rules";
import { CATS, KPIS, r1, band, BAND_COLOR, nextDeadline, fmtRow as fmtValue, type CatKey } from "./car-perf-model";
import { trendSvg, barsSvg, catColor, barColors } from "./car-perf-chart";
import type { Trend } from "./car-perf";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const f1 = (x: unknown) => (x == null ? "–" : r1(Number(x)).toFixed(1));
const chip = (x: unknown) => (x == null ? "" : `<span class="bd"><i style="background:${BAND_COLOR[band(Number(x))]}"></i>${band(Number(x))}</span>`);

const STYLE = `
thead { display: table-header-group; } h2 { break-after: avoid; } tr { break-inside: avoid; }
table.band { margin: 0 0 14px; } table.band td { border: none; background: #0d1f4a; color: #fff; padding: 14px 16px; vertical-align: middle; }
.band-l .org { font-size: 14pt; font-weight: 700; color: #fff; } .band-r { text-align: right; width: 50%; }
.kicker { font-size: 8pt; letter-spacing: .08em; text-transform: uppercase; color: #9fe7dc; } .doc { font-size: 17pt; font-weight: 700; color: #fff; }
table.facts td { border: none; border-bottom: 2px solid #e3e8f0; padding: 6px 10px 8px 0; vertical-align: top; }
.lbl { font-size: 7.5pt; text-transform: uppercase; letter-spacing: .06em; color: #5f6878; font-weight: 600; }
.big { font-size: 24pt; font-weight: 700; color: #0d1f4a; } .small { font-size: 8.5pt; color: #5f6878; }
.bd { display: inline-block; font-size: 8.5pt; font-weight: 700; } .bd i { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin: 0 4px 0 6px; }
.sw { display: inline-block; width: 12px; height: 4px; border-radius: 2px; vertical-align: middle; margin-right: 6px; }
td.n, th.n { text-align: right; white-space: nowrap; } tr.cat td { background: #eef2f8; font-weight: 700; } tr.tot td { font-weight: 700; border-top: 2px solid #c3c2b7; }
.chart { border: 1px solid #e3e8f0; border-radius: 6px; padding: 8px; margin: 6px 0 12px; break-inside: avoid; }
.legend span { display: inline-block; margin-right: 12px; font-size: 8.5pt; color: #333; }
.summary { border-left: 5px solid #14b8a6; background: #f2f6fc; padding: 10px 14px; margin: 6px 0 12px; }
.foot { margin-top: 18px; font-size: 7.5pt; color: #8a93a3; }`;

export function carPerfHtml(o: { org: string; by: string; t: Trend; portal?: boolean }) {
  const { years, series, byYear } = o.t;
  const scored = years.filter((y) => byYear[y]?.overall_score != null);
  const latest = scored.length ? byYear[scored[scored.length - 1]] : null, first = scored.length ? byYear[scored[0]] : null;
  const summary = [...scored].reverse().map((y) => byYear[y]).find((s) => s.summary_status === "approved" && s.summary);
  const dl = nextDeadline(todayWAT());
  const title = `CAR Performance Trend ${years.length ? `${years[0]}–${years[years.length - 1]}` : ""}`.trim();
  const cell = (code: string, y: number) => {
    const row = byYear[y]?.values[code];
    if (!row) return `<td class="n small">–</td>`;
    const sc = row.score == null ? null : Number(row.score);
    return `<td class="n">${esc(fmtValue(code, row))}${sc != null ? `<i style="display:inline-block;width:7px;height:7px;border-radius:50%;margin-left:5px;background:${BAND_COLOR[band(sc)]}"></i>` : ""}<br><span class="small">${row.source === "manual" ? "manual" : row.source === "import" ? "imported" : "auto"}</span></td>`;
  };
  const body = `
<table class="band"><tr><td class="band-l"><span class="org">${esc(o.org)}</span></td>
  <td class="band-r"><span class="kicker">Compliance Audit Returns · NDPA 2023 · GAID 2025</span><br><span class="doc">CAR Performance Trend</span></td></tr></table>
<table class="facts"><tr>
  <td><span class="lbl">Overall CAR score${latest ? ` · ${latest.car_year}` : ""}</span><br><span class="big">${latest ? f1(latest.overall_score) : "–"}</span>${latest ? chip(latest.overall_score) : ""}</td>
  <td><span class="lbl">Change since baseline</span><br><b>${latest && first && latest !== first ? `${Number(latest.overall_score) - Number(first.overall_score) >= 0 ? "+" : ""}${f1(Number(latest.overall_score) - Number(first.overall_score))} pts since ${first.car_year}` : "Needs a second CAR year"}</b></td>
  <td><span class="lbl">Years</span><br><b>${years.length ? `${years[0]}–${years[years.length - 1]}` : "None"}</b></td>
  <td><span class="lbl">Next filing deadline</span><br><b>31 March ${dl.date.slice(0, 4)}</b> <span class="small">(${dl.days} days)</span></td>
</tr></table>
${summary ? `<h2>Summary</h2><div class="summary">${esc(summary.summary).replace(/\n/g, "<br>")}</div>` : ""}
<h2>1. Category trend</h2>
${scored.length >= 2 ? `<div class="legend">${CATS.map((c) => `<span><span class="sw" style="background:${catColor(c.key, "light")}"></span>${c.name}</span>`).join("")}<span><span class="sw" style="background:#0d1f4a;height:5px"></span>Overall</span><span><span class="sw" style="background:none;border-top:2px dashed #6f6d68;height:0"></span>Target</span></div>
<div class="chart">${trendSvg({ years, cats: series.cats as Record<CatKey, (number | null)[]>, overall: series.overall, target: series.target }, "light")}</div>` : `<p class="small">Trend appears after the second CAR year.</p>`}
<table><thead><tr><th>Category</th>${years.map((y) => `<th class="n">${y}</th>`).join("")}</tr></thead>
${CATS.map((c) => `<tr><td><span class="sw" style="background:${catColor(c.key, "light")}"></span>${c.name}</td>${years.map((_, i) => `<td class="n">${f1(series.cats[c.key][i])}</td>`).join("")}</tr>`).join("")}
<tr class="tot"><td>Overall CAR score</td>${years.map((_, i) => `<td class="n">${f1(series.overall[i])}${series.overall[i] != null ? chip(series.overall[i]) : ""}</td>`).join("")}</tr></table>
<h2>2. Risk reduction</h2>
<div class="legend"><span><span class="sw" style="background:${barColors("light").findings};height:8px;width:8px"></span>Open audit findings</span><span><span class="sw" style="background:${barColors("light").breaches};height:8px;width:8px"></span>Breaches recorded</span></div>
<div class="chart" style="max-width:520px">${barsSvg(years, series.findings, series.breaches, "light")}</div>
<h2>3. KPIs</h2>
<table><thead><tr><th>KPI</th>${years.map((y) => `<th class="n">${y}</th>`).join("")}</tr></thead>
${CATS.map((c) => `<tr class="cat"><td>${c.name}</td>${years.map((_, i) => `<td class="n">${f1(series.cats[c.key][i])}</td>`).join("")}</tr>` +
  KPIS.filter((k) => k.cat === c.key).map((k) => `<tr><td><b>${k.code}</b> ${esc(k.name)}<br><span class="small">${esc(k.how)}</span></td>${years.map((y) => cell(k.code, y)).join("")}</tr>`).join("")).join("")}</table>
<p class="small">Scoring: percentage KPIs use their value; count KPIs score max(0, 100 − count ÷ tolerance × 100); CAR filed on time 100, late 50, not filed 0. A KPI with no data is N/A and left out of its category. Overall = weighted sum of the categories${latest?.weights_used ? ` (${CATS.map((c) => `${c.short} ${(latest.weights_used as Record<string, number>)[c.key]}%`).join(", ")})` : ""}. Bands: Green 85 and above, Amber 65–84, Red below 65.${o.portal ? "" : ` Draft years are marked in the app; ${years.filter((y) => byYear[y]?.status === "draft").join(", ") || "none"} ${years.filter((y) => byYear[y]?.status === "draft").length === 1 ? "is" : "are"} still draft.`}</p>
<p class="foot">Generated ${fmtDate(todayWAT())} by ${esc(o.by)} with DPO Copilot. An organisational performance measure to support the Compliance Audit Return, not an NDPC rating.</p>`;
  return { title: `${o.org} - ${title}`, body, css: BASE(`${o.org} · ${title}`) + STYLE };
}

export function carPerfCsv(t: Trend, portal?: boolean) {
  const q = (x: unknown) => { const s = String(x ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const rows: unknown[][] = [["car_year", "status", "row", "code", "name", "category", "numerator", "denominator", "value", "score", "band", "source", ...(portal ? [] : ["override_reason"])]];
  for (const s of t.snaps) {
    for (const k of KPIS) {
      const v = s.values[k.code];
      rows.push([s.car_year, s.status, "kpi", k.code, k.name, CATS.find((c) => c.key === k.cat)!.name, v?.numerator ?? "", v?.denominator ?? "", v ? fmtValue(k.code, v) : "", v?.score ?? "", v?.score == null ? "" : band(Number(v.score)), v?.source ?? "", ...(portal ? [] : [v?.override_reason ?? ""])]);
    }
    for (const c of CATS) { const x = s[`score_${c.key}` as "score_gov"]; rows.push([s.car_year, s.status, "category", c.key, c.name, c.name, "", "", "", x ?? "", x == null ? "" : band(Number(x)), "", ...(portal ? [] : [""])]); }
    rows.push([s.car_year, s.status, "overall", "overall", "Overall CAR score", "", "", "", "", s.overall_score ?? "", s.rating_band ?? "", "", ...(portal ? [] : [""])]);
  }
  return rows.map((r) => r.map(q).join(",")).join("\r\n");
}
