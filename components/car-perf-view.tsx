// CAR Performance Trend: the read view shared by the firm page and the client portal. Header strip, category trend
// line chart, risk-reduction bar chart and the KPI table. The portal passes only locked years and hides draft detail.
import Link from "next/link";
import { RefreshCw, Pencil, Upload } from "lucide-react";
import { CATS, KPIS, nextDeadline, r1, band, BAND_COLOR, fmtRow, type Band, type CatKey } from "@/lib/car-perf-model";
import { trendSvg, barsSvg, catColor, overallColor, barColors } from "@/lib/car-perf-chart";
import type { Trend } from "@/lib/car-perf";
import { PerfChart } from "./car-perf-charts";

const f1 = (x: number | null | undefined) => (x == null ? "–" : r1(Number(x)).toFixed(1));
export function BandChip({ score }: { score: number | null | undefined }) {
  if (score == null) return <span className="chip draft">Not scored</span>;
  const b: Band = band(Number(score));
  return <span className="perf-band"><i style={{ background: BAND_COLOR[b] }} />{b}</span>;
}
const SRC = { auto: [RefreshCw, "Calculated from the modules"], manual: [Pencil, "Manual override"], import: [Upload, "Imported"] } as const;

export const fmtValue = fmtRow;

export function PerfView({ t, today, base, portal }: { t: Trend; today: string; base: string; portal?: boolean }) {
  const { years, series, byYear } = t;
  const scored = years.filter((y) => byYear[y]?.overall_score != null);
  const latest = scored.length ? byYear[scored[scored.length - 1]] : null, first = scored.length ? byYear[scored[0]] : null;
  const dl = nextDeadline(today);
  const tips = years.map((y) => {
    const s = byYear[y];
    if (!s || s.overall_score == null) return `<b>${y}</b><span class="meta">No snapshot</span>`;
    const weak = KPIS.map((k) => ({ k, sc: s.values[k.code]?.score == null ? null : Number(s.values[k.code].score) })).filter((x) => x.sc != null).sort((a, b) => a.sc! - b.sc!).slice(0, 3);
    return `<b>CAR ${y} · ${f1(Number(s.overall_score))} ${s.rating_band ?? ""}${portal ? "" : s.status === "draft" ? " · draft" : ""}</b>` +
      CATS.map((c) => `<div class="row"><span><span class="sw" style="background:${catColor(c.key)}"></span>${c.name}</span><span>${f1(s[`score_${c.key}` as "score_gov"] as unknown as number)}</span></div>`).join("") +
      (weak.length ? `<div class="meta" style="margin-top:6px">Lowest KPIs: ${weak.map((x) => `${x.k.code} ${x.sc!.toFixed(0)}`).join(" · ")}</div>` : "");
  });
  const barTips = years.map((y, i) => `<b>CAR ${y}</b><div class="row"><span><span class="sw" style="background:${barColors().findings}"></span>Open audit findings</span><span>${series.findings[i] ?? "–"}</span></div><div class="row"><span><span class="sw" style="background:${barColors().breaches}"></span>Breaches recorded</span><span>${series.breaches[i] ?? "–"}</span></div>`);
  const legend = [...CATS.map((c) => ({ key: c.key, label: c.name, color: catColor(c.key) })), { key: "overall", label: "Overall", color: overallColor(), bold: true }, { key: "target", label: "Target", color: "#9a988f", dashed: true }];
  return (
    <div className="perf-stack">
      <section className="panel perf-head" aria-label="CAR performance headline">
        <div>
          <span className="meta">Overall CAR score{latest ? ` · ${latest.car_year}` : ""}</span>
          <div className="perf-big">{latest ? f1(Number(latest.overall_score)) : "–"}</div>
          {latest && <BandChip score={Number(latest.overall_score)} />}
        </div>
        <div>
          <span className="meta">Change since baseline</span>
          <div className="perf-mid">{latest && first && latest !== first ? `${Number(latest.overall_score) - Number(first.overall_score) >= 0 ? "+" : ""}${f1(Number(latest.overall_score) - Number(first.overall_score))} pts` : "–"}</div>
          <span className="meta">{latest && first && latest !== first ? `Since ${first.car_year} (${f1(Number(first.overall_score))})` : "Needs a second CAR year"}</span>
        </div>
        <div>
          <span className="meta">Years shown</span>
          <div className="perf-mid">{years.length ? `${years[0]}–${years[years.length - 1]}` : "–"}</div>
          {!portal && t.all.length > 5 && <span className="meta">Up to five years. <Link href={`${base}?end=${years[years.length - 1] - 1}`}>Earlier</Link>{years[years.length - 1] < Math.max(...t.all) && <> · <Link href={`${base}?end=${Math.min(Math.max(...t.all), years[years.length - 1] + 5)}`}>Later</Link></>}</span>}
        </div>
        <div>
          <span className="meta">Next CAR filing deadline</span>
          <div className="perf-mid">{dl.days} days</div>
          <span className="meta">31 March {dl.date.slice(0, 4)}</span>
        </div>
      </section>

      {scored.length < 2 ? (
        <section className="panel">
          <h3 style={{ marginTop: 0 }}>Scorecard{latest ? ` · CAR ${latest.car_year}` : ""}</h3>
          {latest ? <div className="perf-cards">{CATS.map((c) => { const v = latest[`score_${c.key}` as "score_gov"]; return <div key={c.key}><span className="perf-ln" style={{ background: catColor(c.key) }} /><b>{c.name}</b><div className="perf-mid">{f1(v as unknown as number)}</div><BandChip score={v == null ? null : Number(v)} /></div>; })}</div>
            : <p className="meta">No scores yet.</p>}
          <p className="meta" style={{ marginBottom: 0 }}>Trend appears after your second CAR year.</p>
        </section>
      ) : (
        <section className="panel">
          <h3 style={{ marginTop: 0 }}>Category trend</h3>
          <p className="meta" style={{ marginTop: 0 }}>Score out of 100 per CAR category and the weighted overall. Bands: Red below 65, Amber 65–84, Green 85 and above. Missing years show as gaps.</p>
          <PerfChart label="Category trend" svg={trendSvg({ years, cats: series.cats as Record<CatKey, (number | null)[]>, overall: series.overall, target: series.target, catTargets: series.catTargets as Record<CatKey, (number | null)[]> })} tips={tips} legend={legend} />
        </section>
      )}

      <div className="perf-two">
        <section className="panel">
          <h3 style={{ marginTop: 0 }}>Risk reduction</h3>
          <p className="meta" style={{ marginTop: 0 }}>Open audit findings and breaches recorded, per year. Lower is better.</p>
          <div className="perf-legend"><span><span className="perf-sq" style={{ background: barColors().findings }} />Open audit findings</span><span><span className="perf-sq" style={{ background: barColors().breaches }} />Breaches recorded</span></div>
          <PerfChart label="Risk reduction" svg={barsSvg(years, series.findings, series.breaches)} tips={barTips} />
        </section>
        <section className="panel">
          <h3 style={{ marginTop: 0 }}>Category scores</h3>
          <div className="perf-scroll"><table className="perf-cat">
            <thead><tr><th>Category</th>{years.map((y) => <th key={y} className="num">{y}</th>)}</tr></thead>
            <tbody>
              {CATS.map((c) => <tr key={c.key}><td><span className="perf-ln" style={{ background: catColor(c.key) }} />{c.name}</td>{years.map((y, i) => <td key={y} className="num">{f1(series.cats[c.key][i])}</td>)}</tr>)}
              <tr className="tot"><td>Overall</td>{years.map((y, i) => <td key={y} className="num">{f1(series.overall[i])}{series.overall[i] != null && <i className="perf-dot" style={{ background: BAND_COLOR[band(series.overall[i]!)] }} title={band(series.overall[i]!)} />}</td>)}</tr>
            </tbody>
          </table></div>
        </section>
      </div>

      <section className="panel">
        <h3 style={{ marginTop: 0 }}>KPIs</h3>
        <p className="meta" style={{ marginTop: 0 }}>Value, score band and source for each year.{!portal && " Select a KPI to open the records behind it."}</p>
        <div className="perf-scroll">
          <table className="perf-kpis">
            <thead><tr><th>KPI</th>{years.map((y) => <th key={y} className="num">{y}{!portal && byYear[y] ? <span className="meta" style={{ display: "block", fontWeight: 400, textTransform: "none" }}>{byYear[y].status === "locked" ? "Locked" : "Draft"}</span> : null}</th>)}</tr></thead>
            <tbody>
              {CATS.map((c) => [
                <tr key={c.key} className="cat"><td><span className="perf-ln" style={{ background: catColor(c.key) }} />{c.name}</td>{years.map((y, i) => <td key={y} className="num">{f1(series.cats[c.key][i])}</td>)}</tr>,
                ...KPIS.filter((k) => k.cat === c.key).map((k) => (
                  <tr key={k.code}>
                    <td>{portal ? <><span className="code">{k.code}</span> {k.name}</> : <Link href={`${base.replace(/\/car-performance$/, "")}${k.href}`}><span className="code">{k.code}</span> {k.name}</Link>}</td>
                    {years.map((y) => {
                      const row = byYear[y]?.values[k.code];
                      if (!row) return <td key={y} className="num meta">–</td>;
                      const [Icon, what] = SRC[row.source];
                      const sc = row.score == null ? null : Number(row.score);
                      return <td key={y} className="num">{fmtValue(k.code, row)}{sc != null && <i className="perf-dot" style={{ background: BAND_COLOR[band(sc)] }} title={`${band(sc)} · score ${r1(sc)}`} />}
                        <Icon className="perf-src" aria-label={what} />
                        {row.denominator != null && Number(row.denominator) > 0 && <span className="meta perf-nd">{Number(row.numerator)}/{Number(row.denominator)}</span>}</td>;
                    })}
                  </tr>
                )),
              ])}
            </tbody>
          </table>
        </div>
        <p className="meta perf-key"><RefreshCw className="perf-src" aria-hidden /> Calculated from the modules · <Pencil className="perf-src" aria-hidden /> Manual override · <Upload className="perf-src" aria-hidden /> Imported · N/A: no data in the year (left out of the category score)</p>
      </section>
    </div>
  );
}
