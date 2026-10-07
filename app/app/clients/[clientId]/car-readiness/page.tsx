import Link from "next/link";
import { redirect } from "next/navigation";
import { requireClient, audit } from "@/lib/auth";
import { q, one, tx } from "@/lib/db";
import { startCarYear } from "@/lib/clients";
import { readiness, CAR_CATEGORIES, carItemRisk, carRisk } from "@/lib/rules";
import { str, opt, flash } from "@/lib/form";
import { Flash, Hidden, Chip, Bar, Banner, Empty } from "@/components/ui";
import { Submit } from "@/components/client";
import { INSTALL } from "@/lib/install";

const STATUSES = [["complete", "Complete"], ["in_progress", "In progress"], ["missing", "Missing"], ["not_applicable", "Not applicable"]];
const RECOMMEND_HINT: Record<string, string> = {
  missing: "What the client needs to put in place, who should own it, and by when.",
  in_progress: "What is still needed to complete this item.",
  complete: "Optional: anything to maintain or improve before next year.",
  not_applicable: "Optional.",
};

const validYear = (v: unknown) => { const y = Number(v); return Number.isInteger(y) && y >= 2019 && y <= 2100 ? y : null; };
const yearPath = (clientId: string, year: number) => `/app/clients/${clientId}/car-readiness?year=${year}`;

/** Create the checklist for an audit year that has none yet, from the current published template. */
async function startYear(fd: FormData) {
  "use server";
  const { user, client } = await requireClient(str(fd, "client_id"), { write: true });
  const year = validYear(str(fd, "year"));
  if (!year) redirect(flash(`/app/clients/${client.id}/car-readiness`, "Enter the audit year as four digits, for example 2026.", "error"));
  await tx((t) => startCarYear(t, client.firm_id, client.id, year));
  await audit(user, "create", "car_checklist", client.id, { client_id: client.id, details: { audit_year: year } });
  redirect(flash(yearPath(client.id, year), `${year} checklist started`));
}

/** The active year is the checklist the dashboard, client portal, gaps and evidence requests use. */
async function setActiveYear(fd: FormData) {
  "use server";
  const { user, client } = await requireClient(str(fd, "client_id"), { write: true });
  const year = validYear(str(fd, "year"));
  if (!year || !(await one("select 1 from client_car_items where client_id = $1 and audit_year = $2 limit 1", [client.id, year])))
    redirect(flash(`/app/clients/${client.id}/car-readiness`, "Start that year's checklist before making it active.", "error"));
  await q("update clients set car_audit_year = $2 where id = $1", [client.id, year]);
  await audit(user, "update", "client", client.id, { client_id: client.id, details: { car_audit_year: year } });
  redirect(flash(yearPath(client.id, year), `${year} is now the active audit year`));
}

async function setStatus(fd: FormData) {
  "use server";
  const item = await one("select * from client_car_items where id = $1", [str(fd, "item_id")]);
  if (!item) redirect("/forbidden");
  const { user } = await requireClient(item.client_id, { write: true });
  const back = yearPath(item.client_id, item.audit_year);
  const status = str(fd, "status"), reason = opt(fd, "na_reason");
  if (!STATUSES.some(([s]) => s === status)) redirect(back);
  if (status === "not_applicable" && !reason) redirect(flash(`${back}#i-${item.id}`, "Give a reason when marking an item Not applicable.", "error"));
  await q("update client_car_items set status = $2, na_reason = $3, recommendation = $5, is_new = false, updated_by = $4 where id = $1",
    [item.id, status, status === "not_applicable" ? reason : null, user.id, opt(fd, "recommendation")]);
  await audit(user, "update", "car_item", item.id, { client_id: item.client_id, details: { status, recommendation: !!opt(fd, "recommendation") } });
  redirect(flash(back, "Checklist updated"));
}

async function linkDecision(fd: FormData) {
  "use server";
  const item = await one("select * from client_car_items where id = $1", [str(fd, "item_id")]);
  if (!item) redirect("/forbidden");
  const { user } = await requireClient(item.client_id, { write: true });
  const confirm = str(fd, "op") === "confirm";
  await q(`update client_car_items set link_state = $2, status = case when $3 then 'complete' else status end, is_new = false, updated_by = $4 where id = $1`, [item.id, confirm ? "confirmed" : "dismissed", confirm, user.id]);
  await audit(user, "update", "car_item", item.id, { client_id: item.client_id, details: { suggested_evidence: confirm ? "confirmed" : "dismissed" } });
  redirect(flash(yearPath(item.client_id, item.audit_year), confirm ? "Suggested evidence confirmed" : "Suggestion dismissed"));
}

