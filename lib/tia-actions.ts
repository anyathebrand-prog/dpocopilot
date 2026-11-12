"use server";
// Transfer risk server actions. Every button on the assessment form saves the form first, then acts.
import { redirect } from "next/navigation";
import { requireClient, audit, canApprove, send, type User } from "./auth";
import { q, one } from "./db";
import { str, all, flash } from "./form";
import { storeFile } from "./files";
import { documentText } from "./dpia-docs";
import { draft } from "./ai";
import { answersOf } from "./data";
import { todayWAT, fmtDate } from "./rules";
import { assess, addMonths, mechanismLabel, CATEGORIES, SCHEDULE5, DOCS } from "./tia-model";
import { loadTia, tiaCopilotRun, tiaNarrative, logEvent, type TiaCopilot } from "./tia";

const APP = () => process.env.APP_URL ?? "http://localhost:3000";
const UUID = /^[0-9a-f-]{36}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TEXT_KEYS = ["recipient", "recipient_role", "destination", "data", "sensitive", "subjects_count", "purpose", "frequency", "systems", "subprocessors", "business_owner",
  "mechanism", "mechanism_notes", "adequacy_decision", "consent_obtained", "override_rating", "override_reason", "narrative", "residual_acceptance",
  ...CATEGORIES.flatMap((c) => [`c_${c.key}`, `cr_${c.key}`, `cn_${c.key}`]), ...SCHEDULE5.flatMap((f) => [`s5_${f.key}`, `s5n_${f.key}`])];
const CHECK_KEYS = ["high_risk"];
const PRIORITY = ["High", "Medium", "Low"];

const contacts = (clientId: string) => q<{ email: string }>("select email from client_contacts where client_id = $1 and status = 'active'", [clientId]);

