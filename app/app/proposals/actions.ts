"use server";
import { redirect } from "next/navigation";
import { addSoloClient, insertClient } from "@/lib/clients";
import { ndpcBlock } from "@/lib/ndpc-guard";
import { requireFirm, audit, send } from "@/lib/auth";
import { q, one, tx } from "@/lib/db";
import { feeFor } from "@/lib/checkout";
import { sizeFor } from "@/lib/client-size";
import { countryOf } from "@/lib/country";
import { str, opt, flash } from "@/lib/form";
import { imageSize } from "@/lib/files";
import { PROPOSAL_SECTORS, TIERS, type Fin, proposalHtml, coverLetterHtml, units } from "@/lib/proposal";
import { htmlToDocx } from "@/lib/docx";
import { notifyFirm, REVIEWERS } from "@/lib/solo";
import { SERVICES, type Line } from "@/lib/invoice";
import { todayWAT } from "@/lib/rules";
import { COUNTRY, parseAmount } from "@/lib/country";

const HEX = /^#[0-9A-Fa-f]{6}$/, EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const int = (v: string, lo: number, hi: number) => (v === "" ? null : Number.isInteger(Number(v)) && Number(v) >= lo && Number(v) <= hi ? Number(v) : NaN);
const naira = (v: string) => { if (v.trim() === "") return 0; const n = parseAmount(v); return Number.isNaN(n) ? NaN : Math.round(n * 100) / 100; };

/** Create (no id) or update a proposal from the form. */
export async function saveProposal(fd: FormData) {
  const u = await requireFirm();
  const id = str(fd, "id");
  const existing = id ? await one("select * from proposals where id = $1 and firm_id = $2", [/^[0-9a-f-]{36}$/.test(id) ? id : null, u.firm_id]) : null;
  if (id && !existing) redirect("/forbidden");
  const back = existing ? `/app/proposals/${existing.id}` : "/app/proposals?new=1";
  const fail = (m: string) => redirect(flash(back, m, "error"));
  const name = str(fd, "client_name"), address = str(fd, "address"), email = str(fd, "email");
  if (!name || !address || !EMAIL.test(email)) fail("Enter the client's name, address and a valid email address.");
  if (!existing || existing.client_name !== name) { const why = await ndpcBlock(u.firm_id, name); if (why) fail(why); }
  const primary = str(fd, "primary_color"), secondary = str(fd, "secondary_color");
  if (!HEX.test(primary) || !HEX.test(secondary)) fail("Choose the client's primary and secondary colours.");
  const sector = opt(fd, "sector"), tier = str(fd, "tier") || "TBC";
  if ((sector && !PROPOSAL_SECTORS.includes(sector)) || !(tier in TIERS)) fail("Choose the sector and tier from the lists.");
  const staff = int(str(fd, "staff_count"), 0, 10_000_000), subjects = int(str(fd, "subjects_count"), 0, 1_000_000_000);
  const months = int(str(fd, "duration_months") || "12", 1, 36), validity = int(str(fd, "validity_days") || "90", 1, 365), dpias = int(str(fd, "dpias") || "5", 0, 100);
  if ([staff, subjects, months, validity, dpias].some(Number.isNaN)) fail("Check the numbers: staff, data subjects, duration (1â€“36 months), validity (1â€“365 days) and DPIAs.");

  const lines: Line[] = [];
  for (const [i, service] of SERVICES.entries()) {
    if (fd.get(`s${i}`) !== "on") continue;
    const amount = naira(str(fd, `a${i}`));
    if (!amount) fail(`Enter a fee for ${service}.`);
    lines.push({ service, description: str(fd, `d${i}`), amount });
  }
  const xs = fd.getAll("xs").map(String), xd = fd.getAll("xd").map(String), xa = fd.getAll("xa").map(String);
  for (const [k, raw] of xs.entries()) {
    const service = raw.trim().slice(0, 200);
    if (!service) continue;
    const amount = naira(xa[k] ?? "");
    if (!amount) fail(`Enter a fee for ${service}.`);
    lines.push({ service, description: (xd[k] ?? "").trim().slice(0, 500), amount });
  }
  if (!lines.length) fail("Select at least one service.");
  const fin: Fin = { dpias: dpias ?? 5 };

  let logo: { data: string; w: number; h: number } | null | undefined; // undefined = keep
  const f = fd.get("logo");
  if (f instanceof File && f.size) {
    const buf = Buffer.from(await f.arrayBuffer()), dim = imageSize(buf);
    if (!dim || f.size > 1_000_000) fail("The logo must be a PNG or JPEG under 1 MB.");
    logo = { data: `data:image/${dim!.type};base64,${buf.toString("base64")}`, w: dim!.w, h: dim!.h };
  } else if (fd.get("remove_logo") === "on") logo = null;

  const vals = [name, address, email, opt(fd, "contact_name"), opt(fd, "contact_title"), sector, primary.toUpperCase(), secondary.toUpperCase(), fd.get("vat") === "on" ? COUNTRY.vatRate : 0,
    validity ?? 90, opt(fd, "start_on"), opt(fd, "notes"), opt(fd, "payment_terms"), JSON.stringify(lines), opt(fd, "departments"), staff, subjects, tier, opt(fd, "accountable_title"), months ?? 12, JSON.stringify(fin)];
  const cols = "client_name, address, email, contact_name, contact_title, sector, primary_color, secondary_color, vat_rate, validity_days, start_on, notes, payment_terms, lines, departments, staff_count, subjects_count, tier, accountable_title, duration_months, fin";
  let pid: string;
  if (existing) {
    await q(`update proposals set ${cols.split(", ").map((c, i) => `${c} = $${i + 2}`).join(", ")}, updated_at = now() where id = $1`, [existing.id, ...vals]);
    pid = existing.id;
  } else {
    const year = todayWAT().slice(0, 4);
    const n = (await one<{ n: number }>("select count(*)::int as n from proposals where firm_id = $1 and number like $2", [u.firm_id, `PRP-${year}-%`]))!.n;
    pid = (await one<{ id: string }>(`insert into proposals (firm_id, number, created_by, ${cols}) values ($1, $2, $3, ${vals.map((_, i) => `$${i + 4}`).join(", ")}) returning id`,
      [u.firm_id, `PRP-${year}-${String(n + 1).padStart(3, "0")}`, u.id, ...vals]))!.id;
  }
  if (logo !== undefined) await q("update proposals set logo = $2, logo_w = $3, logo_h = $4 where id = $1", [pid, logo?.data ?? null, logo?.w ?? null, logo?.h ?? null]);
  if (u.plan === "solo") await q("update proposals set review_status = null where id = $1", [pid]); // a Solo DPO's edited proposal needs approval again
  await audit(u, existing ? "update" : "create", "proposal", pid, {});
  redirect(flash(`/app/proposals/${pid}`, u.plan === "solo" ? (existing ? "Proposal saved. Submit it to your DPCO for approval." : "Proposal created. Submit it to your DPCO for approval.") : existing ? "Proposal saved" : "Proposal created. Download the proposal and cover letter below."));
}

