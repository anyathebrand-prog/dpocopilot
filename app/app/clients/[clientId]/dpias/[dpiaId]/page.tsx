import Link from "next/link";
import { redirect } from "next/navigation";
import { requireClient, audit } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { latestVersion, versionsOf, getVersion, loadCtx, signatureFor } from "@/lib/data";
import { DPIA_STEPS, suggestedRisks, type DpiaBody, type Risk } from "@/lib/templates";
import { riskLevel } from "@/lib/rules";
import { str, opt, flash } from "@/lib/form";
import { Flash, Field, Hidden, Chip, Seal, Doc, Banner } from "@/components/ui";
import { Submit } from "@/components/client";
import { ReviewBar, AiPanel, Versions } from "@/components/workflow";

const scale = [1, 2, 3, 4, 5];

async function saveStep(fd: FormData) {
  "use server";
  const v = await getVersion(str(fd, "id"));
  if (!v || v.parent_type !== "dpia") redirect("/forbidden");
  const { user } = await requireClient(v.client_id, { write: true });
  const step = str(fd, "step"), back = `/app/clients/${v.client_id}/dpias/${v.parent_id}`;
  if (v.status !== "draft") redirect(flash(`${back}?step=${step}`, "This version is locked. Edit creates a new version.", "error"));
  const body: DpiaBody = JSON.parse(v.body || "{}");
  if (step === "scoring") {
    const risks: Risk[] = [];
    for (let i = 0; fd.has(`r${i}_description`); i++) {
      const description = str(fd, `r${i}_description`);
      if (description) risks.push({ description, likelihood: Number(str(fd, `r${i}_l`)) || 1, impact: Number(str(fd, `r${i}_i`)) || 1 });
    }
    body.risks_list = risks;
  } else if (DPIA_STEPS.some((s) => s.key === step)) {
    body[step as keyof Omit<DpiaBody, "risks_list">] = str(fd, "text");
  }
  await q("update content_versions set body = $2 where id = $1 and status = 'draft'", [v.id, JSON.stringify(body)]);
  await audit(user, "update", "dpia", v.parent_id, { client_id: v.client_id, details: { step } });
  const i = DPIA_STEPS.findIndex((s) => s.key === step);
  const next = str(fd, "stay") ? step : DPIA_STEPS[Math.min(i + 1, DPIA_STEPS.length - 1)].key;
  redirect(flash(`${back}?step=${next}`, "Saved"));
}

async function setReviewDate(fd: FormData) {
  "use server";
  const d = await one("select id, client_id from dpias where id = $1", [str(fd, "dpia_id")]);
  if (!d) redirect("/forbidden");
  const { user } = await requireClient(d.client_id, { write: true });
  await q("update dpias set review_date = $2 where id = $1", [d.id, opt(fd, "review_date")]);
  await audit(user, "update", "dpia", d.id, { client_id: d.client_id, details: { review_date: opt(fd, "review_date") } });
  redirect(flash(`/app/clients/${d.client_id}/dpias/${d.id}`, "Review date saved. It appears on the calendar."));
}

