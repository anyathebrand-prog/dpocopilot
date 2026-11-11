"use server";
// Third-party risk (TPRA) server actions. Every button on the assessment form saves the form first, then acts.
import { redirect } from "next/navigation";
import ExcelJS from "exceljs";
import { requireClient, audit, canApprove, send, type User } from "./auth";
import { q, one } from "./db";
import { str, all, flash } from "./form";
import { storeFile } from "./files";
import { documentText } from "./dpia-docs";
import { draft } from "./ai";
import { answersOf } from "./data";
import { parseCSV, todayWAT, fmtDate } from "./rules";
import { asModel, score, KNOCKOUTS, DPA_CLAUSES, FACTORS, DOMAINS, EVIDENCE, addMonths, type Model } from "./tpra-model";
import { firmModel, loadTpra, evidenceState, gapAnalysis, narrative, logEvent } from "./tpra";

const APP = () => process.env.APP_URL ?? "http://localhost:3000";
const UUID = /^[0-9a-f-]{36}$/;
const TEXT_KEYS = ["vendor", "service", "role", "dcpmi", "location", "leaves_nigeria", "dpo_contact", "business_owner", "subprocessors", "data", "contract",
  "override_rating", "override_reason", "narrative", "dpa_status", "breach_hours", "conditions",
  ...FACTORS.map((f) => `f_${f.key}`), ...DOMAINS.flatMap((d) => [`d_${d.key}`, `dn_${d.key}`])];
const CHECK_KEYS = [...KNOCKOUTS.map((k) => `ko_${k.key}`), ...DPA_CLAUSES.map((c) => `dpa_${c.key}`), "high_risk"];

async function contacts(clientId: string) {
  return q<{ email: string }>("select email from client_contacts where client_id = $1 and status = 'active'", [clientId]);
}