export async function setProposalStatus(fd: FormData) {
  const u = await requireFirm();
  const p = await one("select id, client_name, subjects_count, departments, sector from proposals where id = $1 and firm_id = $2", [/^[0-9a-f-]{36}$/.test(str(fd, "id")) ? str(fd, "id") : null, u.firm_id]);
  const status = str(fd, "status");
  if (!p || !["draft", "sent", "accepted", "declined"].includes(status)) redirect("/forbidden");
  await q("update proposals set status = $2, updated_at = now() where id = $1", [p.id, status]);
  await audit(u, "update", "proposal", p.id, { details: { status } });
  if (status === "accepted" && u.plan === "solo") { // a Solo DPO's accepted proposal becomes a client
    const c = await addSoloClient(u.firm_id, u.id, { name: p.client_name, subjects: p.subjects_count, departments: units(p.departments).length, sector: p.sector });
    if (c.created) await audit(u, "create", "client", c.id, { client_id: c.id, details: { from_proposal: p.id } });
    redirect(flash(`/app/clients/${c.id}`, c.created ? `Marked as accepted. ${p.client_name} is now a client.` : `Marked as accepted. ${p.client_name} was already a client.`));
  }
  redirect(flash(`/app/proposals/${p.id}`, `Marked as ${status}`));
}

/** Solo DPO: send a proposal to their DPCO for approval. */
export async function submitForReview(fd: FormData) {
  const u = await requireFirm();
  if (u.plan !== "solo" || u.dpco_status !== "approved" || !u.dpco_firm_id) redirect("/forbidden");
  const p = await one("update proposals set review_status = 'submitted', updated_at = now() where id = $1 and firm_id = $2 and (review_status is null or review_status = 'returned') returning id, number, client_name",
    [/^[0-9a-f-]{36}$/.test(str(fd, "id")) ? str(fd, "id") : null, u.firm_id]);
  if (!p) redirect("/app/proposals");
  await audit(u, "update", "proposal", p.id, { details: { review: "submitted" } });
  await notifyFirm(u.dpco_firm_id, "proposal_review", `${u.name} (${u.firm_name}) submitted proposal ${p.number} for ${p.client_name} for your approval.`, "/app/solo-dpos", REVIEWERS);
  redirect(flash(`/app/proposals/${p.id}`, `Submitted to ${u.dpco_name} for approval. You'll be notified when they respond.`));
}

