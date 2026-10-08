import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireClient, audit } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { str, flash } from "@/lib/form";
import { answersOf } from "@/lib/data";
import { list } from "@/lib/questionnaire";
import { KINDS, RATED, prefill, type Kind } from "@/lib/assessments";
import { riskLevel } from "@/lib/rules";
import { Flash, Field, Hidden, Chip, Empty } from "@/components/ui";
import { Submit } from "@/components/client";

async function create(fd: FormData) {
  "use server";
  const { user, client } = await requireClient(str(fd, "client_id"), { write: true });
  const kind = str(fd, "kind") as Kind;
  if (!KINDS[kind]) redirect("/forbidden");
  const base = `/app/clients/${client.id}/assessments/${kind}`;
  const title = str(fd, "title"), year = Number(str(fd, "year"));
  if (!title || !Number.isInteger(year) || year < 2019 || year > 2100) redirect(flash(base, "Enter a title and a four-digit year.", "error"));
  const ropa = str(fd, "ropa") ? await one("select * from ropa_entries where id = $1 and client_id = $2", [str(fd, "ropa"), client.id]) : null;
  const a = await answersOf(client.id);
  const answers = prefill(kind, { org: String(a.org_legal_name || client.name), ropa: (ropa as any) ?? null, countries: list(a.transfer_countries) });
  const r = await one("insert into assessments (firm_id, client_id, kind, title, assessment_year, ropa_entry_id, answers, created_by) values ($1,$2,$3,$4,$5,$6,$7,$8) returning id",
    [client.firm_id, client.id, kind, title, year, ropa?.id ?? null, JSON.stringify(answers), user.id]);
  await audit(user, "create", `assessment_${kind}`, r!.id, { client_id: client.id });
  redirect(flash(`${base}/${r!.id}`, "Started. Pre-filled from the linked activity; complete the rest."));
}

export default async function Assessments({ params, searchParams }: { params: Promise<{ clientId: string; kind: string }>; searchParams: Promise<Record<string, string>> }) {
  const { clientId, kind } = await params;
  const sp = await searchParams;
  const k = KINDS[kind as Kind];
  if (!k) notFound();
  const { client } = await requireClient(clientId);
  const rows = await q(`select a.*, r.purpose from assessments a left join ropa_entries r on r.id = a.ropa_entry_id where a.client_id = $1 and a.kind = $2 order by a.assessment_year desc, a.created_at desc`, [clientId, kind]);
  // Suggest the activities that need one: legitimate interest (LIA), transfers outside Nigeria (TIA), third-party recipients (TPRA).
  const ropa = await q(`select id, purpose, lawful_basis, has_transfer, recipients from ropa_entries where client_id = $1 and state = 'active' order by purpose`, [clientId]);
  const needs = ropa.filter((r) => (kind === "lia" ? r.lawful_basis === "legitimate_interest" : kind === "tpra" ? !!r.recipients?.trim() : r.has_transfer));
  const b = `/app/clients/${clientId}/assessments/${kind}`;
  return (
    <>
      <h2 style={{ marginTop: 0 }}>{k.name}s</h2>
      <p className="meta">{k.intro}</p>
      <Flash sp={sp} />
      {rows.length === 0 ? <Empty><p>No {k.name.toLowerCase()}s yet.</p></Empty> : (
        <table className="register">
          <thead><tr><th>Assessment</th><th className="num">Year</th><th>Activity</th>{RATED.includes(kind as Kind) && <th>Risk</th>}<th>Outcome</th><th>Status</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id}>
              <td><Link href={`${b}/${r.id}`}>{r.title}</Link></td>
              <td data-label="Year" className="num">{r.assessment_year}</td>
              <td data-label="Activity">{r.purpose ?? "—"}</td>
              {RATED.includes(kind as Kind) && <td data-label="Risk">{r.likelihood && r.impact ? `${r.likelihood * r.impact} (${riskLevel(r.likelihood * r.impact)})` : "—"}</td>}
              <td data-label="Outcome" className="small">{r.outcome ?? "—"}</td>
              <td data-label="Status"><Chip status={r.status === "approved" ? "approved" : "draft"} /></td>
            </tr>
          ))}</tbody>
        </table>
      )}
      {!client.archived_at && (
        <form action={create} className="panel" style={{ marginTop: 24, maxWidth: 640 }}>
          <Hidden values={{ client_id: clientId, kind }} />
          <h3 style={{ marginTop: 0 }}>Start a {k.name.toLowerCase()}</h3>
          {needs.length > 0 && <p className="meta">Activities that need one: {needs.map((n) => n.purpose).join(", ")}.</p>}
          <Field label="Title" required><input name="title" required defaultValue={needs[0]?.purpose ?? ""} /></Field>
          <Field label="Processing activity (RoPA)" help="Pre-fills the assessment from this activity.">
            <select name="ropa" defaultValue={needs[0]?.id ?? ""}><option value="">Not linked</option>{ropa.map((r) => <option key={r.id} value={r.id}>{r.purpose}</option>)}</select>
          </Field>
          <Field label="Year" required><input type="number" name="year" min={2019} max={2100} required defaultValue={new Date().getFullYear()} style={{ width: 140 }} /></Field>
          <Submit>Start</Submit>
        </form>
      )}
    </>
  );
}