export default async function Dpia({ params, searchParams }: { params: Promise<{ clientId: string; dpiaId: string }>; searchParams: Promise<Record<string, string>> }) {
  const { clientId, dpiaId } = await params;
  const sp = await searchParams;
  const { user, client } = await requireClient(clientId);
  const d = await one("select * from dpias where id = $1 and client_id = $2", [/^[0-9a-f-]{36}$/.test(dpiaId) ? dpiaId : null, clientId]);
  if (!d) redirect("/forbidden");
  const latest = (await latestVersion("dpia", d.id))!;
  const picked = sp.v ? await getVersion(sp.v) : undefined;
  const v = picked && picked.parent_id === d.id ? picked : latest;
  const viewingOld = v.id !== latest.id;
  const body: DpiaBody = JSON.parse(v.body || "{}");
  const step = DPIA_STEPS.find((s) => s.key === sp.step)?.key ?? "description";
  const stepIdx = DPIA_STEPS.findIndex((s) => s.key === step);
  const ropa = await q("select r.id, r.purpose, r.state from dpia_ropa dr join ropa_entries r on r.id = dr.ropa_entry_id where dr.dpia_id = $1", [d.id]);
  const editable = v.status === "draft" && !viewingOld && !client.archived_at;
  const back = `/app/clients/${clientId}/dpias/${d.id}`;
  const sig = v.status === "client_signed_off" ? await signatureFor(v.id) : null;
  const risks = body.risks_list?.length ? body.risks_list : editable ? suggestedRisks(await loadCtx(clientId, ropa.map((r) => r.id))) : [];
  const h = <Hidden values={{ id: v.id, step }} />;

  return (
    <>
      <nav className="meta" aria-label="Breadcrumb"><Link href={`/app/clients/${clientId}/dpias`}>DPIAs</Link> / {d.title}</nav>
      <h2 style={{ marginTop: 8 }}>{d.title} <Chip status={v.status} ai={v.ai_generated} /></h2>
      <p className="meta">Covers: {ropa.map((r, i) => <span key={r.id}>{i > 0 && ", "}<Link href={`/app/clients/${clientId}/ropa/${r.id}`}>{r.purpose}</Link>{r.state === "archived" && " (archived)"}</span>)}</p>
      <Flash sp={sp} />
      {viewingOld && <Banner>You are viewing version {v.version_no}. <Link href={back}>Go to the current version</Link></Banner>}
      {ropa.some((r) => r.state === "archived") && <Banner kind="warn">A linked processing activity has been archived.</Banner>}
      <Seal v={v} sig={sig} />

      <div className="with-rail">
        <div>
          <ol className="row" style={{ listStyle: "none", padding: 0, gap: 4, marginBottom: 16 }} aria-label="DPIA steps">
            {DPIA_STEPS.map((s, i) => (
              <li key={s.key}><Link href={`${back}?step=${s.key}${viewingOld ? `&v=${v.id}` : ""}`} className={`btn ${s.key === step ? "" : "secondary"}`} aria-current={s.key === step ? "step" : undefined} style={{ minWidth: 0, height: 36, fontSize: 14 }}>{i + 1}. {s.title}</Link></li>
            ))}
          </ol>
          <h3>Step {stepIdx + 1} of 7: {DPIA_STEPS[stepIdx].title}</h3>

          {step === "scoring" ? (
            <form action={saveStep}>{h}
              <fieldset disabled={!editable}>
                <div className="scroll">
                  <table className="register">
                    <thead><tr><th>Risk</th><th>Likelihood (1–5)</th><th>Impact (1–5)</th><th>Score and level</th></tr></thead>
                    <tbody>
                      {[...risks, ...(editable ? [{ description: "", likelihood: 1, impact: 1 }] : [])].map((r, i) => (
                        <tr key={i}>
                          <td><input name={`r${i}_description`} defaultValue={r.description} aria-label={`Risk ${i + 1} description`} placeholder={r.description ? undefined : "Add a risk"} /></td>
                          <td data-label="Likelihood"><select name={`r${i}_l`} defaultValue={r.likelihood} aria-label={`Risk ${i + 1} likelihood`}>{scale.map((n) => <option key={n}>{n}</option>)}</select></td>
                          <td data-label="Impact"><select name={`r${i}_i`} defaultValue={r.impact} aria-label={`Risk ${i + 1} impact`}>{scale.map((n) => <option key={n}>{n}</option>)}</select></td>
                          <td data-label="Score" className="num">{r.description ? `${r.likelihood * r.impact} · ${riskLevel(r.likelihood * r.impact)}` : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!body.risks_list?.length && editable && <p className="meta">Suggested risks from the linked activities. Edit or clear them, then save.</p>}
                {editable && <div className="row" style={{ marginTop: 12 }}><Submit>Save and continue</Submit><Submit className="btn secondary" name="stay" value="1">Save</Submit></div>}
              </fieldset>
              <details style={{ marginTop: 16 }}>
                <summary>Scoring guide (likelihood × impact)</summary>
                <div className="scroll"><table className="risk-grid" style={{ marginTop: 8 }}>
                  <thead><tr><th>Impact ↓ / Likelihood →</th>{scale.map((l) => <th key={l}>{l}</th>)}</tr></thead>
                  <tbody>{[...scale].reverse().map((i) => <tr key={i}><th>{i}</th>{scale.map((l) => { const s = l * i, lv = riskLevel(s); return <td key={l} className={lv === "Low" ? "" : lv === "Medium" ? "lvl-med" : "lvl-high"}>{s} {lv}</td>; })}</tr>)}</tbody>
                </table></div>
              </details>
            </form>
          ) : editable ? (
            <form action={saveStep}>{h}
              <Field label={DPIA_STEPS[stepIdx].title} help="Plain text. Start a line with ## for a subheading or - for a bullet.">
                <textarea name="text" className="doc-edit" style={{ minHeight: 320 }} defaultValue={body[step] ?? ""} />
              </Field>
              <div className="row"><Submit>{stepIdx < 6 ? "Save and continue" : "Save"}</Submit><Submit className="btn secondary" name="stay" value="1">Save</Submit></div>
            </form>
          ) : (
            <Doc body={body[step] || "Not completed."} className={v.status === "draft" ? "draft" : ""} />
          )}
        </div>
        <aside>
          {!viewingOld && !client.archived_at && <ReviewBar v={v} user={user} back={back} signoff />}
          {editable && step !== "scoring" && <AiPanel v={v} back={`${back}?step=${step}`} step={step} label="Draft this step with AI" />}
          <section className="panel">
            <h3>Review date</h3>
            <form action={setReviewDate}>
              <Hidden values={{ dpia_id: d.id }} />
              <Field label="Next review"><input type="date" name="review_date" defaultValue={d.review_date ?? ""} disabled={!!client.archived_at} /></Field>
              {!client.archived_at && <Submit className="btn secondary">Save review date</Submit>}
            </form>
          </section>
          <Versions versions={await versionsOf("dpia", d.id)} current={v.id} base={back} />
        </aside>
      </div>
    </>
  );
}