/** Save the form: answers, linked activities, documents and the mitigation plan. Returns the context for the next action. */
async function persist(fd: FormData) {
  const id = str(fd, "id");
  const a = UUID.test(id) ? await one("select * from assessments where id = $1 and kind = 'tia'", [id]) : null;
  if (!a) redirect("/forbidden");
  const { user, client } = await requireClient(a.client_id, { write: true });
  const back = `/app/clients/${a.client_id}/assessments/tia/${a.id}`;
  const before = a.answers as Record<string, string>;
  const answers: Record<string, string> = { ...before };
  for (const k of TEXT_KEYS) if (fd.has(k)) answers[k] = str(fd, k);
  for (const k of CHECK_KEYS) answers[k] = fd.get(k) === "on" ? "yes" : "";
  if (answers.override_rating && !answers.override_reason) redirect(flash(back, "Give a reason for overriding the rating.", "error"));
  const own = new Set((await q<{ id: string }>("select id from ropa_entries where client_id = $1", [a.client_id])).map((r) => r.id));
  const ropaIds = fd.has("ropa_present") ? all(fd, "ropa_ids").filter((x) => own.has(x)) : (a.ropa_ids ?? []);

  let uploaded = 0;
  for (let i = 0; i < DOCS.length; i++) {
    if (fd.has(`ev_status_${i}`)) {
      const st = ["outstanding", "received", "not_applicable"].includes(str(fd, `ev_status_${i}`)) ? str(fd, `ev_status_${i}`) : "outstanding";
      await q(`insert into tpra_evidence (assessment_id, item, status) values ($1,$2,$3) on conflict (assessment_id, item) do update set status = excluded.status`, [a.id, i, st]);
    }
    for (const f of fd.getAll(`ev_file_${i}`)) {
      if (!(f instanceof File) || !f.size) continue;
      const up = await storeFile(user, client as { id: string; firm_id: string }, f, null);
      if ("error" in up) redirect(flash(back, `Saved, but a file failed to upload: ${up.error}`, "error"));
      await q("update files set assessment_id = $2, evidence_item = $3, text_content = $4 where id = $1", [up.id, a.id, i, (await documentText(f)) || null]);
      await q(`insert into tpra_evidence (assessment_id, item, status) values ($1,$2,'received') on conflict (assessment_id, item) do update set status = 'received'`, [a.id, i]);
      uploaded++;
    }
  }

  // Mitigation plan: action, risk addressed, owner, priority, deadline, status.
  const row = (p: string) => [str(fd, `${p}action`), str(fd, `${p}gap`) || "General", str(fd, `${p}owner`) || null, DATE.test(str(fd, `${p}deadline`)) ? str(fd, `${p}deadline`) : null,
    ["open", "in_progress", "done"].includes(str(fd, `${p}status`)) ? str(fd, `${p}status`) : "open", PRIORITY.includes(str(fd, `${p}priority`)) ? str(fd, `${p}priority`) : "Medium"] as const;
  for (const t of await q<{ id: string }>("select id from tpra_tasks where assessment_id = $1", [a.id])) {
    const p = `t_${t.id}_`;
    if (!fd.has(`${p}action`)) continue;
    if (fd.get(`${p}del`) === "on" || !str(fd, `${p}action`)) { await q("delete from tpra_tasks where id = $1", [t.id]); continue; }
    const [action, gap, owner, deadline, status, priority] = row(p);
    await q("update tpra_tasks set action = $2, gap = $3, owner = $4, deadline = $5, status = $6, priority = $7 where id = $1", [t.id, action, gap, owner, deadline, status, priority]);
  }
  for (let n = 0; n < 3; n++) {
    const p = `tn_${n}_`;
    if (!str(fd, `${p}action`)) continue;
    const [action, gap, owner, deadline, status, priority] = row(p);
    await q("insert into tpra_tasks (assessment_id, action, gap, owner, deadline, status, priority) values ($1,$2,$3,$4,$5,$6,$7)", [a.id, action, gap, owner, deadline, status, priority]);
  }

  const r = assess(answers);
  const keys = TEXT_KEYS.concat(CHECK_KEYS);
  const changed = JSON.stringify(keys.map((k) => answers[k] ?? "")) !== JSON.stringify(keys.map((k) => before[k] ?? "")) || uploaded > 0
    || JSON.stringify([...ropaIds].sort()) !== JSON.stringify([...(a.ropa_ids ?? [])].sort());
  const reopen = a.status === "approved" && changed;
  const title = [answers.recipient, answers.destination].filter((x) => x?.trim()).join(" · ") || a.title;
  await q(`update assessments set answers = $2, rating = $3, ropa_ids = $4::uuid[], title = $5, likelihood = null, impact = null, updated_at = now()
      ${reopen ? ", status = 'draft', approved_by = null, approved_at = null, client_signed_at = null, client_signed_name = null, client_signed_by = null, client_signed_sha = null" : ""} where id = $1`,
    [a.id, JSON.stringify(answers), r.rating, ropaIds, title]);
  if (a.status === "approved" && ((before.destination ?? "") !== (answers.destination ?? "") || (before.mechanism ?? "") !== (answers.mechanism ?? ""))) await logEvent(a.id, user.name, "Destination or transfer mechanism changed: reassessment triggered");
  if (reopen) await logEvent(a.id, user.name, "Edited after approval: back to draft");
  await audit(user, "update", "assessment_tia", a.id, { client_id: a.client_id });
  return { a: { ...a, answers } as Record<string, any>, user, client, back, r, uploaded, reopen };
}

const saved = (c: { uploaded: number; reopen: boolean }) => `Saved${c.uploaded ? ` with ${c.uploaded} file${c.uploaded > 1 ? "s" : ""}` : ""}.${c.reopen ? " It's back to draft and needs approving again." : ""}`;

export async function saveTia(fd: FormData) {
  const c = await persist(fd);
  redirect(flash(c.back, saved(c)));
}

