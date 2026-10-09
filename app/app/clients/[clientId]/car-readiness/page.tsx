import { Fragment } from "react";
import { clientDepartments, workplanFor } from "@/lib/audit-workplan";
import { list } from "@/lib/questionnaire";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireClient, audit } from "@/lib/auth";
import { q, one, tx } from "@/lib/db";
import { startCarYear } from "@/lib/clients";
import { readiness, CAR_CATEGORIES, carItemRisk, carRisk, maturityLevel, MATURITY, todayWAT } from "@/lib/rules";
import { answersOf } from "@/lib/data";
import { defaultBackground } from "@/lib/car-report";
import { str, opt, flash } from "@/lib/form";
import { Flash, Field, Hidden, Chip, Bar, Banner, Empty } from "@/components/ui";
import { Submit, Confirm } from "@/components/client";
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

/** Replace one year's checklist on the earlier template with Schedule 2. That year's statuses start fresh;
 *  evidence requests are kept but unlinked from the removed items. */
async function switchTemplate(fd: FormData) {
  "use server";
  const { user, client } = await requireClient(str(fd, "client_id"), { write: true });
  const year = validYear(str(fd, "year"));
  if (!year) redirect(`/app/clients/${client.id}/car-readiness`);
  await tx(async (t) => {
    await t.query("update evidence_requests set car_item_id = null where car_item_id in (select id from client_car_items where client_id = $1 and audit_year = $2)", [client.id, year]);
    await t.query("delete from client_car_items where client_id = $1 and audit_year = $2", [client.id, year]);
    await startCarYear(t, client.firm_id, client.id, year);
  });
  await audit(user, "update", "car_checklist", client.id, { client_id: client.id, details: { audit_year: year, template: "schedule_2" } });
  redirect(flash(yearPath(client.id, year), `${year} checklist switched to the Schedule 2 template`));
}

const RISKS = [["high", "High"], ["medium", "Medium"], ["low", "Low"]];

/** Findings outside the Schedule 2 questions, recorded per client and audit year. */
async function saveObservations(fd: FormData) {
  "use server";
  const { user, client } = await requireClient(str(fd, "client_id"), { write: true });
  const year = validYear(str(fd, "year")), dept = str(fd, "dept");
  if (!year) redirect(`/app/clients/${client.id}/car-readiness`);
  const ans = await answersOf(client.id);
  if (!clientDepartments((ans.org_structure_file as { text?: string } | undefined)?.text, list(ans.org_departments)).includes(dept)) redirect("/forbidden");
  const refs = new Set(workplanFor(dept).rows.map((r) => r.ref));
  await tx(async (t) => {
    for (const [k, v] of fd.entries()) {
      const ref = k.startsWith("obs_") ? k.slice(4) : null;
      if (!ref || !refs.has(ref)) continue;
      const text = String(v).trim();
      if (text) await t.query(`insert into workplan_observations (client_id, audit_year, dept, ref, observation, updated_by) values ($1,$2,$3,$4,$5,$6)
        on conflict (client_id, audit_year, dept, ref) do update set observation = excluded.observation, updated_by = excluded.updated_by, updated_at = now()`, [client.id, year, dept, ref, text, user.id]);
      else await t.query("delete from workplan_observations where client_id = $1 and audit_year = $2 and dept = $3 and ref = $4", [client.id, year, dept, ref]);
    }
  });
  await audit(user, "update", "audit_workplan", client.id, { client_id: client.id, details: { audit_year: year, dept } });
  redirect(flash(`${yearPath(client.id, year)}&dept=${encodeURIComponent(dept)}#workplan`, "Observations saved"));
}

async function addFinding(fd: FormData) {
  "use server";
  const { user, client } = await requireClient(str(fd, "client_id"), { write: true });
  const year = validYear(str(fd, "year")), observation = str(fd, "observation"), risk = str(fd, "risk") || "high";
  if (!year) redirect(`/app/clients/${client.id}/car-readiness`);
  const back = `${yearPath(client.id, year)}#findings`;
  if (!observation || !RISKS.some(([r]) => r === risk)) redirect(flash(back, "Describe the finding and choose its risk level.", "error"));
  const f = await one("insert into car_findings (firm_id, client_id, audit_year, observation, risk, recommendation, created_by) values ($1,$2,$3,$4,$5,$6,$7) returning id",
    [client.firm_id, client.id, year, observation, risk, opt(fd, "recommendation"), user.id]);
  await audit(user, "create", "car_finding", f!.id, { client_id: client.id, details: { audit_year: year, risk } });
  redirect(flash(back, "Finding added"));
}