/** Save the form: answers, scores, linked activities, evidence and tasks. Returns the context for the follow-up action. */
async function persist(fd: FormData) {
  const id = str(fd, "id");
  const a = UUID.test(id) ? await one("select * from assessments where id = $1 and kind = 'tpra'", [id]) : null;
  if (!a) redirect("/forbidden");
  const { user, client } = await requireClient(a.client_id, { write: true });
  const back = `/app/clients/${a.client_id}/assessments/tpra/${a.id}`;
  const model: Model = a.model ? asModel(a.model) : await firmModel(a.firm_id);
  const before = a.answers as Record<string, string>;
  const answers: Record<string, string> = { ...before };
  for (const k of TEXT_KEYS) if (fd.has(k)) answers[k] = str(fd, k);
  for (const k of CHECK_KEYS) answers[k] = fd.get(k) === "on" ? "yes" : "";
  if (answers.override_rating && !answers.override_reason) redirect(flash(back, "Give a reason for overriding the rating.", "error"));
  const own = new Set((await q<{ id: string }>("select id from ropa_entries where client_id = $1", [a.client_id])).map((r) => r.id));
  const ropaIds = all(fd, "ropa_ids").filter((x) => own.has(x));

  // Evidence: status, verdict, expiry and files per checklist item.
  let uploaded = 0;
  for (const e of EVIDENCE.map((_, i) => i)) {
    if (fd.has(`ev_status_${e}`)) {
      const st = ["outstanding", "received", "not_applicable"].includes(str(fd, `ev_status_${e}`)) ? str(fd, `ev_status_${e}`) : "outstanding";
      const vd = ["accepted", "insufficient"].includes(str(fd, `ev_verdict_${e}`)) ? str(fd, `ev_verdict_${e}`) : null;
      const ex = /^\d{4}-\d{2}-\d{2}$/.test(str(fd, `ev_exp_${e}`)) ? str(fd, `ev_exp_${e}`) : null;
      await q(`insert into tpra_evidence (assessment_id, item, status, verdict, expires_on) values ($1,$2,$3,$4,$5)
        on conflict (assessment_id, item) do update set status = excluded.status, verdict = excluded.verdict, expires_on = excluded.expires_on`, [a.id, e, st, vd, ex]);
    }
    for (const f of fd.getAll(`ev_file_${e}`)) {
      if (!(f instanceof File) || !f.size) continue;
      const up = await storeFile(user, client as { id: string; firm_id: string }, f, null);
      if ("error" in up) redirect(flash(back, `Saved, but a file failed to upload: ${up.error}`, "error"));
      await q("update files set assessment_id = $2, evidence_item = $3, text_content = $4 where id = $1", [up.id, a.id, e, (await documentText(f)) || null]);
      await q(`insert into tpra_evidence (assessment_id, item, status) values ($1,$2,'received') on conflict (assessment_id, item) do update set status = 'received'`, [a.id, e]);
      uploaded++;
    }
  }

  // Remediation tasks: edit or remove existing rows, add filled new rows.
  for (const t of await q<{ id: string }>("select id from tpra_tasks where assessment_id = $1", [a.id])) {
    const p = `t_${t.id}_`;
    if (!fd.has(`${p}gap`)) continue;
    if (fd.get(`${p}del`) === "on" || !str(fd, `${p}gap`)) { await q("delete from tpra_tasks where id = $1", [t.id]); continue; }
    await q("update tpra_tasks set gap = $2, action = $3, owner = $4, deadline = $5, status = $6 where id = $1",
      [t.id, str(fd, `${p}gap`), str(fd, `${p}action`) || null, str(fd, `${p}owner`) || null, /^\d{4}-\d{2}-\d{2}$/.test(str(fd, `${p}deadline`)) ? str(fd, `${p}deadline`) : null, ["open", "in_progress", "done"].includes(str(fd, `${p}status`)) ? str(fd, `${p}status`) : "open"]);
  }
  for (let n = 0; n < 3; n++) {
    const p = `tn_${n}_`;
    if (!str(fd, `${p}gap`)) continue;
    await q("insert into tpra_tasks (assessment_id, gap, action, owner, deadline, status) values ($1,$2,$3,$4,$5,$6)",
      [a.id, str(fd, `${p}gap`), str(fd, `${p}action`) || null, str(fd, `${p}owner`) || null, /^\d{4}-\d{2}-\d{2}$/.test(str(fd, `${p}deadline`)) ? str(fd, `${p}deadline`) : null, ["open", "in_progress", "done"].includes(str(fd, `${p}status`)) ? str(fd, `${p}status`) : "open"]);
  }

  const r = score(answers, model);
  const changed = JSON.stringify(TEXT_KEYS.concat(CHECK_KEYS).map((k) => answers[k] ?? "")) !== JSON.stringify(TEXT_KEYS.concat(CHECK_KEYS).map((k) => before[k] ?? ""))
    || JSON.stringify([...ropaIds].sort()) !== JSON.stringify([...(a.ropa_ids ?? [])].sort()) || uploaded > 0;
  const reopen = a.status === "approved" && changed;
  await q(`update assessments set answers = $2, likelihood = $3, impact = $4, rating = $5, residual = $6, ropa_ids = $7::uuid[], model = $8, title = $9, updated_at = now()
      ${reopen ? ", status = 'draft', approved_by = null, approved_at = null, client_signed_at = null, client_signed_name = null, client_signed_by = null, client_signed_sha = null" : ""} where id = $1`,
    [a.id, JSON.stringify(answers), r.likelihood, r.impact, r.rating, r.residual, ropaIds, JSON.stringify(model), answers.vendor || a.title]);
  if (a.status === "approved" && (before.subprocessors ?? "") !== (answers.subprocessors ?? "")) await logEvent(a.id, user.name, "Sub-processors changed: reassessment triggered");
  if (reopen) await logEvent(a.id, user.name, "Edited after approval: back to draft");
  await audit(user, "update", "assessment_tpra", a.id, { client_id: a.client_id });
  return { a: { ...a, answers, model } as Record<string, any>, user, client, back, model, r, uploaded, reopen };
}