/** Email the proposal and cover letter (Word) to the client. Not for Solo DPOs, who send the approved PDF themselves. */
export async function emailProposal(fd: FormData) {
  const u = await requireFirm();
  const p = await one("select * from proposals where id = $1 and firm_id = $2", [/^[0-9a-f-]{36}$/.test(str(fd, "id")) ? str(fd, "id") : null, u.firm_id]);
  if (!p) redirect("/forbidden");
  if (u.plan === "solo") redirect(flash(`/app/proposals/${p.id}`, "Download the approved PDF and send it to the client yourself.", "error")); // Solo DPOs share the approved PDF only
  const firm = (await one("select * from firms where id = $1", [u.firm_id]))!;
  const created = p.created_at instanceof Date ? p.created_at.toISOString() : String(p.created_at);
  const files = [];
  for (const [make, label] of [[proposalHtml, "Proposal"], [coverLetterHtml, "Cover letter"]] as const) {
    const r = make({ ...p, created_at: created } as any, firm);
    files.push({ filename: `${label} ${p.number} - ${p.client_name}.docx`.replace(/[\/:*?"<>|]+/g, "-"), content: (await htmlToDocx(r.body, { title: r.title })).toString("base64") });
  }
  const to = p.contact_name ? `Dear ${p.contact_name},` : "Dear Sir/Madam,";
  await send("email", p.email, "proposal_sent", `Proposal ${p.number}: NDPA compliance services for ${p.client_name}`, {
    body: `${to}

Please find attached our proposal (${p.number}) for data protection compliance services under the Nigeria Data Protection Act, 2023, with our cover letter.

We look forward to hearing from you.

Yours faithfully,
${u.name}
${firm.name}`,
    brand: firm.name, files });
  await q("update proposals set status = 'sent', updated_at = now() where id = $1", [p.id]);
  await audit(u, "update", "proposal", p.id, { details: { emailed_to: p.email } });
  redirect(flash(`/app/proposals/${p.id}`, `Proposal and cover letter emailed to ${p.email}.`));
}

/** DPCO: turn a saved proposal straight into an invoice for its client. The client is created from the proposal if it
 *  doesn't exist yet (its onboarding fee, if any, still applies and the portal invitation waits for that payment). */
export async function invoiceFromProposal(fd: FormData) {
  const u = await requireFirm();
  if (u.plan === "solo" || !(u.role === "firm_admin" || u.role === "lead_consultant")) redirect("/forbidden");
  const p = await one("select * from proposals where id = $1 and firm_id = $2", [/^[0-9a-f-]{36}$/.test(str(fd, "id")) ? str(fd, "id") : null, u.firm_id]);
  if (!p) redirect("/forbidden");
  const lines: Line[] = p.lines ?? [];
  if (!lines.length) redirect(flash(`/app/proposals/${p.id}`, "Add at least one service with a fee and save the proposal first.", "error"));
  const r = await tx(async (t) => {
    let c = (await t.query<{ id: string; country: string }>("select id, country from clients where firm_id = $1 and lower(name) = lower($2) and archived_at is null order by created_at limit 1", [u.firm_id, p.client_name])).rows[0];
    if (!c) {
      const depts = units(p.departments).length, size = sizeFor(Number(p.subjects_count ?? 0), depts), fee = await feeFor(size);
      const id = await insertClient(t, u.firm_id, u.id, { name: p.client_name, sector: p.sector ?? null, size });
      await t.query("update clients set data_subjects_count = $2, departments_count = $3, checkout_amount = $4 where id = $1", [id, p.subjects_count ?? null, depts, fee || null]);
      if (u.membership_id) await t.query("insert into client_assignments (client_id, membership_id) values ($1,$2) on conflict do nothing", [id, u.membership_id]);
      if (p.email) await t.query("insert into client_contacts (firm_id, client_id, name, email) values ($1,$2,$3,$4)", [u.firm_id, id, p.contact_name || p.email, String(p.email).toLowerCase()]);
      await audit(u, "create", "client", id, { client_id: id, details: { from_proposal: p.id } }, t);
      c = { id, country: "NG" };
    }
    const cc = countryOf(c.country), issued = todayWAT(), year = issued.slice(0, 4);
    const n = (await t.query<{ n: number }>("select count(*)::int as n from invoices where firm_id = $1 and number like $2", [u.firm_id, `INV-${year}-%`])).rows[0].n;
    const number = `INV-${year}-${String(n + 1).padStart(3, "0")}`;
    const inv = (await t.query<{ id: string }>("insert into invoices (firm_id, client_id, number, issued_on, due_on, lines, vat_rate, notes, created_by, currency) values ($1,$2,$3,$4,null,$5,$6,$7,$8,$9) returning id",
      [u.firm_id, c.id, number, issued, JSON.stringify(lines), Number(p.vat_rate) > 0 ? cc.vatRate : 0, [p.payment_terms, p.notes].filter(Boolean).join("\n") || null, u.id, cc.currency.code])).rows[0];
    await audit(u, "create", "invoice", inv.id, { client_id: c.id, details: { from_proposal: p.id } }, t);
    return { number, id: inv.id };
  });
  redirect(flash("/app/billing", `Invoice ${r.number} created from proposal ${p.number}. Click its number below to open the PDF.`));
}