async function saveFinding(fd: FormData) {
  "use server";
  const f = await one("select * from car_findings where id = $1", [/^[0-9a-f-]{36}$/.test(str(fd, "finding_id")) ? str(fd, "finding_id") : null]);
  if (!f) redirect("/forbidden");
  const { user } = await requireClient(f.client_id, { write: true });
  const back = `${yearPath(f.client_id, f.audit_year)}#findings`;
  if (str(fd, "op") === "delete") {
    await q("delete from car_findings where id = $1", [f.id]);
    await audit(user, "delete", "car_finding", f.id, { client_id: f.client_id, details: { audit_year: f.audit_year } });
    redirect(flash(back, "Finding deleted"));
  }
  const observation = str(fd, "observation"), risk = str(fd, "risk"), status = str(fd, "status") === "resolved" ? "resolved" : "open";
  if (!observation || !RISKS.some(([r]) => r === risk)) redirect(flash(back, "Describe the finding and choose its risk level.", "error"));
  await q("update car_findings set observation = $2, risk = $3, recommendation = $4, status = $5, updated_at = now() where id = $1", [f.id, observation, risk, opt(fd, "recommendation"), status]);
  await audit(user, "update", "car_finding", f.id, { client_id: f.client_id, details: { risk, status } });
  redirect(flash(back, "Finding saved"));
}

/** The consultant's narrative and sign-off inputs for one year's audit report. */
async function saveReportDetails(fd: FormData) {
  "use server";
  const { user, client } = await requireClient(str(fd, "client_id"), { write: true });
  const year = validYear(str(fd, "year"));
  if (!year) redirect(`/app/clients/${client.id}/car-readiness`);
  const m = Number(str(fd, "maturity_override"));
  const verified = /^\d{4}-\d{2}-\d{2}$/.test(str(fd, "verified_on")) ? str(fd, "verified_on") : null;
  await q(`insert into car_reports (client_id, audit_year, background, conclusion_notes, verified_on, maturity_override, updated_by) values ($1,$2,$3,$4,$5,$6,$7)
    on conflict (client_id, audit_year) do update set background = excluded.background, conclusion_notes = excluded.conclusion_notes, verified_on = excluded.verified_on,
      maturity_override = excluded.maturity_override, updated_by = excluded.updated_by, updated_at = now()`,
    [client.id, year, opt(fd, "background"), opt(fd, "conclusion_notes"), verified, m >= 1 && m <= 5 ? m : null, user.id]);
  await audit(user, "update", "car_report", client.id, { client_id: client.id, details: { audit_year: year } });
  redirect(flash(`${yearPath(client.id, year)}#report`, "Report details saved"));
}

