import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireClient, audit } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { str, flash } from "@/lib/form";
import { KINDS, type Kind } from "@/lib/assessments";
import { riskLevel } from "@/lib/rules";
import { Flash, Hidden, Chip } from "@/components/ui";
import { Submit } from "@/components/client";

const scale = [1, 2, 3, 4, 5];

async function load(fd: FormData) {
  const a = await one("select * from assessments where id = $1", [/^[0-9a-f-]{36}$/.test(str(fd, "id")) ? str(fd, "id") : null]);
  if (!a) redirect("/forbidden");
  const { user } = await requireClient(a.client_id, { write: true });
  return { a, user, back: `/app/clients/${a.client_id}/assessments/${a.kind}/${a.id}` };
}

async function save(fd: FormData) {
  "use server";
  const { a, user, back } = await load(fd);
  const k = KINDS[a.kind as Kind];
  const answers: Record<string, string> = { outcome_notes: str(fd, "outcome_notes") };
  for (const s of k.sections) for (const qn of s.questions) answers[qn.key] = str(fd, qn.key);
  const n = (f: string) => { const v = Number(str(fd, f)); return v >= 1 && v <= 5 ? v : null; };
  const outcome = k.outcomes.includes(str(fd, "outcome")) ? str(fd, "outcome") : null;
  // Editing an approved assessment returns it to draft.
  await q("update assessments set answers = $2, likelihood = $3, impact = $4, outcome = $5, status = 'draft', approved_by = null, approved_at = null, updated_at = now() where id = $1",
    [a.id, JSON.stringify(answers), n("likelihood"), n("impact"), outcome]);
  await audit(user, "update", `assessment_${a.kind}`, a.id, { client_id: a.client_id });
  redirect(flash(back, a.status === "approved" ? "Saved. It's back to draft and needs approving again." : "Saved"));
}

async function approve(fd: FormData) {
  "use server";
  const { a, user, back } = await load(fd);
  if (!a.outcome) redirect(flash(back, "Choose an outcome before approving.", "error"));
  await q("update assessments set status = 'approved', approved_by = $2, approved_at = now() where id = $1", [a.id, user.id]);
  await audit(user, "approve", `assessment_${a.kind}`, a.id, { client_id: a.client_id });
  redirect(flash(back, "Approved"));
}

export default async function Assessment({ params, searchParams }: { params: Promise<{ clientId: string; kind: string; id: string }>; searchParams: Promise<Record<string, string>> }) {
  const { clientId, kind, id } = await params;
  const sp = await searchParams;
  const k = KINDS[kind as Kind];
  if (!k) notFound();
  const { client } = await requireClient(clientId);
  const a = await one("select a.*, r.purpose, u.name as approver from assessments a left join ropa_entries r on r.id = a.ropa_entry_id left join users u on u.id = a.approved_by where a.id = $1 and a.client_id = $2 and a.kind = $3",
    [/^[0-9a-f-]{36}$/.test(id) ? id : null, clientId, kind]);
  if (!a) notFound();
  const ro = !!client.archived_at, score = a.likelihood && a.impact ? a.likelihood * a.impact : null;
  const exp = (f: string) => `/export?kind=assessment&id=${a.id}&format=${f}`;
  return (
    <>
      <nav className="meta" aria-label="Breadcrumb"><Link href={`/app/clients/${clientId}/assessments/${kind}`}>{k.name}s</Link> / {a.title}</nav>
      <div className="spread" style={{ alignItems: "flex-start" }}>
        <h2 style={{ marginTop: 8 }}>{a.title} <span className="meta" style={{ fontSize: "0.7em" }}>· {a.assessment_year}</span> <Chip status={a.status === "approved" ? "approved" : "draft"} /></h2>
        <div className="row" style={{ marginTop: 8 }}><a className="btn" href={exp("pdf")} target="_blank">PDF</a><a className="btn secondary" href={exp("doc")}>Word</a></div>
      </div>
      <p className="meta">Activity: {a.purpose ?? "not linked"}{a.status === "approved" && a.approver ? ` · Approved by ${a.approver}` : ""}</p>
      <Flash sp={sp} />
      <form action={save}>
        <Hidden values={{ id: a.id }} />
        <fieldset disabled={ro}>
          {k.sections.map((s) => (
            <section key={s.title} className="panel" style={{ marginBottom: 16 }}>
              <h3 style={{ marginTop: 0 }}>{s.title}</h3>
              {s.questions.map((qn) => (
                <label key={qn.key} className="small" style={{ display: "block", marginBottom: 12 }}>{qn.label}{qn.help && <span className="meta"> {qn.help}</span>}
                  {qn.type === "choice"
                    ? <select name={qn.key} defaultValue={a.answers[qn.key] ?? ""} style={{ display: "block", width: "auto" }}><option value="">–</option>{qn.options!.map((o) => <option key={o}>{o}</option>)}</select>
                    : <textarea name={qn.key} rows={2} defaultValue={a.answers[qn.key] ?? ""} style={{ display: "block" }} />}
                </label>
              ))}
            </section>
          ))}
          {kind === "tia" && (
            <section className="panel" style={{ marginBottom: 16 }}>
              <h3 style={{ marginTop: 0 }}>6. Risk rating</h3>
              <div className="row" style={{ alignItems: "flex-end" }}>
                <label className="small">Likelihood (1–5) <select name="likelihood" defaultValue={a.likelihood ?? ""} style={{ display: "block", width: "auto" }}><option value="">–</option>{scale.map((n) => <option key={n}>{n}</option>)}</select></label>
                <label className="small">Impact (1–5) <select name="impact" defaultValue={a.impact ?? ""} style={{ display: "block", width: "auto" }}><option value="">–</option>{scale.map((n) => <option key={n}>{n}</option>)}</select></label>
                <span>{score ? <b>{score} · {riskLevel(score)}</b> : <span className="meta">Not scored</span>}</span>
              </div>
            </section>
          )}
          <section className="panel" style={{ marginBottom: 16 }}>
            <h3 style={{ marginTop: 0 }}>{kind === "tia" ? "7" : "4"}. Outcome</h3>
            {k.outcomes.map((o) => <label key={o} className="check"><input type="radio" name="outcome" value={o} defaultChecked={a.outcome === o} />{o}</label>)}
            <label className="small" style={{ display: "block", marginTop: 8 }}>Reasons and conditions
              <textarea name="outcome_notes" rows={3} defaultValue={a.answers.outcome_notes ?? ""} style={{ display: "block" }} />
            </label>
          </section>
          {!ro && <Submit>Save</Submit>}
        </fieldset>
      </form>
      {!ro && a.status !== "approved" && <form action={approve} style={{ marginTop: 12 }}><Hidden values={{ id: a.id }} /><Submit className="btn secondary">Approve</Submit></form>}
    </>
  );
}