const saved = (c: { uploaded: number; reopen: boolean }) => `Saved${c.uploaded ? ` with ${c.uploaded} file${c.uploaded > 1 ? "s" : ""}` : ""}.${c.reopen ? " It's back to draft and needs approving again." : ""}`;

export async function saveTpra(fd: FormData) {
  const c = await persist(fd);
  redirect(flash(c.back, saved(c)));
}

export async function approveTpra(fd: FormData) {
  const { a, user, back, model, r } = await persist(fd);
  if (!canApprove(user)) redirect(flash(back, "Only a Lead Consultant or Firm Admin can approve.", "error"));
  if (!r.rating) redirect(flash(back, "Score all six impact factors and all six control domains before approving.", "error"));
  if (r.rating === "High" && !(a.answers.conditions ?? "").trim()) redirect(flash(back, "A High rating needs conditions of approval (Treatment).", "error"));
  const months = model.review_months[r.rating];
  const next = months ? addMonths(todayWAT(), months) : null;
  await q("update assessments set status = 'approved', approved_by = $2, approved_at = now(), outcome = $3, next_review = $4 where id = $1", [a.id, user.id, r.decision, next]);
  // Automation: name the processor on each linked RoPA activity.
  const name = (a.answers.vendor ?? "").trim();
  if (name) for (const e of await q<{ id: string; recipients: string | null }>("select id, recipients from ropa_entries where id = any($1::uuid[])", [a.ropa_ids ?? []])) {
    if ((e.recipients ?? "").toLowerCase().includes(name.toLowerCase())) continue;
    await q("update ropa_entries set recipients = $2, updated_at = now() where id = $1", [e.id, [e.recipients?.trim(), `${name} (processor)`].filter(Boolean).join("; ")]);
  }
  await logEvent(a.id, user.name, `Approved: ${r.rating}, ${r.decision}${next ? `; next review ${fmtDate(next)}` : ""}`);
  await audit(user, "approve", "assessment_tpra", a.id, { client_id: a.client_id, details: { rating: r.rating } });
  for (const c of await contacts(a.client_id))
    await send("email", c.email, "tpra_signoff", `A processor risk assessment is ready for your sign-off. Log in to review and sign it: ${APP()}/portal/processors/${a.id}`);
  redirect(flash(back, `Approved as ${r.rating}. The client has been asked to sign off in the portal.`));
}

export async function requestTpraEvidence(fd: FormData) {
  const c = await persist(fd);
  await q("update assessments set evidence_requested_at = now() where id = $1", [c.a.id]);
  const list = await contacts(c.a.client_id);
  for (const x of list) await send("email", x.email, "tpra_evidence", `Your DPCO has asked for documents about one of your data processors. Log in to upload them: ${APP()}/portal/processors/${c.a.id}`);
  await logEvent(c.a.id, c.user.name, `Evidence requested from the client (Impact ${c.r.tier} checklist)`);
  redirect(flash(c.back, list.length ? `${saved(c)} Evidence requested: the client sees the checklist under Processors in the portal.` : `${saved(c)} The request is in the portal, but the client has no active contact to email.`));
}

export async function tpraCopilot(fd: FormData) {
  const c = await persist(fd);
  const d = (await loadTpra(c.a.id))!;
  const ev = evidenceState(d.a, d.rows, d.files, todayWAT());
  const ans = await answersOf(c.a.client_id);
  const g = await gapAnalysis(c.user as User, c.a.client_id, { client: String(ans.org_legal_name || c.client.name), sector: String(ans.sector ?? ""), answers: d.a.answers, model: c.model, files: d.files, ev, ropa: d.ropa.map((x) => x.purpose) });
  await q("update assessments set answers = answers || $2::jsonb where id = $1", [c.a.id, JSON.stringify({ copilot: JSON.stringify(g) })]);
  redirect(flash(c.back, `Gap analysis done: suggested scores are under each control domain${g.knockouts.length ? `, and ${g.knockouts.length} possible knock-out${g.knockouts.length > 1 ? "s" : ""} to check` : ""}. Nothing was changed: use the suggestions, check them, then save.`));
}

