import Link from "next/link";
import { redirect } from "next/navigation";
import { requireClient, audit } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { latestVersion, versionsOf, getVersion, loadCtx, signatureFor } from "@/lib/data";
import { DPIA_STEPS, suggestedRisks, dpiaStep, normalizeDpia, type Risk } from "@/lib/templates";
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
  const body = normalizeDpia(v.body);
  if (step === "scoring") {
    const risks: Risk[] = [];
    for (let i = 0; fd.has(`r${i}_description`); i++) {
      const description = str(fd, `r${i}_description`);
      if (description) risks.push({ description, likelihood: Number(str(fd, `r${i}_l`)) || 1, impact: Number(str(fd, `r${i}_i`)) || 1 });
    }
    body.risks_list = risks;
  } else if (step === "measures") {
    // Per-risk mitigation and residual score, plus the general measures text.
    body.risks_list = (body.risks_list ?? []).map((r, i) => ({ ...r, mitigation: str(fd, `r${i}_mitigation`) || undefined,
      residual_likelihood: Number(str(fd, `r${i}_rl`)) || undefined, residual_impact: Number(str(fd, `r${i}_ri`)) || undefined }));
    body.measures = str(fd, "text");
  } else if (DPIA_STEPS.some((s) => s.key === step)) {
    body[step as Exclude<(typeof DPIA_STEPS)[number]["key"], "scoring">] = str(fd, "text");
  }
  await q("update content_versions set body = $2 where id = $1 and status = 'draft'", [v.id, JSON.stringify(body)]);
  await audit(user, "update", "dpia", v.parent_id, { client_id: v.client_id, details: { step } });
  const i = DPIA_STEPS.findIndex((s) => s.key === step);
  const next = str(fd, "stay") ? step : DPIA_STEPS[Math.min(i + 1, DPIA_STEPS.length - 1)].key;
  redirect(flash(`${back}?step=${next}`, "Saved"));
}

/** Fill every empty text step with its draft from the client's records (the 12-point DPIA guide). Filled steps are kept. */
async function fillAll(fd: FormData) {
  "use server";
  const v = await getVersion(str(fd, "id"));
  if (!v || v.parent_type !== "dpia") redirect("/forbidden");
  const { user } = await requireClient(v.client_id, { write: true });
  const back = `/app/clients/${v.client_id}/dpias/${v.parent_id}`;
  if (v.status !== "draft") redirect(flash(back, "This version is locked. Edit creates a new version.", "error"));
  const ids = (await q("select ropa_entry_id from dpia_ropa where dpia_id = $1", [v.parent_id])).map((r) => r.ropa_entry_id);
  const ctx = await loadCtx(v.client_id, ids);
  const body = normalizeDpia(v.body);
  let filled = 0;
  for (const s of DPIA_STEPS) {
    if (s.key === "scoring") { if (!body.risks_list?.length) { body.risks_list = suggestedRisks(ctx); filled++; } continue; }
    if (!body[s.key]?.trim()) { body[s.key] = dpiaStep(s.key, ctx); filled++; }
  }
  await q("update content_versions set body = $2 where id = $1 and status = 'draft'", [v.id, JSON.stringify(body)]);
  await audit(user, "update", "dpia", v.parent_id, { client_id: v.client_id, details: { filled_steps: filled } });
  redirect(flash(`${back}?step=screening`, filled ? `${filled} empty step${filled > 1 ? "s" : ""} filled from the client's records. Complete the [To be completed] parts and review each step.` : "Every step already has content."));
}