export async function approveTia(fd: FormData) {
  const { a, user, back, r } = await persist(fd);
  if (!canApprove(user)) redirect(flash(back, "Only a Lead Consultant or Firm Admin can approve.", "error"));
  if (!r.mechanism) redirect(flash(back, "Record the transfer mechanism relied on (Transfer details) before approving.", "error"));
  if (!r.rating || !r.residualRating) redirect(flash(back, "Rate all eight risk categories, inherent and residual, before approving.", "error"));
  const tasks = (await one<{ n: number }>("select count(*)::int as n from tpra_tasks where assessment_id = $1", [a.id]))!.n;
  if ((r.rating === "High" || r.rating === "Critical") && !tasks) redirect(flash(back, `A ${r.rating} transfer needs a mitigation plan before approval.`, "error"));
  const next = r.reviewMonths ? addMonths(todayWAT(), r.reviewMonths) : null;
  await q("update assessments set status = 'approved', approved_by = $2, approved_at = now(), outcome = $3, next_review = $4 where id = $1", [a.id, user.id, r.action, next]);
  // Automation: mark each linked RoPA activity as transferring abroad, with the safeguard relied on.
  for (const e of await q<{ id: string; transfer_safeguard: string | null }>("select id, transfer_safeguard from ropa_entries where id = any($1::uuid[])", [a.ropa_ids ?? []]))
    await q("update ropa_entries set has_transfer = true, transfer_safeguard = coalesce(nullif(transfer_safeguard, ''), $2), updated_at = now() where id = $1", [e.id, `${mechanismLabel(a.answers.mechanism)} (${a.answers.destination || "destination recorded in the transfer assessment"})`]);
  await logEvent(a.id, user.name, `Approved: inherent ${r.rating}, residual ${r.residualRating}; ${r.action}${next ? `; next review ${fmtDate(next)}` : ""}`);
  await audit(user, "approve", "assessment_tia", a.id, { client_id: a.client_id, details: { rating: r.rating, residual: r.residualRating } });
  for (const c of await contacts(a.client_id))
    await send("email", c.email, "tia_signoff", `A cross-border transfer risk assessment is ready for management approval of the residual risk. Log in to review and sign it: ${APP()}/portal/transfers/${a.id}`);
  redirect(flash(back, `Approved: inherent ${r.rating}, residual ${r.residualRating}. The client has been asked to approve the residual risk in the portal.`));
}

export async function requestTiaDocs(fd: FormData) {
  const c = await persist(fd);
  await q("update assessments set evidence_requested_at = now() where id = $1", [c.a.id]);
  const to = await contacts(c.a.client_id);
  for (const x of to) await send("email", x.email, "tia_evidence", `Your DPCO has asked for documents about a transfer of personal data outside Nigeria. Log in to upload them: ${APP()}/portal/transfers/${c.a.id}`);
  await logEvent(c.a.id, c.user.name, "Documents requested from the client");
  redirect(flash(c.back, to.length ? `${saved(c)} Documents requested: the client sees the checklist under Transfers in the portal.` : `${saved(c)} The request is in the portal, but the client has no active contact to email.`));
}

export async function tiaCopilot(fd: FormData) {
  const c = await persist(fd);
  const d = (await loadTia(c.a.id))!;
  const ans = await answersOf(c.a.client_id);
  const g = await tiaCopilotRun(c.user as User, c.a.client_id, { org: String(ans.org_legal_name || c.client.name), sector: String(ans.org_sector ?? ""), answers: d.a.answers, docs: d.docs, files: d.files });
  await q("update assessments set answers = answers || $2::jsonb where id = $1", [c.a.id, JSON.stringify({ copilot: JSON.stringify(g) })]);
  redirect(flash(c.back, "Copilot assessment done: suggestions are shown under each stage. Nothing was changed: use the suggestions, check them, then save."));
}

export async function tiaAddMeasures(fd: FormData) {
  const c = await persist(fd);
  let g: TiaCopilot | null = null;
  try { g = JSON.parse(c.a.answers.copilot || "null"); } catch { /* none */ }
  if (!g?.mitigations?.length) redirect(flash(c.back, "Run the copilot first.", "error"));
  const have = new Set((await q<{ a: string }>("select lower(coalesce(action, '')) as a from tpra_tasks where assessment_id = $1", [c.a.id])).map((x) => x.a));
  let n = 0;
  for (const m of g.mitigations) {
    if (have.has(m.action.toLowerCase())) continue;
    await q("insert into tpra_tasks (assessment_id, action, gap, owner, priority, status) values ($1,$2,$3,$4,$5,'open')", [c.a.id, m.action, m.risk || "General", m.owner || null, m.priority]);
    n++;
  }
  redirect(flash(c.back, n ? `${n} suggested measure${n > 1 ? "s" : ""} added to the mitigation plan. Add owners and deadlines.` : "The suggested measures are already in the plan."));
}

