import Link from "next/link";
import { redirect } from "next/navigation";
import { requireClient, audit } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { str, opt, flash } from "@/lib/form";
import { trackerStatus, todayWAT, fmtDate } from "@/lib/rules";
import { buildTracker, loadTracker, trackerSummary } from "@/lib/remediation";
import { Flash, Hidden, Empty, Banner } from "@/components/ui";
import { Submit } from "@/components/client";

const validYear = (v: unknown) => { const y = Number(v); return Number.isInteger(y) && y >= 2019 && y <= 2100 ? y : null; };
const path = (clientId: string, year: number) => `/app/clients/${clientId}/remediation?year=${year}`;
const STATUS = [["not_started", "Not Started"], ["in_progress", "In Progress"], ["completed", "Completed"]];
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

async function build(fd: FormData) {
  "use server";
  const { user, client } = await requireClient(str(fd, "client_id"), { write: true });
  const year = validYear(str(fd, "year"));
  if (!year) redirect(`/app/clients/${client.id}/remediation`);
  const added = await buildTracker(client.id, year, user.id);
  if (added === null) redirect(flash(path(client.id, year), `No CAR readiness has been recorded for ${year}.`, "error"));
  await audit(user, "update", "remediation_tracker", client.id, { client_id: client.id, details: { audit_year: year, added } });
  redirect(flash(path(client.id, year), added ? `${added} action${added > 1 ? "s" : ""} added from the audit` : "Tracker is up to date with the audit"));
}

async function save(fd: FormData) {
  "use server";
  const a = await one("select * from remediation_actions where id = $1", [/^[0-9a-f-]{36}$/.test(str(fd, "id")) ? str(fd, "id") : null]);
  if (!a) redirect("/forbidden");
  const { user } = await requireClient(a.client_id, { write: true });
  const back = `${path(a.client_id, a.audit_year)}#a-${a.id}`;
  const status = STATUS.some(([s]) => s === str(fd, "status")) ? str(fd, "status") : a.status;
  const target = str(fd, "target_date"), closed = str(fd, "date_closed");
  if ((target && !isDate(target)) || (closed && !isDate(closed))) redirect(flash(back, "Enter dates with the date picker.", "error"));
  const dateClosed = closed || (status === "completed" ? todayWAT() : null);
  await q(`update remediation_actions set control_area = $2, owner = $3, target_date = $4, status = $5, evidence = $6, date_closed = $7, updated_by = $8, updated_at = now() where id = $1`,
    [a.id, str(fd, "control_area") || a.control_area, opt(fd, "owner"), target || null, status, opt(fd, "evidence"), dateClosed, user.id]);
  await audit(user, "update", "remediation_action", a.id, { client_id: a.client_id, details: { status } });
  redirect(flash(back, "Action saved"));
}

