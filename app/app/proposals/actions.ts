"use server";
import { redirect } from "next/navigation";
import { requireFirm, audit } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { str, opt, flash } from "@/lib/form";
import { imageSize } from "@/lib/files";
import { PROPOSAL_SECTORS, TIERS, type Fin } from "@/lib/proposal";
import { SERVICES, type Line } from "@/lib/invoice";
import { todayWAT } from "@/lib/rules";

const HEX = /^#[0-9A-Fa-f]{6}$/, EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const int = (v: string, lo: number, hi: number) => (v === "" ? null : Number.isInteger(Number(v)) && Number(v) >= lo && Number(v) <= hi ? Number(v) : NaN);
const naira = (v: string) => { const n = Number(v.replace(/[,₦\s]/g, "")); return v.trim() === "" ? 0 : Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : NaN; };

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
  const primary = str(fd, "primary_color"), secondary = str(fd, "secondary_color");
  if (!HEX.test(primary) || !HEX.test(secondary)) fail("Choose the client's primary and secondary colours.");
  const sector = opt(fd, "sector"), tier = str(fd, "tier") || "TBC";
  if ((sector && !PROPOSAL_SECTORS.includes(sector)) || !(tier in TIERS)) fail("Choose the sector and tier from the lists.");
  const staff = int(str(fd, "staff_count"), 0, 10_000_000), subjects = int(str(fd, "subjects_count"), 0, 1_000_000_000);
  const months = int(str(fd, "duration_months") || "12", 1, 36), validity = int(str(fd, "validity_days") || "90", 1, 365), dpias = int(str(fd, "dpias") || "5", 0, 100);
  if ([staff, subjects, months, validity, dpias].some(Number.isNaN)) fail("Check the numbers: staff, data subjects, duration (1–36 months), validity (1–365 days) and DPIAs.");

  const lines: Line[] = [];
  for (const [i, service] of SERVICES.entries()) {
    if (fd.get(`s${i}`) !== "on") continue;
    const amount = naira(str(fd, `a${i}`));
    if (!amount) fail(`Enter a fee for ${service}.`);
    lines.push({ service, description: str(fd, `d${i}`), amount });
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

  const vals = [name, address, email, opt(fd, "contact_name"), opt(fd, "contact_title"), sector, primary.toUpperCase(), secondary.toUpperCase(), fd.get("vat") === "on" ? 7.5 : 0,
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