async function setStatus(fd: FormData) {
  "use server";
  const item = await one("select * from client_car_items where id = $1", [str(fd, "item_id")]);
  if (!item) redirect("/forbidden");
  const { user } = await requireClient(item.client_id, { write: true });
  const back = yearPath(item.client_id, item.audit_year);
  const status = str(fd, "status"), reason = opt(fd, "na_reason");
  if (!STATUSES.some(([s]) => s === status)) redirect(back);
  if (status === "not_applicable" && !reason) redirect(flash(`${back}#i-${item.id}`, "Add a non-conformity or observation note when marking an item Not applicable.", "error"));
  await q("update client_car_items set status = $2, na_reason = $3, recommendation = $5, answer = $6, evidence_notes = $7, is_new = false, updated_by = $4 where id = $1",
    [item.id, status, reason, user.id, opt(fd, "recommendation"), opt(fd, "answer"), opt(fd, "evidence_notes")]);
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
    from client_car_items i where i.client_id = $1 and i.audit_year = $2 and i.category_key <> 'data_processors' order by i.category_key, i.position`, [clientId, year]);
  type It = { category_key: string; status: string; priority: string | null };
  const r = readiness(items as It[]);
  const risk = carRisk(items as It[]);
  const oldTemplate = items.length > 0 && items.every((i) => !i.priority);
  const findings = await q("select * from car_findings where client_id = $1 and audit_year = $2 order by status, created_at", [clientId, year]);
  const openHigh = findings.filter((f) => f.status === "open" && f.risk === "high").length;
  const rep = (await one("select * from car_reports where client_id = $1 and audit_year = $2", [clientId, year])) ?? {};
  const firm = (await one("select ndpc_licence_no, signatory_name from firms where id = $1", [client.firm_id]))!;
  const answers = await answersOf(clientId);
  // Section B: departments from the organogram (then the onboarding list), and the chosen department's audit work plan.
  const depts = clientDepartments((answers.org_structure_file as { text?: string } | undefined)?.text, list(answers.org_departments));
  const plan = sp.dept && depts.includes(sp.dept)
    ? workplanFor(sp.dept, await q("select purpose, data_categories, system_owner from ropa_entries where client_id = $1 and state = 'active' and lower(department) = lower($2)", [clientId, sp.dept]) as any)
    : null;
  const obs = plan ? Object.fromEntries((await q<{ ref: string; observation: string }>("select ref, observation from workplan_observations where client_id = $1 and audit_year = $2 and dept = $3", [clientId, year, plan.dept])).map((o) => [o.ref, o.observation])) : {};
  const suggestedBackground = defaultBackground(String(answers.org_legal_name || client.name), answers);
  const open = items.filter((i) => i.status === "missing" || i.status === "in_progress");
  const noRecommendation = open.filter((i) => !i.recommendation).length, noObservation = open.filter((i) => !i.na_reason).length;
  const autoMaturity = maturityLevel(r.overall.pct);
  const exp = (kind: string, format: string) => `/export?kind=${kind}&client=${clientId}&year=${year}&format=${format}`;
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
            <a className="btn secondary" href={`/export?kind=car&client=${clientId}&year=${year}&format=pdf` + "&cover=only"} target="_blank">Cover letter (PDF)</a><a className="btn secondary" href={`/export?kind=car&client=${clientId}&year=${year}&format=doc` + "&cover=only"}>Cover letter (Word)</a>
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
      {oldTemplate && (
        <Banner kind="warn">This {year} checklist uses the earlier 25-item template. New checklists use the NDP Audit Questionnaire (GAID Schedule 2).
          {!ro && <div style={{ marginTop: 8 }}><Confirm action={switchTemplate} label="Switch to Schedule 2" title={`Switch ${year} to Schedule 2?`}
            body={`The ${year} checklist is replaced by the 69 Schedule 2 questions, all set to Missing. Statuses, answers, recommendations and Not applicable reasons on the current items are removed. Evidence requests stay, but are no longer linked to an item.`}>{h}</Confirm></div>}
        </Banner>
      )}
      <section className="panel" style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 22, margin: "0 0 8px" }}><b className="num">{r.overall.pct}%</b> ready · <span className="num">{r.overall.complete} of {r.overall.applicable}</span> applicable items complete</p>
        <Bar pct={r.overall.pct} />
        {risk && <p style={{ margin: "12px 0 0" }}>Risk score <b className="num">{risk.score}</b> / 100 <Chip status={`risk_${risk.rating}`} /> <span className="meta">From status and question priority: Missing is high risk, In progress medium, Complete low; a Medium-priority question drops one level. High-priority questions count double.</span></p>}
        {openHigh > 0 && <p style={{ margin: "8px 0 0" }}><a href="#findings"><b>{openHigh} open high-risk finding{openHigh > 1 ? "s" : ""}</b></a> <span className="meta">recorded outside the checklist.</span></p>}
        <p className="caption" style={{ marginTop: 8 }}>Items marked Not applicable are left out of both scores. {INSTALL.name} does not file the CAR with the NDPC.</p>
      </section>
      {Object.entries(CAR_CATEGORIES).filter(([k]) => items.some((i) => i.category_key === k)).map(([k, label]) => (
        <Fragment key={k}>
        {k === "governance" && <h3 style={{ margin: "24px 0 8px" }}>Section A <span className="meta">Parts 1 to 5</span></h3>}
        <details className="group" open>
          <summary><span>{label}</span><span className="row" style={{ gap: 8 }}>{(() => { const cr = carRisk(items.filter((i) => i.category_key === k) as It[]); return cr && <Chip status={`risk_${cr.rating}`} />; })()}<span className="num meta">{r.byCategory[k].pct}% · {r.byCategory[k].complete}/{r.byCategory[k].applicable}</span></span></summary>
          <div>
            {items.filter((i) => i.category_key === k).map((i, n, list) => {
              const s = i.auto_link_rule && !i.link_state ? sug[i.auto_link_rule] : null;
              const itemRisk = carItemRisk(i.status, i.priority);
              return (
                <div key={i.id} id={`i-${i.id}`} style={{ borderTop: "1px solid var(--line)", padding: "12px 0" }}>
                  {i.section && i.section !== list[n - 1]?.section && <h4 style={{ margin: "4px 0 12px" }}>{i.section}</h4>}
                  <div className="spread">
                    <div>
                      <b>{i.item_text}</b> {i.is_new && <span className="chip review">New item</span>}
                      {i.priority && <span className="meta"> · {i.priority === "high" ? "High" : i.priority === "medium" ? "Medium" : "Low"} priority</span>}
                      <div className="meta">
                        {i.accepted > 0 && `${i.accepted} accepted evidence · `}{i.pending > 0 && `${i.pending} evidence request${i.pending > 1 ? "s" : ""} open · `}
                        {i.link_state === "confirmed" && "Platform records confirmed · "}
                        {i.na_reason && `Non-conformity / observation: ${i.na_reason}`}
                      </div>
                      {ro && (i.answer || i.evidence_notes) && <p className="small" style={{ margin: "6px 0 0" }}>{i.answer && <><b>Answer:</b> {i.answer} </>}{i.evidence_notes && <><b>Evidence:</b> {i.evidence_notes}</>}</p>}
                    </div>
                    <span className="row" style={{ gap: 6 }}>{itemRisk && <Chip status={`risk_${itemRisk}`} />}<Chip status={i.status} /></span>
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
                      <label className="small" style={{ flex: 1, minWidth: 200 }}>Non-Conformity/Observation <input name="na_reason" defaultValue={i.na_reason ?? ""} placeholder="Required when Not applicable" /></label>
                      <label className="small" style={{ flex: "1 1 260px" }}>Answer / facts <input name="answer" defaultValue={i.answer ?? ""} placeholder="Yes, No, or the facts (e.g. a number or name)" /></label>
                      <label className="small" style={{ flex: "1 1 260px" }}>Evidence / documents <input name="evidence_notes" defaultValue={i.evidence_notes ?? ""} placeholder="Documents seen or requested" /></label>
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
        </Fragment>
      ))}
      <section id="workplan" style={{ marginTop: 24 }}>
        <h3 style={{ margin: "0 0 8px" }}>Section B <span className="meta">Audit work plan by department</span></h3>
        {depts.length === 0 ? <p className="meta">No departments yet. Attach the organogram or list the departments in <a href={`${b}/onboarding?s=0`}>Onboarding</a>.</p> : (
          <form className="row" style={{ alignItems: "flex-end" }} action={`#workplan`}>
            <input type="hidden" name="year" value={year} />
            <Field label="Department"><select name="dept" defaultValue={sp.dept ?? ""}><option value="">Choose a department…</option>{depts.map((d) => <option key={d}>{d}</option>)}</select></Field>
            <button className="btn secondary">Show work plan</button>
          </form>
        )}
        {plan && (
          <div className="panel" style={{ marginTop: 12 }}>
            <div className="spread" style={{ alignItems: "flex-start" }}>
              <div><b>{plan.dept}</b>{plan.unit ? <span className="meta"> · based on the work plan for {plan.unit.name}</span> : <span className="meta"> · base controls (no matching unit in the work plan)</span>}
                <div className="meta small">{[plan.profile.subjects && `Data subjects: ${plan.profile.subjects}`, plan.profile.data && `Key personal data: ${plan.profile.data}`, plan.profile.systems && `Systems: ${plan.profile.systems}`, plan.profile.risk && `Inherent risk: ${plan.profile.risk}`].filter(Boolean).join(" · ")}</div></div>
              <div className="row"><a className="btn secondary" href={`/export?kind=workplan&client=${clientId}&year=${year}&dept=${encodeURIComponent(plan.dept)}&format=pdf`} target="_blank">PDF</a><a className="btn secondary" href={`/export?kind=workplan&client=${clientId}&year=${year}&dept=${encodeURIComponent(plan.dept)}&format=doc`}>Word</a></div>
            </div>
            <form action={saveObservations}>
            <Hidden values={{ client_id: clientId, year: String(year), dept: plan.dept }} />
            <div className="cx-hscroll" style={{ marginTop: 8 }}>
            <table className="register" style={{ minWidth: 1100, tableLayout: "fixed" }}>
              <colgroup><col style={{ width: 70 }} /><col style={{ width: 120 }} /><col style={{ width: 110 }} /><col /><col /><col style={{ width: 120 }} /><col style={{ width: 110 }} /><col style={{ width: 220 }} /></colgroup>
              <thead><tr><th>Ref</th><th>CAR area</th><th>GAID / NDPA reference</th><th>Control objective</th><th>Audit procedure</th><th>Evidence to obtain</th><th>Risk</th><th>Observation</th></tr></thead>
              <tbody>{plan.rows.map((c) => (
                <tr key={c.ref}>
                  <td className="small">{c.ref}</td>
                  <td data-label="CAR area">{c.specific ? <b>{c.area}</b> : c.area}</td>
                  <td data-label="Reference" className="small">{c.law}</td>
                  <td data-label="Objective" className="small">{c.objective}</td>
                  <td data-label="Procedure" className="small">{c.procedure}</td>
                  <td data-label="Evidence" className="small">{c.evidence}</td>
                  <td data-label="Risk"><Chip status={`risk_${c.risk.toLowerCase()}`} /></td>
                  <td data-label="Observation"><textarea name={`obs_${c.ref}`} rows={4} style={{ width: "100%", boxSizing: "border-box" }} defaultValue={obs[c.ref] ?? ""} disabled={ro} aria-label={`Observation for ${c.ref}`} /></td>
                </tr>
              ))}</tbody>
            </table>
            </div>
            {!ro && <div style={{ marginTop: 16 }}><Submit>Save observations</Submit></div>}
            </form>
            <p className="caption">Bold CAR areas are controls specific to this department. {plan.rows.length} controls · NDPA 2023 / GAID 2025 Art. 10 CAR audit.</p>
          </div>
        )}
      </section>
      <section id="findings" style={{ marginTop: 32 }}>
        <h3 style={{ marginBottom: 4 }}>Other findings and observations</h3>
        <p className="meta" style={{ marginTop: 0 }}>Ancillary high-risk findings that none of the questions above cover. Shown to the client and included in exports.</p>
        {findings.length === 0 && <p className="meta">None recorded for {year}.</p>}
        {findings.map((f) => (
          <div key={f.id} className={`rule-row ${f.status === "open" && f.risk === "high" ? "urgent" : f.status === "open" ? "soon" : ""}`} style={{ display: "block" }}>
            {ro ? (
              <>
                <div className="spread"><b>{f.observation}</b><span className="row" style={{ gap: 6 }}><Chip status={`risk_${f.risk}`} /><Chip status={f.status} /></span></div>
                {f.recommendation && <p className="small" style={{ margin: "6px 0 0" }}><b>Recommendation:</b> {f.recommendation}</p>}
              </>
            ) : (
              <form action={saveFinding} className="row" style={{ alignItems: "flex-end" }}>
                <Hidden values={{ finding_id: f.id }} />
                <label className="small" style={{ flexBasis: "100%" }}>Finding / observation <textarea name="observation" rows={2} defaultValue={f.observation} required style={{ display: "block" }} /></label>
                <label className="small">Risk <select name="risk" defaultValue={f.risk} style={{ width: "auto", display: "block" }}>{RISKS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
                <label className="small">Status <select name="status" defaultValue={f.status} style={{ width: "auto", display: "block" }}><option value="open">Open</option><option value="resolved">Resolved</option></select></label>
                <label className="small" style={{ flex: "1 1 300px" }}>Recommendation <input name="recommendation" defaultValue={f.recommendation ?? ""} /></label>
                <Submit className="btn secondary" name="op" value="save">Save</Submit>
              </form>
            )}
            {!ro && (
              <div style={{ marginTop: 8 }}>
                <Confirm action={saveFinding} label="Delete" title="Delete this finding?" body="It is removed from this year's CAR readiness, the client portal and exports.">
                  <Hidden values={{ finding_id: f.id, op: "delete" }} />
                </Confirm>
              </div>
            )}
          </div>
        ))}
        {!ro && (
          <form action={addFinding} className="panel" style={{ marginTop: 16 }}>
            {h}
            <h4 style={{ marginTop: 0 }}>Add a finding</h4>
            <label className="small" style={{ display: "block" }}>Finding / observation <textarea name="observation" rows={2} required placeholder="e.g. Customer KYC files stored on a shared drive with no access control" style={{ display: "block" }} /></label>
            <div className="row" style={{ alignItems: "flex-end", marginTop: 8 }}>
              <label className="small">Risk <select name="risk" defaultValue="high" style={{ width: "auto", display: "block" }}>{RISKS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
              <label className="small" style={{ flex: "1 1 300px" }}>Recommendation <input name="recommendation" placeholder="What the client should do, and by when" /></label>
              <Submit>Add finding</Submit>
            </div>
          </form>
        )}
      </section>
      <section id="report" className="panel" style={{ marginTop: 32 }}>
        <h3 style={{ marginTop: 0 }}>Audit report and remediation tracker · {year}</h3>
        <p className="meta" style={{ marginTop: 0 }}>Generated from this checklist, the other findings, the client&apos;s onboarding answers and RoPA, and your firm profile. Save the details below, then generate.</p>
        {(!firm.ndpc_licence_no || !firm.signatory_name) && <Banner kind="warn">Your firm profile has no {!firm.ndpc_licence_no ? "NDPC licence number" : ""}{!firm.ndpc_licence_no && !firm.signatory_name ? " or " : ""}{!firm.signatory_name ? "report signatory" : ""} yet; the report will show &quot;Not stated&quot;. A Firm Admin can add them in <Link href="/app/settings/firm">Firm profile</Link>.</Banner>}
        {(noRecommendation > 0 || noObservation > 0) && <Banner kind="warn">{noObservation > 0 && <>{noObservation} open item{noObservation > 1 ? "s have" : " has"} no non-conformity/observation (the report states the status instead). </>}{noRecommendation > 0 && <>{noRecommendation} open item{noRecommendation > 1 ? "s have" : " has"} no recommendation (a standard corrective-action line is used).</>}</Banner>}
        {!ro && (
          <form action={saveReportDetails}>
            {h}
            <label className="small" style={{ display: "block" }}>Background (section 1.1)
              <textarea name="background" rows={5} defaultValue={rep.background ?? suggestedBackground} style={{ display: "block" }} />
            </label>
            <label className="small" style={{ display: "block", marginTop: 8 }}>Conclusion notes (optional, added to section 7.0)
              <textarea name="conclusion_notes" rows={3} defaultValue={rep.conclusion_notes ?? ""} style={{ display: "block" }} />
            </label>
            <div className="row" style={{ alignItems: "flex-end", marginTop: 8 }}>
              <label className="small">Verification date <input type="date" name="verified_on" defaultValue={rep.verified_on ?? todayWAT()} style={{ display: "block" }} /></label>
              <label className="small">Maturity level <select name="maturity_override" defaultValue={rep.maturity_override ?? ""} style={{ display: "block", width: "auto" }}>
                <option value="">Automatic: Level {autoMaturity} ({MATURITY[autoMaturity - 1][1]})</option>
                {MATURITY.map(([n, name]) => <option key={n} value={n}>Level {n}: {name}</option>)}
              </select></label>
              <Submit className="btn secondary">Save report details</Submit>
            </div>
          </form>
        )}
        <div className="row" style={{ marginTop: 16 }}>
          <a className="btn" href={exp("car-report", "pdf")} target="_blank">Generate audit report (PDF)</a>
          <a className="btn secondary" href={exp("car-report", "doc")}>Report (Word)</a>
          <a className="btn secondary" href={exp("car-report", "pdf") + "&cover=only"} target="_blank">Cover letter (PDF)</a><a className="btn secondary" href={exp("car-report", "doc") + "&cover=only"}>Cover letter (Word)</a>
          <Link className="btn" href={`/app/clients/${clientId}/remediation?year=${year}`}>Remediation tracker</Link>
          <a className="btn secondary" href={exp("car-tracker", "xlsx")}>Tracker (Excel)</a>
        </div>
      </section>
      </>}
    </>
  );
}
