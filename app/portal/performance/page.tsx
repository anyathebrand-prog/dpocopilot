import Link from "next/link";
import { requireContact } from "@/lib/auth";
import { todayWAT } from "@/lib/rules";
import { loadTrend } from "@/lib/car-perf";
import { Empty } from "@/components/ui";
import { PerfView } from "@/components/car-perf-view";

/** Client portal: CAR performance across the filing years the DPCO has locked. Read-only; drafts and override reasons stay hidden. */
export default async function PortalPerformance() {
  const u = await requireContact();
  const t = await loadTrend(u.client_id!, { lockedOnly: true });
  const scored = t.years.filter((y) => t.byYear[y]?.overall_score != null);
  const summary = [...scored].reverse().map((y) => t.byYear[y]).find((s) => s.summary_status === "approved" && s.summary);
  return (
    <>
      <p><Link href="/portal">Back to home</Link></p>
      <div className="spread">
        <h1 style={{ fontSize: 24, margin: 0 }}>CAR performance</h1>
        {t.snaps.length > 0 && <a className="btn secondary" href={`/export?kind=car-performance&client=${u.client_id}&format=pdf`} target="_blank" rel="noreferrer">Download the PDF summary</a>}
      </div>
      <p className="meta">Your Compliance Audit Returns performance across filing years, scored by your DPCO on twelve KPIs in the five CAR categories. Only years your DPCO has finalised are shown.</p>
      {t.snaps.length === 0 ? <Empty><p>No CAR years have been finalised yet.</p><p className="meta">Your DPCO locks each year when the CAR is filed; it then appears here.</p></Empty> : (
        <>
          {summary && <section className="panel"><h3 style={{ marginTop: 0 }}>Summary · CAR {summary.car_year}</h3><p style={{ margin: 0, whiteSpace: "pre-line" }}>{summary.summary}</p></section>}
          <PerfView t={t} today={todayWAT()} base="/portal/performance" portal />
        </>
      )}
    </>
  );
}
