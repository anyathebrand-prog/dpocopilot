import Link from "next/link";
import { requireClient, canApprove, isAdmin } from "@/lib/auth";
import { todayWAT, fmtDate } from "@/lib/rules";
import { CATS, KPIS, FILING, kpiValue, r1, fmtRow as fmtValue } from "@/lib/car-perf-model";
import { loadTrend, getSettings, toValue } from "@/lib/car-perf";
import { startYear, setFiling, overrideKpi, revertKpi, lockSnapshot, unlockSnapshot, saveSettings, saveTargets, importHistory, askCopilot, saveSummary } from "@/lib/car-perf-actions";
import { Flash, Field, Hidden, Banner, Empty } from "@/components/ui";
import { Submit, Confirm } from "@/components/client";
import { PerfView } from "@/components/car-perf-view";

/** CAR Performance Trend: up to five CAR years scored on the five categories, with the year's working panel below. */
export default async function CarPerformance({ params, searchParams }: { params: Promise<{ clientId: string }>; searchParams: Promise<Record<string, string>> }) {
  const { clientId } = await params;
  const sp = await searchParams;
  const { user, client } = await requireClient(clientId);
  const ro = !!client.archived_at;
  const t = await loadTrend(clientId, { refresh: !ro, endYear: Number(sp.end) || undefined });
  const settings = await getSettings(clientId);
  const b = `/app/clients/${clientId}/car-performance`;
  const exp = (f: string) => `/export?kind=car-performance&client=${clientId}&format=${f}${sp.end ? `&end=${sp.end}` : ""}`;
  const year = Number(sp.year) && t.byYear[Number(sp.year)] ? Number(sp.year) : t.all.length ? Math.max(...t.all) : null;
  const s = year ? t.byYear[year] : null;
  const h = s ? <Hidden values={{ snapshot_id: s.id }} /> : null;
  const editable = !!s && s.status === "draft" && !ro;
  return (
    <>
      <div className="spread">
        <h2 style={{ marginTop: 0 }}>CAR Performance</h2>
        {t.snaps.length > 0 && <div className="row">
          <a className="btn" href={exp("pdf")} target="_blank" rel="noreferrer">Export PDF</a>
          <a className="btn secondary" href={exp("csv")}>CSV</a>
        </div>}
      </div>
      <p className="meta">Compliance Audit Returns performance across up to five filing years, scored on twelve KPIs in the five CAR categories. Draft years recalculate from the modules each time this page opens; a locked year keeps its values and scores.</p>
      <Flash sp={sp} />

      {t.snaps.length === 0 ? (
        <Empty><p><b>No CAR years recorded yet.</b></p><p className="meta">Start the current CAR year to calculate the KPIs from the modules, or import past years below.</p></Empty>
      ) : <PerfView t={t} today={todayWAT()} base={b} />}

      {t.snaps.length > 0 && year && s && (
        <section className="panel" id="year" style={{ marginTop: 8 }}>
          <div className="spread">
            <h3 style={{ margin: 0 }}>CAR {year} <span className="meta" style={{ fontWeight: 400 }}>· {s.status === "locked" ? `Locked${s.locker ? ` by ${s.locker}` : ""}${s.locked_at ? ` on ${fmtDate(new Date(s.locked_at).toISOString().slice(0, 10))}` : ""}` : "Draft"}</span></h3>
            <nav className="row" aria-label="CAR years" style={{ gap: 6 }}>{t.all.map((y) => <Link key={y} href={`${b}?year=${y}${sp.end ? `&end=${sp.end}` : ""}#year`} className={`btn ${y === year ? "" : "quiet"}`} aria-current={y === year ? "page" : undefined}>{y}</Link>)}</nav>
          </div>

          <div className="perf-actions">
            <form action={setFiling} className="row" style={{ alignItems: "flex-end" }}>{h}
              <label className="small">CAR filed with the NDPC on <input type="date" name="filing_date" defaultValue={s.filing_date ?? ""} disabled={!editable} style={{ display: "block" }} /></label>
              {editable && <Submit className="btn secondary">Save filing date</Submit>}
              <span className="meta">Due 31 March {year + 1}. GOV-3: {FILING.includes(s.values["GOV-3"]?.raw_value as never) ? s.values["GOV-3"]!.raw_value : "Not filed"}.</span>
            </form>
            {!ro && s.status === "draft" && (canApprove(user)
              ? <Confirm action={lockSnapshot} label="Lock this year" danger={false} title={`Lock CAR ${year}?`} body="Values and scores are frozen with the weights in use, and the year shows in the client portal. Only a Firm Admin can unlock it.">{h}</Confirm>
              : <span className="meta">A Lead Consultant or Firm Admin locks the year when the CAR is filed.</span>)}
            {!ro && s.status === "locked" && isAdmin(user) && (
              <form action={unlockSnapshot} className="row" style={{ alignItems: "flex-end" }}>{h}
                <label className="small">Reason for unlocking <input name="reason" required placeholder="e.g. Correcting the DSAR count after an NDPC query" style={{ display: "block", minWidth: 280 }} /></label>
                <Submit className="btn secondary">Unlock</Submit>
              </form>
            )}
          </div>

          <h4>KPI values</h4>
          <div className="perf-scroll">
            <table className="perf-kpis">
              <thead><tr><th>KPI</th><th className="num">Value</th><th className="num">Score</th><th>Source</th>{editable && <th>Override</th>}</tr></thead>
              <tbody>{KPIS.map((k) => {
                const row = s.values[k.code];
                const v = row ? kpiValue(k.code, toValue(row)) : null;
                return (
                  <tr key={k.code}>
                    <td><span className="code">{k.code}</span> {k.name}<span className="meta" style={{ display: "block" }}>{k.how}</span></td>
                    <td className="num">{fmtValue(k.code, row)}{row?.denominator != null && Number(row.denominator) > 0 && <span className="meta perf-nd">{Number(row.numerator)}/{Number(row.denominator)}</span>}</td>
                    <td className="num">{row?.score == null ? "N/A" : r1(Number(row.score))}</td>
                    <td className="small">{row?.source === "manual" ? <>Manual<span className="meta" style={{ display: "block" }}>{row.override_reason}</span></> : row?.source === "import" ? "Imported" : `Auto · ${k.source}`}</td>
                    {editable && <td>
                      <details className="perf-ovr"><summary>Override</summary>
                        <form action={overrideKpi}>{h}<input type="hidden" name="kpi_code" value={k.code} />
                          {k.kind === "status"
                            ? <label className="small">Status <select name="raw" defaultValue={typeof v === "string" ? v : ""}>{FILING.map((f) => <option key={f}>{f}</option>)}</select></label>
                            : k.kind === "count"
                              ? <label className="small">Count <input name="raw" inputMode="numeric" defaultValue={v ?? ""} style={{ width: 90 }} /></label>
                              : <span className="row" style={{ gap: 6 }}><label className="small">Numerator <input name="numerator" inputMode="numeric" defaultValue={row?.numerator ?? ""} style={{ width: 80 }} /></label><label className="small">Denominator <input name="denominator" inputMode="numeric" defaultValue={row?.denominator ?? ""} style={{ width: 80 }} /></label><label className="small">or % <input name="raw" inputMode="decimal" style={{ width: 70 }} /></label></span>}
                          <label className="small" style={{ display: "block", marginTop: 6 }}>Reason (required) <input name="reason" required placeholder="e.g. Training records held outside the platform" /></label>
                          <div className="row" style={{ marginTop: 6 }}><Submit className="btn secondary">Save override</Submit></div>
                        </form>
                        {row && row.source !== "auto" && <form action={revertKpi} style={{ marginTop: 6 }}>{h}<input type="hidden" name="kpi_code" value={k.code} /><Submit className="btn quiet">Calculate from the modules</Submit></form>}
                      </details>
                    </td>}
                  </tr>
                );
              })}</tbody>
            </table>
          </div>

          <div className="perf-two" style={{ marginTop: 16 }}>
            <div>
              <h4 style={{ marginTop: 0 }}>Copilot summary</h4>
              <p className="meta" style={{ marginTop: 0 }}>Drafted from the scores only, never personal data. It shows in the portal and the PDF once approved.</p>
              {!ro && <form action={askCopilot} style={{ marginBottom: 8 }}>{h}<Submit className="btn secondary">{s.summary ? "Ask Copilot again" : "Ask Copilot"}</Submit></form>}
              <form action={saveSummary}>{h}
                <textarea name="summary" rows={5} defaultValue={s.summary ?? ""} disabled={ro} placeholder="3–5 sentences: overall movement, the strongest and weakest category, and the top two actions before the next filing" />
                <div className="row" style={{ marginTop: 8 }}>
                  <span className="meta">{s.summary_status === "approved" ? "Approved" : s.summary_status === "draft" ? "Draft: not shown to the client" : ""}</span>
                  {!ro && <Submit className="btn secondary" name="op" value="save">Save draft</Submit>}
                  {!ro && canApprove(user) && <Submit name="op" value="approve">Approve</Submit>}
                </div>
              </form>
            </div>
            <div>
              <h4 style={{ marginTop: 0 }}>Targets for {year}</h4>
              <p className="meta" style={{ marginTop: 0 }}>Drawn as dashed lines on the trend chart. Leave blank for none.</p>
              <form action={saveTargets}><Hidden values={{ client_id: clientId, year: String(year) }} />
                <div className="perf-targets">
                  {[["overall", "Overall"], ...CATS.map((c) => [c.key, c.name])].map(([k, l]) => {
                    const cur = t.targets.find((x) => x.car_year === year && x.ref_code === k);
                    return <label key={k} className="small">{l}<input name={`tg_${k}`} inputMode="decimal" defaultValue={cur ? Number(cur.target_value) : ""} disabled={ro || !canApprove(user)} /></label>;
                  })}
                </div>
                {!ro && canApprove(user) && <div style={{ marginTop: 8 }}><Submit className="btn secondary">Save targets</Submit></div>}
              </form>
            </div>
          </div>
        </section>
      )}

      {!ro && (
        <div className="perf-two" style={{ marginTop: 24 }}>
          <section className="panel">
            <h3 style={{ marginTop: 0 }}>Add a CAR year</h3>
            <form action={startYear} className="row" style={{ alignItems: "flex-end" }}><Hidden values={{ client_id: clientId }} />
              <Field label="CAR year"><input type="number" name="year" min={2019} max={2100} required defaultValue={client.car_audit_year ?? new Date().getFullYear() - 1} style={{ width: 120 }} /></Field>
              <span style={{ marginBottom: 20 }}><Submit className="btn secondary">Start year</Submit></span>
            </form>
            <h3>Import past years</h3>
            <p className="meta" style={{ marginTop: 0 }}>CSV or Excel with a header row: <b>car_year</b>, <b>kpi_code</b> (GOV-1 … DPR-2), then <b>numerator</b> and <b>denominator</b>, or <b>raw_value</b> (a percentage, a count, or On time / Late / Not filed for GOV-3). Locked years are skipped and every rejected row is listed.</p>
            <form action={importHistory}><Hidden values={{ client_id: clientId }} />
              <input type="file" name="file" accept=".csv,.xlsx" required />
              <div style={{ marginTop: 8 }}><Submit className="btn secondary">Import history</Submit></div>
            </form>
          </section>
          <section className="panel">
            <h3 style={{ marginTop: 0 }}>Weights and tolerances</h3>
            <p className="meta" style={{ marginTop: 0 }}>Category weights must add up to 100%. Count KPIs score 0 at the tolerance. Changes recalculate draft years only.{!isAdmin(user) && " Only a Firm Admin can change them."}</p>
            <form action={saveSettings}><Hidden values={{ client_id: clientId, year: year ? String(year) : "" }} />
              <div className="perf-targets">
                {CATS.map((c) => <label key={c.key} className="small">{c.name} (%)<input name={`w_${c.key}`} inputMode="decimal" defaultValue={settings.weights[c.key]} disabled={!isAdmin(user)} /></label>)}
                <label className="small">Breaches tolerance (SEC-1)<input name="t_SEC-1" inputMode="numeric" defaultValue={settings.tolerances["SEC-1"]} disabled={!isAdmin(user)} /></label>
                <label className="small">Open findings tolerance (ACC-3)<input name="t_ACC-3" inputMode="numeric" defaultValue={settings.tolerances["ACC-3"]} disabled={!isAdmin(user)} /></label>
              </div>
              {isAdmin(user) && <div style={{ marginTop: 8 }}><Submit className="btn secondary">Save and recalculate drafts</Submit></div>}
            </form>
          </section>
        </div>
      )}
      {ro && <Banner kind="info">This client is archived: CAR Performance is read-only.</Banner>}
    </>
  );
}