export async function tpraNarrative(fd: FormData) {
  const c = await persist(fd);
  const ans = await answersOf(c.a.client_id);
  const org = String(ans.org_legal_name || c.client.name);
  const base = narrative(org, c.a.answers, c.model);
  if (!base) redirect(flash(c.back, "Score the factors and domains first; the narrative is drafted from them.", "error"));
  let text = base;
  try { text = await draft(c.user as User, c.a.client_id, "Third-party processor risk assessment narrative (one paragraph)", base, { processor: c.a.answers.vendor, service: c.a.answers.service, rating: c.r.rating }); } catch { /* keep the template */ }
  await q("update assessments set answers = answers || $2::jsonb where id = $1", [c.a.id, JSON.stringify({ narrative: text })]);
  redirect(flash(c.back, "Narrative drafted under Rating. Check and edit it."));
}

export async function tpraReassess(fd: FormData) {
  const c = await persist(fd);
  const why = ["Scheduled review", "Scope change", "Reported breach", "New sub-processors", "Expired evidence", "Other"].includes(str(fd, "reassess_reason")) ? str(fd, "reassess_reason") : "Other";
  await q(`update assessments set status = 'draft', approved_by = null, approved_at = null, client_signed_at = null, client_signed_name = null, client_signed_by = null, client_signed_sha = null,
    evidence_requested_at = null, model = $2, updated_at = now() where id = $1`, [c.a.id, JSON.stringify(await firmModel(c.a.firm_id))]);
  await logEvent(c.a.id, c.user.name, `Reassessment started: ${why}`);
  redirect(flash(c.back, "Reassessment started. Scores are kept for you to update; it uses the firm's current risk model."));
}

// ---------- Register: new processor and import ----------

async function newProcessor(user: User, client: { id: string; firm_id: string }, year: number, p: { name: string; service?: string; location?: string; dpo?: string; subs?: string }, ropaIds: string[], model: Model) {
  const ropa = ropaIds.length ? await q<{ purpose: string; data_categories: string | null; data_subjects: string | null; involves_sensitive: boolean; has_transfer: boolean; transfer_safeguard: string | null; department: string | null }>(
    "select purpose, data_categories, data_subjects, involves_sensitive, has_transfer, transfer_safeguard, department from ropa_entries where id = any($1::uuid[]) and client_id = $2", [ropaIds, client.id]) : [];
  const sensitive = ropa.some((r) => r.involves_sensitive), transfer = ropa.some((r) => r.has_transfer);
  const answers: Record<string, string> = {
    vendor: p.name, service: p.service ?? (ropa.length ? `Supports ${ropa.map((r) => r.purpose.toLowerCase()).join("; ")}.` : ""), role: "Data processor",
    location: p.location ?? "", leaves_nigeria: transfer ? "Yes" : p.location && !/nigeria/i.test(p.location) ? "Yes" : p.location ? "No" : "",
    dpo_contact: p.dpo ?? "", subprocessors: p.subs ?? "", business_owner: ropa.map((r) => r.department).filter(Boolean).join(", "),
    data: ropa.map((r) => `${r.data_categories ?? "Data"} about ${r.data_subjects ?? "data subjects"}`).join("; "),
    f_sensitivity: sensitive ? "3" : "", f_location: transfer ? (ropa.some((r) => r.has_transfer && !r.transfer_safeguard) ? "3" : "2") : ropa.length ? "1" : "",
    breach_hours: String(model.breach_hours),
  };
  const r = await one("insert into assessments (firm_id, client_id, kind, title, assessment_year, ropa_entry_id, ropa_ids, answers, model, created_by) values ($1,$2,'tpra',$3,$4,$5,$6::uuid[],$7,$8,$9) returning id",
    [client.firm_id, client.id, p.name, year, ropaIds[0] ?? null, ropaIds, JSON.stringify(answers), JSON.stringify(model), user.id]);
  await logEvent(r!.id, user.name, "Processor added (intake)");
  await audit(user, "create", "assessment_tpra", r!.id, { client_id: client.id });
  return r!.id as string;
}

