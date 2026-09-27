"use server";
import { redirect } from "next/navigation";
import { q, one, tx } from "./db";
import { requireClient, canApprove, audit, send } from "./auth";
import { getVersion, loadCtx } from "./data";
import { draft } from "./ai";
import { policy, breachNotice, dsarResponse, dpiaStep, TEMPLATE_TITLES, NDPA_REFS, type DpiaBody } from "./templates";
import { flash, back as backOf, str } from "./form";

// Review, approval and sign-off flow shared by DPIAs, documents, breach notifications and DSAR responses (F14).
// Every action re-checks access against the version's client (FR1.4).

async function load(fd: FormData, write = true) {
  const v = await getVersion(str(fd, "id"));
  if (!v) redirect("/forbidden");
  const { user, client } = await requireClient(v.client_id, { write });
  return { v, user, client, back: backOf(fd) };
}

const done = (back: string, msg: string): never => redirect(flash(back, msg));

export async function saveBody(fd: FormData) {
  const { v, user, back } = await load(fd);
  if (v.status !== "draft") redirect(flash(back, "This version is locked. Create a new version to edit.", "error"));
  await q("update content_versions set body = $2 where id = $1 and status = 'draft'", [v.id, str(fd, "body")]);
  await audit(user, "update", v.parent_type, v.parent_id, { client_id: v.client_id, details: { version: v.version_no } });
  done(back, "Draft saved");
}

export async function submitForReview(fd: FormData) {
  const { v, user, back } = await load(fd);
  if (v.ai_proposal) redirect(flash(back, "Accept or discard the AI draft before sending for review.", "error"));
  const r = await q("update content_versions set status = 'in_review', submitted_by = $2, submitted_at = now() where id = $1 and status = 'draft' returning id", [v.id, user.id]);
  if (!r.length) redirect(flash(back, "Only drafts can be sent for review.", "error"));
  await audit(user, "submit_for_review", v.parent_type, v.parent_id, { client_id: v.client_id, details: { version: v.version_no } });
  done(back, "Sent for review");
}

export async function approve(fd: FormData) {
  const { v, user, back } = await load(fd);
  if (!canApprove(user)) redirect(flash(back, "Only a Lead Consultant or Firm Admin can approve.", "error"));
  const r = await q("update content_versions set status = 'approved', approved_by = $2, approved_at = now() where id = $1 and status = 'in_review' returning id", [v.id, user.id]);
  if (!r.length) {
    const now = await getVersion(v.id);
    redirect(flash(back, now?.approved_by_name ? `Already approved by ${now.approved_by_name}` : "Only items in review can be approved.", "error"));
  }
  await audit(user, "approve", v.parent_type, v.parent_id, { client_id: v.client_id, details: { version: v.version_no } });
  done(back, "Approved");
}

/** FLAG-3 default: a reviewer can send an item back to draft. */
export async function returnToDraft(fd: FormData) {
  const { v, user, back } = await load(fd);
  if (!canApprove(user)) redirect(flash(back, "Only a Lead Consultant or Firm Admin can send items back.", "error"));
  await q("update content_versions set status = 'draft', submitted_by = null, submitted_at = null where id = $1 and status = 'in_review'", [v.id]);
  await audit(user, "update", v.parent_type, v.parent_id, { client_id: v.client_id, details: { version: v.version_no, returned_to_draft: true } });
  done(back, "Sent back to draft");
}

/** FR5.3 / FR14.4: editing an approved or signed version creates a new draft; pending sign-offs are cancelled. */
export async function newVersion(fd: FormData) {
  const { v, user, back } = await load(fd);
  await tx(async (t) => {
    const max = await t.query<{ n: number }>("select max(version_no)::int as n from content_versions where parent_type = $1 and parent_id = $2", [v.parent_type, v.parent_id]);
    await t.query("insert into content_versions (firm_id, client_id, parent_type, parent_id, version_no, body, ai_generated, created_by) values ($1,$2,$3,$4,$5,$6,$7,$8)",
      [v.firm_id, v.client_id, v.parent_type, v.parent_id, max.rows[0].n + 1, v.body, v.ai_generated, user.id]);
    await t.query("update signoff_requests set status = 'cancelled' where status = 'pending' and version_id in (select id from content_versions where parent_type = $1 and parent_id = $2)", [v.parent_type, v.parent_id]);
    await audit(user, "create", v.parent_type, v.parent_id, { client_id: v.client_id, details: { new_version_from: v.version_no } }, t);
  });
  done(back, "New draft version created");
}