async function setReviewDate(fd: FormData) {
  "use server";
  const d = await one("select id, client_id from dpias where id = $1", [str(fd, "dpia_id")]);
  if (!d) redirect("/forbidden");
  const { user } = await requireClient(d.client_id, { write: true });
  const back = `/app/clients/${d.client_id}/dpias/${d.id}`;
  const year = Number(str(fd, "assessment_year"));
  if (!Number.isInteger(year) || year < 2019 || year > 2100) redirect(flash(back, "Enter the assessment year as four digits, for example 2026.", "error"));
  await q("update dpias set review_date = $2, assessment_year = $3 where id = $1", [d.id, opt(fd, "review_date"), year]);
  await audit(user, "update", "dpia", d.id, { client_id: d.client_id, details: { review_date: opt(fd, "review_date"), assessment_year: year } });
  redirect(flash(back, "Saved. The review date appears on the calendar."));
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
  const body = normalizeDpia(v.body);
  // Older links used the 7-step names; send them to the matching step of the 12-point guide.
  const alias: Record<string, string> = { description: "purpose", risks: "risks_cia", mitigations: "measures", residual: "conclusion" };
  const step = DPIA_STEPS.find((s) => s.key === (alias[sp.step] ?? sp.step))?.key ?? "screening";
  const stepIdx = DPIA_STEPS.findIndex((s) => s.key === step);
  const ropa = await q("select r.id, r.purpose, r.state from dpia_ropa dr join ropa_entries r on r.id = dr.ropa_entry_id where dr.dpia_id = $1", [d.id]);
  const editable = v.status === "draft" && !viewingOld && !client.archived_at;
  const back = `/app/clients/${clientId}/dpias/${d.id}`;
  const sig = v.status === "client_signed_off" ? await signatureFor(v.id) : null;
  const ctx = editable ? await loadCtx(clientId, ropa.map((r) => r.id)) : null;
  const risks = body.risks_list?.length ? body.risks_list : ctx ? suggestedRisks(ctx) : [];
  const stored = step === "scoring" ? undefined : body[step];
  const draftText = stored ?? (ctx && step !== "scoring" ? dpiaStep(step, ctx) : "");
  const emptySteps = DPIA_STEPS.filter((s) => (s.key === "scoring" ? !body.risks_list?.length : !body[s.key]?.trim())).length;
  const h = <Hidden values={{ id: v.id, step }} />;

  return (
    <>
      <nav className="meta" aria-label="Breadcrumb"><Link href={`/app/clients/${clientId}/dpias`}>DPIAs</Link> / <Link href={`/app/clients/${clientId}/dpias?year=${d.assessment_year}`}>{d.assessment_year}</Link> / {d.title}</nav>
      <h2 style={{ marginTop: 8 }}>{d.title} <span className="meta" style={{ fontSize: "0.7em" }}>· {d.assessment_year}</span> <Chip status={v.status} ai={v.ai_generated} /></h2>
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
          {editable && emptySteps > 0 && (
            <form action={fillAll} className="row" style={{ marginBottom: 12 }}><Hidden values={{ id: v.id }} />
              <Submit className="btn secondary">Fill all {emptySteps} empty steps</Submit>
              <span className="meta">Drafts every empty step from the client&apos;s records, following the DPIA guide. Filled steps are kept.</span>
            </form>
          )}
          <h3 style={{ marginBottom: 4 }}>Step {stepIdx + 1} of {DPIA_STEPS.length}: {DPIA_STEPS[stepIdx].title}</h3>
          <p className="meta" style={{ marginTop: 0 }}>{DPIA_STEPS[stepIdx].guide}</p>

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
              {step === "measures" && (
                body.risks_list?.length ? (
                  <div className="scroll" style={{ marginBottom: 16 }}>
                    <table className="register">
                      <thead><tr><th>Risk (from step 11)</th><th>Measures to reduce it</th><th>Residual likelihood</th><th>Residual impact</th><th>Residual score</th></tr></thead>
                      <tbody>{body.risks_list.map((r, i) => (
                        <tr key={i}>
                          <td>{r.description}<div className="meta">Score {r.likelihood * r.impact} · {riskLevel(r.likelihood * r.impact)}</div></td>
                          <td data-label="Measures"><textarea name={`r${i}_mitigation`} rows={2} defaultValue={r.mitigation ?? ""} aria-label={`Measures for risk ${i + 1}`} /></td>
                          <td data-label="Residual likelihood"><select name={`r${i}_rl`} defaultValue={r.residual_likelihood ?? ""} aria-label={`Residual likelihood ${i + 1}`}><option value="">–</option>{scale.map((n) => <option key={n}>{n}</option>)}</select></td>
                          <td data-label="Residual impact"><select name={`r${i}_ri`} defaultValue={r.residual_impact ?? ""} aria-label={`Residual impact ${i + 1}`}><option value="">–</option>{scale.map((n) => <option key={n}>{n}</option>)}</select></td>
                          <td data-label="Residual score" className="num">{r.residual_likelihood && r.residual_impact ? `${r.residual_likelihood * r.residual_impact} · ${riskLevel(r.residual_likelihood * r.residual_impact)}` : "—"}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                ) : <Banner kind="warn">Save the risks in step 11 first; each one then gets its own measures here.</Banner>
              )}
              {stored === undefined && <p className="meta">Suggested draft from the client&apos;s records. Edit it, then save.</p>}
              <Field label={step === "measures" ? "General technical and organisational measures" : DPIA_STEPS[stepIdx].title} help="Plain text. Start a line with ## for a subheading or - for a bullet.">
                <textarea name="text" className="doc-edit" style={{ minHeight: 320 }} defaultValue={draftText} />
              </Field>
              <div className="row"><Submit>{stepIdx < DPIA_STEPS.length - 1 ? "Save and continue" : "Save"}</Submit><Submit className="btn secondary" name="stay" value="1">Save</Submit></div>
            </form>
          ) : (
            <Doc body={(step === "measures" && body.risks_list?.length ? `## Measures for each risk\n${body.risks_list.map((r) => `- ${r.description}: ${r.mitigation ?? "Not completed."}`).join("\n")}\n\n` : "") + (stored || "Not completed.")} className={v.status === "draft" ? "draft" : ""} />
          )}
        </div>
        <aside>
          {!viewingOld && !client.archived_at && <ReviewBar v={v} user={user} back={back} signoff />}
          {editable && step !== "scoring" && <AiPanel v={v} back={`${back}?step=${step}`} step={step} label="Draft this step with AI" />}
          <section className="panel">
            <h3>Year and review</h3>
            <form action={setReviewDate}>
              <Hidden values={{ dpia_id: d.id }} />
              <Field label="Assessment year"><input type="number" name="assessment_year" min={2019} max={2100} required defaultValue={d.assessment_year} disabled={!!client.archived_at} style={{ width: 140 }} /></Field>
              <Field label="Next review"><input type="date" name="review_date" defaultValue={d.review_date ?? ""} disabled={!!client.archived_at} /></Field>
              {!client.archived_at && <Submit className="btn secondary">Save</Submit>}
            </form>
          </section>
          <Versions versions={await versionsOf("dpia", d.id)} current={v.id} base={back} />
        </aside>
      </div>
    </>
  );
}