/** FR8.6: where platform records already satisfy an item, suggest them for the reviewer to confirm. */
async function suggestions(clientId: string) {
  const s = await one(`select
    (select string_agg(d.title, ', ') from documents d where d.client_id = $1 and exists (select 1 from content_versions v where v.parent_type = 'document' and v.parent_id = d.id and v.status in ('approved','awaiting_client_signoff','client_signed_off'))) as policies,
    (select count(*)::int from dpias d where d.client_id = $1 and exists (select 1 from content_versions v where v.parent_type = 'dpia' and v.parent_id = d.id and v.status in ('approved','awaiting_client_signoff','client_signed_off'))) as dpias,
    (select count(*)::int from ropa_entries where client_id = $1 and state = 'active') as ropa,
    (select count(*)::int from ropa_entries where client_id = $1 and state = 'active' and lawful_basis is null) as no_basis,
    (select count(*)::int from ropa_entries where client_id = $1 and state = 'active' and has_transfer) as transfers,
    (select count(*)::int from ropa_entries where client_id = $1 and state = 'active' and has_transfer and transfer_safeguard is null) as unsafe,
    (select count(*)::int from ropa_entries where client_id = $1 and state = 'active' and recipients is not null) as recipients`, [clientId]);
  const x = s!;
  return {
    approved_policies: x.policies ? `Approved: ${x.policies}` : null,
    dpias: x.dpias ? `${x.dpias} approved DPIA${x.dpias > 1 ? "s" : ""}` : null,
    ropa_current: x.ropa ? `${x.ropa} active RoPA entries` : null,
    ropa_lawful_basis: x.ropa && !x.no_basis ? `Lawful basis recorded on all ${x.ropa} RoPA entries` : null,
    ropa_transfers: x.transfers && !x.unsafe ? `${x.transfers} RoPA entries record transfers with safeguards` : null,
    ropa_recipients: x.recipients ? `${x.recipients} RoPA entries list recipients` : null,
  } as Record<string, string | null>;
}