export async function tiaNarrativeAction(fd: FormData) {
  const c = await persist(fd);
  const ans = await answersOf(c.a.client_id);
  const base = tiaNarrative(String(ans.org_legal_name || c.client.name), c.a.answers);
  if (!base) redirect(flash(c.back, "Rate the eight categories first; the narrative is drafted from them.", "error"));
  let text = base;
  try { text = await draft(c.user as User, c.a.client_id, "Cross-border data transfer risk assessment summary (one paragraph)", base, { destination: c.a.answers.destination, recipient: c.a.answers.recipient, rating: c.r.rating }); } catch { /* keep the template */ }
  await q("update assessments set answers = answers || $2::jsonb where id = $1", [c.a.id, JSON.stringify({ narrative: text })]);
  redirect(flash(c.back, "Summary drafted under Rating. Check and edit it."));
}

export async function tiaReassess(fd: FormData) {
  const c = await persist(fd);
  const why = ["Scheduled review", "New destination or recipient", "Mechanism changed", "Change in destination law", "Reported breach", "Other"].includes(str(fd, "reassess_reason")) ? str(fd, "reassess_reason") : "Other";
  await q(`update assessments set status = 'draft', approved_by = null, approved_at = null, client_signed_at = null, client_signed_name = null, client_signed_by = null, client_signed_sha = null,
    evidence_requested_at = null, updated_at = now() where id = $1`, [c.a.id]);
  await logEvent(c.a.id, c.user.name, `Reassessment started: ${why}`);
  redirect(flash(c.back, "Reassessment started. Ratings are kept for you to update."));
}

// ---------- Register: new transfer ----------

export async function createTia(fd: FormData) {
  const { user, client } = await requireClient(str(fd, "client_id"), { write: true });
  const base = `/app/clients/${client.id}/assessments/tia`;
  const recipient = str(fd, "recipient"), destination = str(fd, "destination"), year = Number(str(fd, "year"));
  if (!recipient || !destination || !Number.isInteger(year) || year < 2019 || year > 2100) redirect(flash(base, "Enter the recipient, the destination country and a four-digit year.", "error"));
  const own = new Set((await q<{ id: string }>("select id from ropa_entries where client_id = $1", [client.id])).map((r) => r.id));
  const ids = all(fd, "ropa_ids").filter((x) => own.has(x));
  const ropa = ids.length ? await q<{ purpose: string; data_categories: string | null; data_subjects: string | null; involves_sensitive: boolean; transfer_safeguard: string | null; department: string | null; system_owner: string | null }>(
    "select purpose, data_categories, data_subjects, involves_sensitive, transfer_safeguard, department, system_owner from ropa_entries where id = any($1::uuid[])", [ids]) : [];
  const ans = await answersOf(client.id);
  const sg = ropa.map((r) => r.transfer_safeguard ?? "").join(" ").toLowerCase();
  const answers: Record<string, string> = {
    recipient, destination, recipient_role: "Data processor",
    purpose: str(fd, "purpose") || ropa.map((r) => r.purpose).join("; "),
    data: ropa.map((r) => r.data_categories).filter(Boolean).join("; "),
    sensitive: ropa.some((r) => r.involves_sensitive) ? "Yes" : ropa.length ? "No" : "",
    subjects_count: String(ans.subjects_6mo ?? ""),
    systems: ropa.map((r) => r.system_owner).filter(Boolean).join("; "),
    business_owner: ropa.map((r) => r.department).filter(Boolean).join(", "),
    mechanism: /standard contractual|scc/.test(sg) ? "scc" : /binding corporate|bcr/.test(sg) ? "bcr" : /adequa/.test(sg) ? "adequacy" : /consent/.test(sg) ? "consent" : "",
    mechanism_notes: ropa.map((r) => r.transfer_safeguard).filter(Boolean).join("; "),
  };
  const r = await one("insert into assessments (firm_id, client_id, kind, title, assessment_year, ropa_entry_id, ropa_ids, answers, created_by) values ($1,$2,'tia',$3,$4,$5,$6::uuid[],$7,$8) returning id",
    [client.firm_id, client.id, `${recipient} · ${destination}`, year, ids[0] ?? null, ids, JSON.stringify(answers), user.id]);
  await logEvent(r!.id, user.name, "Transfer added to the register");
  await audit(user, "create", "assessment_tia", r!.id, { client_id: client.id });
  redirect(flash(`${base}/${r!.id}`, "Transfer added. Work through the stages; the rating calculates as you go."));
}
