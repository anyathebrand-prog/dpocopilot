"use server";
import { redirect } from "next/navigation";
import { requireFirm, audit } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { str, opt, flash } from "@/lib/form";
import { imageSize } from "@/lib/files";
import { SERVICES, type Line } from "@/lib/invoice";
import { PROPOSAL_SECTORS } from "@/lib/proposal";
import { todayWAT } from "@/lib/rules";

const HEX = /^#[0-9A-Fa-f]{6}$/, EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const int = (v: string, lo: number, hi: number) => (v === "" ? null : Number.isInteger(Number(v)) && Number(v) >= lo && Number(v) <= hi ? Number(v) : NaN);

/** Create (no id) or update a proposal from the form. */
export async function saveProposal(fd: FormData) {
  const u = await requireFirm();
  const id = str(fd, "id");
  const existing = id ? await one("select * from proposals where id = $1 and firm_id = $2", [/^[0-9a-f-]{36}$/.test(id) ? id : null, u.firm_id]) : null;
  if (id && !existing) redirect("/forbidden");
  const back = existing ? `/app/proposals/${existing.id}` : "/app/proposals?new=1";
  const name = str(fd, "client_name"), address = str(fd, "address"), email = str(fd, "email");
  if (!name || !address || !EMAIL.test(email)) redirect(flash(back, "Enter the client's name, address and a valid email address.", "error"));
  const primary = str(fd, "primary_color"), secondary = str(fd, "secondary_color");
  if (!HEX.test(primary) || !HEX.test(secondary)) redirect(flash(back, "Choose the client's primary and secondary colours.", "error"));
  const sector = opt(fd, "sector");
  if (sector && !PROPOSAL_SECTORS.includes(sector)) redirect(flash(back, "Choose a sector from the list.", "error"));
  const lines: Line[] = [];
  for (const [i, service] of SERVICES.entries()) {
    if (fd.get(`s${i}`) !== "on") continue;
    const amount = Number(str(fd, `a${i}`).replace(/[,₦\s]/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) redirect(flash(back, `Enter a fee for ${service}.`, "error"));
    lines.push({ service, description: str(fd, `d${i}`), amount: Math.round(amount * 100) / 100 });
  }
  if (!lines.length) redirect(flash(back, "Select at least one service.", "error"));
  const validity = int(str(fd, "validity_days") || "30", 1, 365), weeks = int(str(fd, "duration_weeks"), 1, 104);
  if (Number.isNaN(validity) || Number.isNaN(weeks)) redirect(flash(back, "Check the validity (1–365 days) and duration (1–104 weeks).", "error"));
  let logo: { data: string; w: number; h: number } | null | undefined; // undefined = keep
  const f = fd.get("logo");
  if (f instanceof File && f.size) {
    const buf = Buffer.from(await f.arrayBuffer()), dim = imageSize(buf);
    if (!dim || f.size > 1_000_000) redirect(flash(back, "The logo must be a PNG or JPEG under 1 MB.", "error"));
    logo = { data: `data:image/${dim.type};base64,${buf.toString("base64")}`, w: dim.w, h: dim.h };
  } else if (fd.get("remove_logo") === "on") logo = null;
  const vals = [name, address, email, opt(fd, "contact_name"), opt(fd, "contact_title"), sector, primary.toUpperCase(), secondary.toUpperCase(), JSON.stringify(lines),
    fd.get("vat") === "on" ? 7.5 : 0, opt(fd, "payment_terms"), validity ?? 30, opt(fd, "start_on"), weeks, opt(fd, "notes")];
  let pid: string;
  if (existing) {
    await q(`update proposals set client_name=$2, address=$3, email=$4, contact_name=$5, contact_title=$6, sector=$7, primary_color=$8, secondary_color=$9, lines=$10,
      vat_rate=$11, payment_terms=$12, validity_days=$13, start_on=$14, duration_weeks=$15, notes=$16, updated_at=now() where id = $1`, [existing.id, ...vals]);
    pid = existing.id;
  } else {
    const year = todayWAT().slice(0, 4);
    const n = (await one<{ n: number }>("select count(*)::int as n from proposals where firm_id = $1 and number like $2", [u.firm_id, `PRP-${year}-%`]))!.n;
    pid = (await one<{ id: string }>(`insert into proposals (firm_id, number, client_name, address, email, contact_name, contact_title, sector, primary_color, secondary_color, lines,
      vat_rate, payment_terms, validity_days, start_on, duration_weeks, notes, created_by) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) returning id`,
      [u.firm_id, `PRP-${year}-${String(n + 1).padStart(3, "0")}`, ...vals, u.id]))!.id;
  }
  if (logo !== undefined) await q("update proposals set logo = $2, logo_w = $3, logo_h = $4 where id = $1", [pid, logo?.data ?? null, logo?.w ?? null, logo?.h ?? null]);
  await audit(u, existing ? "update" : "create", "proposal", pid, {});
  redirect(flash(`/app/proposals/${pid}`, existing ? "Proposal saved" : "Proposal created. Download the proposal and cover letter below."));
}

export async function setProposalStatus(fd: FormData) {
  const u = await requireFirm();
  const p = await one("select id from proposals where id = $1 and firm_id = $2", [/^[0-9a-f-]{36}$/.test(str(fd, "id")) ? str(fd, "id") : null, u.firm_id]);
  const status = str(fd, "status");
  if (!p || !["draft", "sent", "accepted", "declined"].includes(status)) redirect("/forbidden");
  await q("update proposals set status = $2, updated_at = now() where id = $1", [p.id, status]);
  await audit(u, "update", "proposal", p.id, { details: { status } });
  redirect(flash(`/app/proposals/${p.id}`, `Marked as ${status}`));
}