export default async function Car({ params, searchParams }: { params: Promise<{ clientId: string }>; searchParams: Promise<Record<string, string>> }) {
  const { clientId } = await params;
  const sp = await searchParams;
  const { client } = await requireClient(clientId);
  const active: number = client.car_audit_year;
  const year = validYear(sp.year) ?? active;
  const years = (await q<{ y: number }>("select distinct audit_year as y from client_car_items where client_id = $1 order by 1 desc", [clientId])).map((r) => r.y);
  const items = await q(`select i.*, (select count(*)::int from evidence_requests e where e.car_item_id = i.id and e.status = 'accepted') as accepted,
      (select count(*)::int from evidence_requests e where e.car_item_id = i.id and e.status <> 'accepted') as pending
    from client_car_items i where i.client_id = $1 and i.audit_year = $2 order by i.category_key, i.position`, [clientId, year]);
  const r = readiness(items as { category_key: string; status: string }[]);
  const risk = carRisk(items as { category_key: string; status: string }[]);
  const sug = await suggestions(clientId);
  const ro = !!client.archived_at;
  const b = `/app/clients/${clientId}`;
  const h = <Hidden values={{ client_id: clientId, year: String(year) }} />;
  return (
    <>
      <div className="spread">
        <h2 style={{ marginTop: 0 }}>CAR readiness · {year}</h2>
        {items.length > 0 && (
          <div className="row">
            <a className="btn secondary" href={`/export?kind=car&client=${clientId}&year=${year}&format=pdf`} target="_blank">Export PDF</a>
            <a className="btn secondary" href={`/export?kind=car&client=${clientId}&year=${year}&format=doc`}>Export Word</a>
          </div>
        )}
      </div>
      <Flash sp={sp} />
      <form method="get" className="row" style={{ alignItems: "flex-end", margin: "8px 0 16px" }} aria-label="Audit year">
        <label className="small">Audit year <input type="number" name="year" min={2019} max={2100} defaultValue={year} required style={{ width: 120, display: "block" }} /></label>
        <button className="btn secondary">Open</button>
        {years.length > 0 && <nav className="row" aria-label="Recorded years" style={{ gap: 6 }}>
          {years.map((y) => <Link key={y} href={yearPath(clientId, y)} className={`btn ${y === year ? "" : "quiet"}`} aria-current={y === year ? "page" : undefined}>{y}{y === active ? " (active)" : ""}</Link>)}
        </nav>}
      </form>
      {items.length === 0 ? (
        <Empty>
          <p><b>No CAR readiness has been recorded for {year}.</b></p>
          <p>{years.length ? `Recorded years: ${years.join(", ")}.` : "No years recorded yet."}</p>
          {!ro && <form action={startYear}>{h}<Submit>Start the {year} checklist</Submit></form>}
        </Empty>
      ) : <>
      {year !== active
        ? <Banner>You&apos;re viewing {year}. The active year is {active}: the dashboard, client portal, gaps and evidence requests use that one.
            {!ro && <form action={setActiveYear} style={{ marginTop: 8 }}>{h}<Submit className="btn secondary">Make {year} the active year</Submit></form>}</Banner>
        : <p className="meta">Active audit year: covers processing from 1 January to 31 December {year}.</p>}
      <section className="panel" style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 22, margin: "0 0 8px" }}><b className="num">{r.overall.pct}%</b> ready · <span className="num">{r.overall.complete} of {r.overall.applicable}</span> applicable items complete</p>
        <Bar pct={r.overall.pct} />
        {risk && <p style={{ margin: "12px 0 0" }}>Risk score <b className="num">{risk.score}</b> / 100 <Chip status={`risk_${risk.rating}`} /> <span className="meta">From item statuses: Missing is high risk, In progress medium, Complete low.</span></p>}
        <p className="caption" style={{ marginTop: 8 }}>Items marked Not applicable are left out of both scores. {INSTALL.name} does not file the CAR with the NDPC.</p>
      </section>
      {Object.entries(CAR_CATEGORIES).map(([k, label]) => (
        <details key={k} className="group" open>
          <summary><span>{label}</span><span className="row" style={{ gap: 8 }}>{(() => { const cr = carRisk(items.filter((i) => i.category_key === k) as { category_key: string; status: string }[]); return cr && <Chip status={`risk_${cr.rating}`} />; })()}<span className="num meta">{r.byCategory[k].pct}% · {r.byCategory[k].complete}/{r.byCategory[k].applicable}</span></span></summary>
          <div>
            {items.filter((i) => i.category_key === k).map((i) => {
              const s = i.auto_link_rule && !i.link_state ? sug[i.auto_link_rule] : null;
              return (
                <div key={i.id} id={`i-${i.id}`} style={{ borderTop: "1px solid var(--line)", padding: "12px 0" }}>
                  <div className="spread">
                    <div>
                      <b>{i.item_text}</b> {i.is_new && <span className="chip review">New item</span>}
                      <div className="meta">
                        {i.accepted > 0 && `${i.accepted} accepted evidence · `}{i.pending > 0 && `${i.pending} evidence request${i.pending > 1 ? "s" : ""} open · `}
                        {i.link_state === "confirmed" && "Platform records confirmed · "}
                        {i.status === "not_applicable" && `Not applicable: ${i.na_reason}`}
                      </div>
                    </div>
                    <span className="row" style={{ gap: 6 }}>{carItemRisk(i.status) && <Chip status={`risk_${carItemRisk(i.status)}`} />}<Chip status={i.status} /></span>
                  </div>
                  {i.recommendation && ro && <p className="small" style={{ margin: "6px 0 0" }}><b>Recommendation:</b> {i.recommendation}</p>}
                  {s && !ro && (
                    <form action={linkDecision} className="rule-row info" style={{ marginTop: 8 }}>
                      <Hidden values={{ item_id: i.id }} />
                      <span><b>Suggested evidence:</b> {s}</span>
                      <span className="row"><Submit name="op" value="confirm" className="btn secondary">Confirm</Submit><Submit name="op" value="dismiss" className="btn quiet">Dismiss</Submit></span>
                    </form>
                  )}
                  {!ro && (
                    <form action={setStatus} className="row" style={{ marginTop: 8, alignItems: "flex-end" }}>
                      <Hidden values={{ item_id: i.id }} />
                      <label className="small">Status <select name="status" defaultValue={i.status} style={{ width: "auto", display: "block" }}>{STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
                      <label className="small" style={{ flex: 1, minWidth: 200 }}>Reason if not applicable <input name="na_reason" defaultValue={i.na_reason ?? ""} /></label>
                      <label className="small" style={{ flexBasis: "100%" }}>Recommendation <span className="meta">(shown to the client and in exports)</span>
                        <textarea name="recommendation" rows={2} defaultValue={i.recommendation ?? ""} placeholder={RECOMMEND_HINT[i.status]} style={{ display: "block" }} />
                      </label>
                      <Submit className="btn secondary">Save</Submit>
                      <Link className="btn quiet" href={`${b}/evidence?item=${i.id}`}>Request evidence</Link>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        </details>
      ))}
      </>}
    </>
  );
}
