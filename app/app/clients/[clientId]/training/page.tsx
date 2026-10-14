import Link from "next/link";
import { redirect } from "next/navigation";
import { requireClient, audit } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { str, opt, flash } from "@/lib/form";
import { TRAININGS, KINDS, sessionDates, type TrainingKind } from "@/lib/training";
import { todayWAT } from "@/lib/rules";
import { Flash, Field, Hidden, Chip, Empty } from "@/components/ui";
import { Submit } from "@/components/client";

const count = (v: string) => (v === "" ? null : Number.isInteger(Number(v)) && Number(v) >= 0 ? Number(v) : NaN);

async function schedule(fd: FormData) {
  "use server";
  const { user, client } = await requireClient(str(fd, "client_id"), { write: true });
  const back = `/app/clients/${client.id}/training`;
  const kind = str(fd, "kind") as TrainingKind, starts = str(fd, "starts_on"), ends = opt(fd, "ends_on"), planned = count(str(fd, "planned_participants"));
  if (!KINDS.includes(kind)) redirect(flash(back, "Choose a training.", "error"));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(starts)) redirect(flash(back, "Choose the training date.", "error"));
  if (ends && ends < starts) redirect(flash(back, "The end date is before the start date.", "error"));
  if (Number.isNaN(planned)) redirect(flash(back, "Enter the number of participants as a whole number.", "error"));
  const r = await one(`insert into trainings (firm_id, client_id, kind, title, starts_on, ends_on, start_time, mode, venue, facilitator, audience, planned_participants, notes, created_by)
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) returning id`,
    [client.firm_id, client.id, kind, opt(fd, "title"), starts, ends, opt(fd, "start_time"), opt(fd, "mode"), opt(fd, "venue"), opt(fd, "facilitator"), opt(fd, "audience"), planned, opt(fd, "notes"), user.id]);
  await audit(user, "create", "training", r!.id, { client_id: client.id, details: { kind, starts } });
  redirect(flash(back, `${TRAININGS[kind].name} scheduled`));
}

export default async function TrainingPlan({ params, searchParams }: { params: Promise<{ clientId: string }>; searchParams: Promise<Record<string, string>> }) {
  const { clientId } = await params;
  const sp = await searchParams;
  const { client } = await requireClient(clientId);
  const years = (await q<{ y: string }>("select distinct extract(year from starts_on)::int::text as y from trainings where client_id = $1 order by 1 desc", [clientId])).map((r) => r.y);
  const year = /^\d{4}$/.test(sp.year ?? "") ? sp.year : years[0] ?? todayWAT().slice(0, 4);
  const rows = await q(`select t.*, (select count(*)::int from files f where f.training_id = t.id) as evidence from trainings t
    where t.client_id = $1 and extract(year from t.starts_on) = $2 order by t.starts_on, t.created_at`, [clientId, Number(year)]);
  const today = todayWAT(), ro = !!client.archived_at, b = `/app/clients/${clientId}/training`;
  const exp = (f: string) => `/export?kind=training-plan&client=${clientId}&year=${year}&format=${f}`;
  return (
    <>
      <div className="spread" style={{ alignItems: "flex-start" }}>
        <div><h2 style={{ marginTop: 0 }}>Capacity building plan</h2><p className="meta">Schedule each data protection training, record attendance, and attach evidence once it has taken place.</p></div>
        <div className="row"><a className="btn" href={exp("pdf")} target="_blank">PDF</a><a className="btn secondary" href={exp("doc")}>Word</a><a className="btn secondary" href={exp("pdf") + "&cover=only"} target="_blank">Cover letter (PDF)</a><a className="btn secondary" href={exp("doc") + "&cover=only"}>Cover letter (Word)</a></div>
      </div>
      <Flash sp={sp} />
      <form className="row" style={{ alignItems: "flex-end", marginBottom: 16 }}>
        <Field label="Year"><input type="number" name="year" min={2019} max={2100} defaultValue={year} style={{ width: 120 }} /></Field>
        <button className="btn secondary">Show</button>
        {years.length > 1 && <span className="meta">Years with training: {years.map((y) => <Link key={y} href={`${b}?year=${y}`} style={{ marginRight: 8 }}>{y}</Link>)}</span>}
      </form>
      {KINDS.map((k) => {
        const rs = rows.filter((r) => r.kind === k);
        return (
          <section key={k} className="panel" style={{ marginBottom: 12 }}>
            <div className="spread"><h3 style={{ margin: 0 }}>{KINDS.indexOf(k) + 1}. {TRAININGS[k].name}</h3><span className="meta">{TRAININGS[k].audience}</span></div>
            {rs.length === 0 ? <p className="meta" style={{ marginBottom: 0 }}>Not scheduled for {year}.</p> : (
              <table className="register" style={{ marginTop: 8 }}>
                <thead><tr><th>Date</th><th>Mode / venue</th><th className="num">Participants</th><th>Status</th><th>Evidence</th></tr></thead>
                <tbody>{rs.map((r) => (
                  <tr key={r.id}>
                    <td><Link href={`${b}/${r.id}`}>{sessionDates(r)}</Link>{r.title && <div className="meta">{r.title}</div>}</td>
                    <td data-label="Mode / venue" className="small">{[r.mode, r.venue].filter(Boolean).join(", ") || "—"}</td>
                    <td data-label="Participants" className="num">{r.actual_participants ?? "—"} / {r.planned_participants ?? "—"}</td>
                    <td data-label="Status">{r.status === "completed" ? <Chip status="complete" /> : r.status === "cancelled" ? <span className="small">Cancelled</span> : r.starts_on < today ? <span className="small"><b>Held? Record it</b></span> : <span className="small">Scheduled</span>}</td>
                    <td data-label="Evidence" className="small">{r.evidence ? `${r.evidence} file${r.evidence === 1 ? "" : "s"}` : r.status === "completed" ? <Link href={`${b}/${r.id}`}>Attach</Link> : "—"}</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </section>
        );
      })}
      {rows.length === 0 && <Empty><p>No training scheduled for {year} yet.</p></Empty>}
      {!ro && (
        <form action={schedule} className="panel" style={{ marginTop: 24, maxWidth: 720 }}>
          <Hidden values={{ client_id: clientId }} />
          <h3 style={{ marginTop: 0 }}>Schedule a training</h3>
          <Field label="Training" required><select name="kind" required defaultValue="">{[<option key="" value="" disabled>Choose…</option>, ...KINDS.map((k) => <option key={k} value={k}>{TRAININGS[k].name}</option>)]}</select></Field>
          <Field label="Session title (optional)" help="e.g. Q1 awareness session, Finance team"><input name="title" /></Field>
          <div className="row">
            <Field label="Start date" required><input type="date" name="starts_on" required /></Field>
            <Field label="End date (if more than one day)"><input type="date" name="ends_on" /></Field>
            <Field label="Time"><input type="time" name="start_time" /></Field>
          </div>
          <div className="row">
            <Field label="Number of participants"><input type="number" name="planned_participants" min={0} style={{ width: 140 }} /></Field>
            <Field label="Mode"><select name="mode" defaultValue=""><option value="">–</option><option>In person</option><option>Virtual</option><option>Hybrid</option></select></Field>
          </div>
          <Field label="Venue or link"><input name="venue" /></Field>
          <Field label="Facilitator"><input name="facilitator" /></Field>
          <Field label="Participants / departments" help="Who should attend, e.g. Finance and HR staff"><input name="audience" /></Field>
          <Field label="Notes"><textarea name="notes" rows={2} /></Field>
          <Submit>Schedule training</Submit>
        </form>
      )}
    </>
  );
}