export async function createTpra(fd: FormData) {
  const { user, client } = await requireClient(str(fd, "client_id"), { write: true });
  const base = `/app/clients/${client.id}/assessments/tpra`;
  const name = str(fd, "name"), year = Number(str(fd, "year"));
  if (!name || !Number.isInteger(year) || year < 2019 || year > 2100) redirect(flash(base, "Enter the processor's name and a four-digit year.", "error"));
  const own = new Set((await q<{ id: string }>("select id from ropa_entries where client_id = $1", [client.id])).map((r) => r.id));
  const id = await newProcessor(user, client as { id: string; firm_id: string }, year, { name, service: str(fd, "service") || undefined, location: str(fd, "location") || undefined },
    all(fd, "ropa_ids").filter((x) => own.has(x)), await firmModel(client.firm_id));
  redirect(flash(`${base}/${id}`, "Processor added. Work through the stages; the rating calculates as you score."));
}

export async function importTpra(fd: FormData) {
  const { user, client } = await requireClient(str(fd, "client_id"), { write: true });
  const base = `/app/clients/${client.id}/assessments/tpra`;
  const f = fd.get("file");
  if (!(f instanceof File) || !f.size) redirect(flash(base, "Choose a CSV or Excel file.", "error"));
  let rows: string[][] = [];
  if (/\.xlsx$/i.test(f.name)) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(Buffer.from(await f.arrayBuffer()) as unknown as ArrayBuffer);
    wb.worksheets[0]?.eachRow((row) => rows.push((row.values as unknown[]).slice(1).map((v) => (v == null ? "" : typeof v === "object" && "text" in (v as object) ? String((v as { text: unknown }).text) : String(v)))));
  } else if (/\.csv$/i.test(f.name)) rows = parseCSV(await f.text());
  else redirect(flash(base, "Use a .csv or .xlsx file.", "error"));
  const head = (rows.shift() ?? []).map((h) => h.trim().toLowerCase());
  const col = (re: RegExp) => head.findIndex((h) => re.test(h));
  const ci = { name: col(/processor|vendor|name|supplier|third/), service: col(/service|purpose/), location: col(/country|host|location|region/), dpo: col(/dpo|contact/), subs: col(/sub/) };
  if (ci.name < 0) redirect(flash(base, "The first row needs a column called Processor (or Vendor, or Name).", "error"));
  const model = await firmModel(client.firm_id), year = new Date().getFullYear();
  const have = new Set((await q<{ n: string }>("select lower(answers->>'vendor') as n from assessments where client_id = $1 and kind = 'tpra'", [client.id])).map((r) => r.n));
  let n = 0, skipped = 0;
  for (const r of rows.slice(0, 500)) {
    const name = (r[ci.name] ?? "").trim();
    if (!name) continue;
    if (have.has(name.toLowerCase())) { skipped++; continue; }
    const g = (i: number) => (i >= 0 ? (r[i] ?? "").trim() || undefined : undefined);
    await newProcessor(user, client as { id: string; firm_id: string }, year, { name, service: g(ci.service), location: g(ci.location), dpo: g(ci.dpo), subs: g(ci.subs) }, [], model);
    have.add(name.toLowerCase()); n++;
  }
  redirect(flash(base, `Imported ${n} processor${n === 1 ? "" : "s"}${skipped ? `; ${skipped} already in the register were skipped` : ""}.`));
}