/** C02: ask the AI gateway for a draft. It is held as a proposal until the user accepts or discards it. */
export async function aiDraft(fd: FormData) {
  const { v, user, client, back } = await load(fd);
  if (v.status !== "draft") redirect(flash(back, "AI drafting works on drafts only.", "error"));
  const step = str(fd, "step");
  let template = "", what = "", facts: object = {};
  if (v.parent_type === "document") {
    const d = await one("select template_key, title from documents where id = $1", [v.parent_id]);
    const ctx = await loadCtx(v.client_id);
    template = d?.template_key ? policy(d.template_key, ctx) : v.body; what = d?.title; facts = ctx;
  } else if (v.parent_type === "dpia") {
    const ids = (await q("select ropa_entry_id from dpia_ropa where dpia_id = $1", [v.parent_id])).map((r) => r.ropa_entry_id);
    const ctx = await loadCtx(v.client_id, ids);
    template = dpiaStep(step, ctx); what = `DPIA section: ${step}`; facts = ctx;
  } else if (v.parent_type === "breach_notification") {
    const n = await one("select bn.audience, b.* from breach_notifications bn join breaches b on b.id = bn.breach_id where bn.id = $1", [v.parent_id]);
    const ctx = await loadCtx(v.client_id);
    template = breachNotice(n!.audience, ctx.orgName, n as any); what = `breach notification to ${n!.audience}`; facts = n!;
  } else {
    const d = await one("select * from dsars where id = $1", [v.parent_id]);
    const ids = (await q("select ropa_entry_id from dsar_ropa where dsar_id = $1", [v.parent_id])).map((r) => r.ropa_entry_id);
    const ctx = await loadCtx(v.client_id, ids);
    template = dsarResponse(ctx.orgName, d as any, ctx.ropa); what = "DSAR response"; facts = { request: d, ropa: ctx.ropa };
  }
  let text: string;
  try { text = await draft(user, client.id, what, template, facts); }
  catch (e) { redirect(flash(back, (e as Error).message, "error")); }
  const proposal = v.parent_type === "dpia" ? JSON.stringify({ step, text }) : text;
  await q("update content_versions set ai_proposal = $2 where id = $1 and status = 'draft'", [v.id, proposal]);
  done(back, "AI draft ready: review it below");
}

export async function acceptAi(fd: FormData) {
  const { v, user, back } = await load(fd);
  if (!v.ai_proposal || v.status !== "draft") redirect(back);
  let body = v.ai_proposal;
  if (v.parent_type === "dpia") {
    const { step, text } = JSON.parse(v.ai_proposal);
    const b: DpiaBody = JSON.parse(v.body || "{}");
    body = JSON.stringify({ ...b, [step]: text });
  }
  await q("update content_versions set body = $2, ai_generated = true, ai_proposal = null where id = $1", [v.id, body]);
  await audit(user, "update", v.parent_type, v.parent_id, { client_id: v.client_id, details: { ai_outcome: "accepted" } });
  done(back, "AI draft accepted. It stays marked as AI draft until approved.");
}

export async function discardAi(fd: FormData) {
  const { v, user, back } = await load(fd);
  await q("update content_versions set ai_proposal = null where id = $1", [v.id]);
  await audit(user, "update", v.parent_type, v.parent_id, { client_id: v.client_id, details: { ai_outcome: "discarded" } });
  done(back, "AI draft discarded");
}

/** C05: send an approved version to client contacts for signature. */
export async function sendForSignoff(fd: FormData) {
  const { v, user, client, back } = await load(fd);
  if (!canApprove(user)) redirect(flash(back, "Only a Lead Consultant or Firm Admin can send for sign-off.", "error"));
  if (v.status !== "approved") redirect(flash(back, "Only approved versions can be sent for sign-off.", "error"));
  const contacts = await q("select email from client_contacts where client_id = $1 and status = 'active'", [client.id]);
  if (!contacts.length) redirect(flash(back, "Invite a client contact first (client settings).", "error"));
  await tx(async (t) => {
    await t.query("insert into signoff_requests (firm_id, client_id, version_id, requested_by) values ($1,$2,$3,$4)", [v.firm_id, v.client_id, v.id, user.id]);
    await t.query("update content_versions set status = 'awaiting_client_signoff' where id = $1 and status = 'approved'", [v.id]);
    await audit(user, "update", v.parent_type, v.parent_id, { client_id: v.client_id, details: { sent_for_signoff: v.version_no } }, t);
  });
  for (const c of contacts) await send("email", c.email, "signoff_request", "A document is waiting for your sign-off. Log in to view.");
  done(back, "Sent for client sign-off");
}

/** Documents (F6): generate one of the three V1 templates, pre-filled from inventory and RoPA. */
export async function generateDocument(fd: FormData) {
  const { user, client } = await requireClient(str(fd, "client_id"), { write: true });
  const key = str(fd, "template_key");
  if (!TEMPLATE_TITLES[key]) redirect("/forbidden");
  const ctx = await loadCtx(client.id);
  const id = await tx(async (t) => {
    const d = await t.query<{ id: string }>("insert into documents (firm_id, client_id, template_key, title, ndpa_refs, created_by) values ($1,$2,$3,$4,$5,$6) returning id", [client.firm_id, client.id, key, TEMPLATE_TITLES[key], NDPA_REFS[key], user.id]);
    await t.query("insert into content_versions (firm_id, client_id, parent_type, parent_id, version_no, body, created_by) values ($1,$2,'document',$3,1,$4,$5)", [client.firm_id, client.id, d.rows[0].id, policy(key, ctx), user.id]);
    await audit(user, "create", "document", d.rows[0].id, { client_id: client.id, details: { template: key } }, t);
    return d.rows[0].id;
  });
  redirect(`/app/clients/${client.id}/documents/${id}?ok=Draft+created+from+your+data+map`);
}