/** Remediation tracker for one audit year: built from the audit, maintained here, exported in the tracker format. */
export default async function Remediation({ params, searchParams }: { params: Promise<{ clientId: string }>; searchParams: Promise<Record<string, string>> }) {
  const { clientId } = await params;
  const sp = await searchParams;
  const { client } = await requireClient(clientId);
  const year = validYear(sp.year) ?? client.car_audit_year;
  const years = (await q<{ y: number }>("select distinct audit_year as y from client_car_items where client_id = $1 order by 1 desc", [clientId])).map((r) => r.y);
  const rows = await loadTracker(clientId, year);
  const today = todayWAT(), s = trackerSummary(rows, today);
  const ro = !!client.archived_at;
  const h = <Hidden values={{ client_id: clientId, year: String(year) }} />;
  const exp = (kind: string, format: string) => `/export?kind=${kind}&client=${clientId}&year=${year}&format=${format}`;
  const hasChecklist = years.includes(year);
  return (
    <>
      <div className="spread">
        <h2 style={{ marginTop: 0 }}>Remediation tracker · {year}</h2>
        {rows.length > 0 && (
          <div className="row">
            <a className="btn" href={exp("car-tracker", "xlsx")}>Download Excel tracker</a>
            <a className="btn secondary" href={exp("car-plan", "pdf")} target="_blank">PDF</a>
            <a className="btn secondary" href={exp("car-plan", "doc")}>Word</a>
          </div>
        )}
      </div>
      <Flash sp={sp} />
      <div className="row" style={{ gap: 6, margin: "8px 0 16px" }} aria-label="Audit years">
        {years.map((y) => <Link key={y} href={path(clientId, y)} className={`btn ${y === year ? "" : "quiet"}`} aria-current={y === year ? "page" : undefined}>{y}{y === client.car_audit_year ? " (active)" : ""}</Link>)}
      </div>
      {!hasChecklist ? (
        <Empty><p><b>No CAR readiness has been recorded for {year}.</b></p><p>The tracker is built from that year&apos;s audit. <Link href={`/app/clients/${clientId}/car-readiness?year=${year}`}>Open CAR readiness</Link></p></Empty>
      ) : (
        <>
          {!ro && (
            <form action={build} className="row" style={{ marginBottom: 16 }}>{h}
              <Submit className={rows.length ? "btn secondary" : "btn"}>{rows.length ? "Update from audit" : "Build tracker from the audit"}</Submit>
              <span className="meta">{rows.length ? "Adds actions for newly open items and findings. Your edits are kept." : "Creates one action per open checklist item and open finding."}</span>
            </form>
          )}
          {rows.length === 0 ? <Empty><p>No remediation actions yet.</p></Empty> : (
            <>
              <section className="panel" style={{ marginBottom: 24 }}>
                <div className="row" style={{ gap: 24 }}>
                  <div><div className="meta">Total findings</div><b className="num" style={{ fontSize: 26 }}>{s.total}</b></div>
                  <div><div className="meta">High</div><b className="num" style={{ fontSize: 26 }}>{s.high}</b></div>
                  <div><div className="meta">Medium</div><b className="num" style={{ fontSize: 26 }}>{s.medium}</b></div>
                  <div><div className="meta">Low</div><b className="num" style={{ fontSize: 26 }}>{s.low}</b></div>
                  <div><div className="meta">Completion rate</div><b className="num" style={{ fontSize: 26 }}>{s.completion}%</b></div>
                </div>
                <p style={{ margin: "12px 0 0" }}>{Object.entries(s.status).map(([k, n]) => `${k}: ${n}`).join(" · ")}</p>
                <p className="meta" style={{ margin: "6px 0 0" }}>{s.byPart.map(([p, n]) => `${p.replace(/^Part \d+: /, "")} ${n}`).join(" · ")}</p>
              </section>
              {s.status.Overdue > 0 && <Banner kind="warn">{s.status.Overdue} action{s.status.Overdue > 1 ? "s are" : " is"} past the target date.</Banner>}
              {rows.map((r, n) => {
                const st = trackerStatus(r, today);
                return (
                  <div key={r.id} id={`a-${r.id}`} className={`rule-row ${st === "Overdue" ? "urgent" : st === "Completed" ? "" : r.priority === "high" ? "soon" : "info"}`} style={{ display: "block" }}>
                    <div className="spread"><span><b>{n + 1}. {r.control_area}</b> <span className="meta">· {r.audit_part.replace(/^Part \d+: /, "")} · {r.priority === "high" ? "High" : r.priority === "medium" ? "Medium" : "Low"} priority</span></span>
                      <span className="meta"><b>{st}</b>{r.target_date && ` · target ${fmtDate(r.target_date)}`}{r.date_closed && ` · closed ${fmtDate(r.date_closed)}`}</span></div>
                    <p className="small" style={{ margin: "6px 0 0" }}><b>Non-conformity:</b> {r.non_conformity}</p>
                    <p className="small" style={{ margin: "4px 0 0" }}><b>Recommendation:</b> {r.recommendation}</p>
                    {!ro && (
                      <form action={save} className="row" style={{ marginTop: 8, alignItems: "flex-end" }}>
                        <Hidden values={{ id: r.id }} />
                        <label className="small" style={{ flex: "1 1 200px" }}>Control area <input name="control_area" defaultValue={r.control_area} /></label>
                        <label className="small" style={{ flex: "1 1 160px" }}>Suggested owner <input name="owner" defaultValue={r.owner ?? ""} /></label>
                        <label className="small">Target date <input type="date" name="target_date" defaultValue={r.target_date ?? ""} style={{ display: "block" }} /></label>
                        <label className="small">Status <select name="status" defaultValue={r.status} style={{ display: "block", width: "auto" }}>{STATUS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
                        <label className="small" style={{ flex: "2 1 240px" }}>Evidence / comments <input name="evidence" defaultValue={r.evidence ?? ""} /></label>
                        <label className="small">Date closed <input type="date" name="date_closed" defaultValue={r.date_closed ?? ""} style={{ display: "block" }} /></label>
                        <Submit className="btn secondary">Save</Submit>
                      </form>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </>
      )}
    </>
  );
}
