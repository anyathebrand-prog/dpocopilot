"use server";
// CAR Performance Trend actions. Firm Admin: everything. Lead Consultant: edit, lock, targets. Associate (assigned clients
// only, through requireClient): edit draft values. Locked snapshots never change until a Firm Admin unlocks them.
import { redirect } from "next/navigation";
import ExcelJS from "exceljs";
import { requireClient, audit, canApprove, isAdmin, type User } from "./auth";
import { q, one } from "./db";
import { str, flash } from "./form";
import { draft } from "./ai";
import { answersOf } from "./data";
import { parseCSV } from "./rules";
import { KPI, KPIS, CATS, FILING, asSettings, checkSettings, filingStatus, r1, type CatKey } from "./car-perf-model";
import { ensureSnapshot, refreshDraft, rescore, loadTrend } from "./car-perf";

const UUID = /^[0-9a-f-]{36}$/;
const page = (clientId: string, year?: number) => `/app/clients/${clientId}/car-performance${year ? `?year=${year}` : ""}`;
const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(/[,%\s]/g, "")));

async function snapFor(fd: FormData) {
  const id = str(fd, "snapshot_id");
  const s = UUID.test(id) ? await one<{ id: string; client_id: string; firm_id: string; car_year: number; status: string }>("select id, client_id, firm_id, car_year, status from car_perf_snapshots where id = $1", [id]) : null;
  if (!s) redirect("/forbidden");
  const { user, client } = await requireClient(s.client_id, { write: true });
  return { s, user, client, back: page(s.client_id, s.car_year) };
}

export async function startYear(fd: FormData) {
  const { user, client } = await requireClient(str(fd, "client_id"), { write: true });
  const year = Number(str(fd, "year"));
  if (!Number.isInteger(year) || year < 2019 || year > 2100) redirect(flash(page(client.id), "Enter the CAR year as four digits, for example 2025.", "error"));
  const id = await ensureSnapshot(client as { id: string; firm_id: string }, year);
  await refreshDraft(client.id, id);
  await audit(user, "create", "car_perf_snapshot", id, { client_id: client.id, details: { year } });
  redirect(flash(page(client.id, year), `CAR ${year} snapshot started. Values are calculated from the modules; override any that need it.`));
}

export async function setFiling(fd: FormData) {
  const { s, user, back } = await snapFor(fd);
  if (s.status === "locked") redirect(flash(back, "This year is locked. A Firm Admin can unlock it.", "error"));
  const d = /^\d{4}-\d{2}-\d{2}$/.test(str(fd, "filing_date")) ? str(fd, "filing_date") : null;
  const st = filingStatus(s.car_year, d);
  await q("update car_perf_snapshots set filing_date = $2, filing_status = $3, updated_at = now() where id = $1", [s.id, d, st === "On time" ? "on_time" : st === "Late" ? "late" : "not_filed"]);
  await refreshDraft(s.client_id, s.id);
  await audit(user, "update", "car_perf_snapshot", s.id, { client_id: s.client_id, details: { filing_date: d } });
  redirect(flash(back, d ? `Filing date saved: ${st.toLowerCase()}.` : "Filing date cleared: not filed."));
}

export async function overrideKpi(fd: FormData) {
  const { s, user, back } = await snapFor(fd);
  if (s.status === "locked") redirect(flash(back, "This year is locked. A Firm Admin can unlock it.", "error"));
  const code = str(fd, "kpi_code"), k = KPI[code];
  if (!k) redirect(flash(back, "Unknown KPI.", "error"));
  const reason = str(fd, "reason");
  if (!reason) redirect(flash(back, `Give a reason for overriding ${code}.`, "error"));
  let numerator: number | null = null, denominator: number | null = null, raw: string | null = null;
  if (k.kind === "status") { raw = str(fd, "raw"); if (!FILING.includes(raw as never)) redirect(flash(back, "Choose On time, Late or Not filed.", "error")); }
  else if (str(fd, "denominator")) {
    numerator = num(str(fd, "numerator")); denominator = num(str(fd, "denominator"));
    if (numerator == null || denominator == null || !Number.isFinite(numerator) || !Number.isFinite(denominator) || numerator < 0 || denominator < 0 || numerator > denominator)
      redirect(flash(back, "Enter a numerator and denominator (numerator no larger than the denominator), or a single value.", "error"));
  } else {
    const v = num(str(fd, "raw"));
    if (v == null || !Number.isFinite(v) || v < 0 || (k.kind === "percent" && v > 100)) redirect(flash(back, k.kind === "percent" ? "Enter a percentage from 0 to 100." : "Enter a count of 0 or more.", "error"));
    raw = String(v);
  }
  await q(`insert into car_perf_values (snapshot_id, firm_id, kpi_code, numerator, denominator, raw_value, source, override_reason, updated_by) values ($1,$2,$3,$4,$5,$6,'manual',$7,$8)
    on conflict (snapshot_id, kpi_code) do update set numerator = excluded.numerator, denominator = excluded.denominator, raw_value = excluded.raw_value,
      source = 'manual', override_reason = excluded.override_reason, updated_by = excluded.updated_by, updated_at = now()`, [s.id, s.firm_id, code, numerator, denominator, raw, reason, user.id]);
  await rescore(s.client_id, s.id);
  await audit(user, "update", "car_perf_value", s.id, { client_id: s.client_id, details: { kpi: code, override: true } });
  redirect(flash(back, `${code} overridden for ${s.car_year}.`));
}

export async function revertKpi(fd: FormData) {
  const { s, user, back } = await snapFor(fd);
  if (s.status === "locked") redirect(flash(back, "This year is locked. A Firm Admin can unlock it.", "error"));
  const code = str(fd, "kpi_code");
  await q("update car_perf_values set source = 'auto', override_reason = null, updated_by = $3 where snapshot_id = $1 and kpi_code = $2", [s.id, code, user.id]);
  await refreshDraft(s.client_id, s.id);
  await audit(user, "update", "car_perf_value", s.id, { client_id: s.client_id, details: { kpi: code, reverted: true } });
  redirect(flash(back, `${code} is calculated from the modules again.`));
}

export async function lockSnapshot(fd: FormData) {
  const { s, user, back } = await snapFor(fd);
  if (!canApprove(user)) redirect(flash(back, "Only a Lead Consultant or Firm Admin can lock a year.", "error"));
  if (s.status === "locked") redirect(flash(back, "Already locked."));
  await refreshDraft(s.client_id, s.id);
  await q("update car_perf_snapshots set status = 'locked', locked_by = $2, locked_at = now(), updated_at = now() where id = $1", [s.id, user.id]);
  await audit(user, "lock", "car_perf_snapshot", s.id, { client_id: s.client_id, details: { year: s.car_year } });
  redirect(flash(back, `CAR ${s.car_year} locked. Its values and scores are frozen, and it now shows in the client portal.`));
}

export async function unlockSnapshot(fd: FormData) {
  const { s, user, back } = await snapFor(fd);
  if (!isAdmin(user)) redirect(flash(back, "Only a Firm Admin can unlock a year.", "error"));
  const why = str(fd, "reason");
  if (!why) redirect(flash(back, "Give a reason for unlocking.", "error"));
  await q("update car_perf_snapshots set status = 'draft', locked_by = null, locked_at = null, updated_at = now() where id = $1", [s.id]);
  await audit(user, "unlock", "car_perf_snapshot", s.id, { client_id: s.client_id, details: { year: s.car_year, reason: why } });
  await refreshDraft(s.client_id, s.id);
  redirect(flash(back, `CAR ${s.car_year} unlocked and back to draft. The unlock is in the activity log.`));
}

export async function saveSettings(fd: FormData) {
  const { user, client } = await requireClient(str(fd, "client_id"), { write: true });
  const back = page(client.id, Number(str(fd, "year")) || undefined);
  if (!isAdmin(user)) redirect(flash(back, "Only a Firm Admin can change weights and tolerances.", "error"));
  const s = asSettings({
    weights: Object.fromEntries(CATS.map((c) => [c.key, Number(str(fd, `w_${c.key}`))])) as Record<CatKey, number>,
    tolerances: { "SEC-1": Number(str(fd, "t_SEC-1")), "ACC-3": Number(str(fd, "t_ACC-3")) },
  });
  const err = checkSettings(s);
  if (err) redirect(flash(back, err, "error"));
  await q(`insert into car_perf_settings (client_id, firm_id, weights, tolerances, updated_by) values ($1,$2,$3,$4,$5)
    on conflict (client_id) do update set weights = excluded.weights, tolerances = excluded.tolerances, updated_by = excluded.updated_by, updated_at = now()`,
    [client.id, client.firm_id, JSON.stringify(s.weights), JSON.stringify(s.tolerances), user.id]);
  const drafts = await q<{ id: string }>("select id from car_perf_snapshots where client_id = $1 and status = 'draft'", [client.id]);
  for (const d of drafts) await rescore(client.id, d.id);
  await audit(user, "update", "car_perf_settings", client.id, { client_id: client.id, details: s });
  redirect(flash(back, `Weights and tolerances saved. ${drafts.length} draft year${drafts.length === 1 ? "" : "s"} recalculated; locked years keep their stored scores.`));
}

export async function saveTargets(fd: FormData) {
  const { user, client } = await requireClient(str(fd, "client_id"), { write: true });
  const year = Number(str(fd, "year")), back = page(client.id, year);
  if (!canApprove(user)) redirect(flash(back, "Only a Lead Consultant or Firm Admin can set targets.", "error"));
  if (!Number.isInteger(year)) redirect(flash(back, "Choose a year.", "error"));
  const refs: [string, string][] = [["overall", "overall"], ...CATS.map((c) => ["category", c.key] as [string, string])];
  for (const [scope, ref] of refs) {
    const raw = str(fd, `tg_${ref}`), v = raw === "" ? null : Number(raw);
    if (v == null) { await q("delete from car_perf_targets where client_id = $1 and car_year = $2 and scope = $3 and ref_code = $4", [client.id, year, scope, ref]); continue; }
    if (!Number.isFinite(v) || v < 0 || v > 100) redirect(flash(back, "Targets are scores from 0 to 100.", "error"));
    await q(`insert into car_perf_targets (firm_id, client_id, car_year, scope, ref_code, target_value) values ($1,$2,$3,$4,$5,$6)
      on conflict (client_id, car_year, scope, ref_code) do update set target_value = excluded.target_value`, [client.firm_id, client.id, year, scope, ref, v]);
  }
  await audit(user, "update", "car_perf_targets", client.id, { client_id: client.id, details: { year } });
  redirect(flash(back, `Targets for ${year} saved.`));
}

/** Import past years: one row per year × KPI code, with numerator and denominator, or a raw value. */
export async function importHistory(fd: FormData) {
  const { user, client } = await requireClient(str(fd, "client_id"), { write: true });
  const back = page(client.id);
  const f = fd.get("file");
  if (!(f instanceof File) || !f.size) redirect(flash(back, "Choose a CSV or Excel file.", "error"));
  let rows: string[][] = [];
  if (/\.xlsx$/i.test(f.name)) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(Buffer.from(await f.arrayBuffer()) as unknown as ArrayBuffer);
    wb.worksheets[0]?.eachRow((row) => rows.push((row.values as unknown[]).slice(1).map((v) => (v == null ? "" : typeof v === "object" && "result" in (v as object) ? String((v as { result: unknown }).result) : typeof v === "object" && "text" in (v as object) ? String((v as { text: unknown }).text) : String(v)))));
  } else if (/\.csv$/i.test(f.name)) rows = parseCSV(await f.text());
  else redirect(flash(back, "Use a .csv or .xlsx file.", "error"));
  const head = (rows.shift() ?? []).map((h) => h.trim().toLowerCase().replace(/[\s-]+/g, "_"));
  const col = (re: RegExp) => head.findIndex((h) => re.test(h));
  const ci = { year: col(/^(car_)?year$/), code: col(/^(kpi_)?code$|^kpi$/), num: col(/^numerator$/), den: col(/^denominator$/), raw: col(/^(raw_)?value$|^raw$/) };
  if (ci.year < 0 || ci.code < 0) redirect(flash(back, "The first row needs car_year and kpi_code columns, then numerator and denominator, or raw_value.", "error"));
  const locked = new Set((await q<{ car_year: number }>("select car_year from car_perf_snapshots where client_id = $1 and status = 'locked'", [client.id])).map((r) => r.car_year));
  const rejected: string[] = [];
  const touched = new Map<number, string>();
  let ok = 0, skipped = 0;
  for (const [i, r] of rows.slice(0, 2000).entries()) {
    const line = i + 2, g = (c: number) => (c >= 0 ? (r[c] ?? "").trim() : "");
    if (!r.some((x) => String(x).trim())) continue;
    const year = Number(g(ci.year)), code = g(ci.code).toUpperCase(), k = KPI[code];
    if (!Number.isInteger(year) || year < 2019 || year > 2100) { rejected.push(`row ${line}: year "${g(ci.year)}"`); continue; }
    if (!k) { rejected.push(`row ${line}: unknown KPI code "${g(ci.code)}"`); continue; }
    if (!g(ci.num) && !g(ci.den) && !g(ci.raw)) { skipped++; continue; } // no figure given: left out (N/A)
    if (locked.has(year)) { rejected.push(`row ${line}: ${year} is locked`); continue; }
    let numerator: number | null = null, denominator: number | null = null, raw: string | null = null;
    if (k.kind === "status") {
      const v = g(ci.raw).toLowerCase(), m = FILING.find((x) => x.toLowerCase() === v || x.toLowerCase().replace(" ", "_") === v);
      if (!m) { rejected.push(`row ${line}: ${code} needs On time, Late or Not filed`); continue; }
      raw = m;
    } else if (g(ci.den)) {
      numerator = num(g(ci.num)); denominator = num(g(ci.den));
      if (numerator == null || denominator == null || !Number.isFinite(numerator) || !Number.isFinite(denominator) || numerator < 0 || denominator < 0 || numerator > denominator) { rejected.push(`row ${line}: ${code} numerator/denominator`); continue; }
    } else {
      const v = num(g(ci.raw));
      if (v == null || !Number.isFinite(v) || v < 0 || (k.kind === "percent" && v > 100)) { rejected.push(`row ${line}: ${code} value "${g(ci.raw)}"`); continue; }
      raw = String(v);
    }
    let sid = touched.get(year);
    if (!sid) { sid = await ensureSnapshot(client as { id: string; firm_id: string }, year); touched.set(year, sid); }
    await q(`insert into car_perf_values (snapshot_id, firm_id, kpi_code, numerator, denominator, raw_value, source, override_reason, updated_by) values ($1,$2,$3,$4,$5,$6,'import',null,$7)
      on conflict (snapshot_id, kpi_code) do update set numerator = excluded.numerator, denominator = excluded.denominator, raw_value = excluded.raw_value,
        source = 'import', override_reason = null, updated_by = excluded.updated_by, updated_at = now()`, [sid, client.firm_id, code, numerator, denominator, raw, user.id]);
    ok++;
  }
  for (const sid of touched.values()) await refreshDraft(client.id, sid);
  await audit(user, "import", "car_perf_values", client.id, { client_id: client.id, details: { imported: ok, rejected: rejected.length } });
  const msg = `Imported ${ok} value${ok === 1 ? "" : "s"} for ${touched.size} year${touched.size === 1 ? "" : "s"}.${skipped ? ` ${skipped} row${skipped === 1 ? "" : "s"} without a figure left out.` : ""}${rejected.length ? ` Rejected ${rejected.length}: ${rejected.slice(0, 8).join("; ")}${rejected.length > 8 ? "; …" : ""}.` : ""}`;
  redirect(flash(back, msg, ok ? undefined : "error"));
}

/** Draft the written summary from the scores only (never personal data). The consultant edits and approves it. */
export async function askCopilot(fd: FormData) {
  const { s, user, client, back } = await snapFor(fd);
  const t = await loadTrend(s.client_id);
  const pts = t.snaps.filter((x) => x.overall_score != null && x.car_year <= s.car_year).slice(-5);
  if (!pts.length) redirect(flash(back, "There are no scores to summarise yet.", "error"));
  const cur = pts[pts.length - 1], first = pts[0];
  const cats = CATS.map((c) => ({ c, v: cur[`score_${c.key}` as "score_gov"] == null ? null : Number(cur[`score_${c.key}` as "score_gov"]), v0: first[`score_${c.key}` as "score_gov"] == null ? null : Number(first[`score_${c.key}` as "score_gov"]) })).filter((x) => x.v != null);
  const strong = [...cats].sort((a, b) => b.v! - a.v!)[0], weak = [...cats].sort((a, b) => a.v! - b.v!)[0];
  const most = pts.length > 1 ? [...cats].filter((x) => x.v0 != null).sort((a, b) => (b.v! - b.v0!) - (a.v! - a.v0!))[0] : null;
  const weakKpis = KPIS.filter((k) => k.cat === weak?.c.key).map((k) => ({ k, sc: cur.values[k.code]?.score == null ? null : Number(cur.values[k.code].score) })).filter((x) => x.sc != null).sort((a, b) => a.sc! - b.sc!).slice(0, 2);
  const o = (x: { overall_score: string | null }) => r1(Number(x.overall_score)).toFixed(1);
  const base = [
    pts.length > 1 ? `The overall CAR score moved from ${o(first)} in ${first.car_year} to ${o(cur)} in ${cur.car_year} (${cur.rating_band}).` : `The overall CAR score for ${cur.car_year} is ${o(cur)} (${cur.rating_band}).`,
    strong ? `${strong.c.name} is the strongest category at ${strong.v!.toFixed(1)}${weak && weak !== strong ? `, and ${weak.c.name} the weakest at ${weak.v!.toFixed(1)}` : ""}.` : "",
    most && most.v! - most.v0! > 0 ? `${most.c.name} improved most, from ${most.v0!.toFixed(1)} to ${most.v!.toFixed(1)}.` : "",
    weakKpis.length ? `Priorities before the next filing: ${weakKpis.map((x) => `${x.k.name.toLowerCase()} (score ${x.sc!.toFixed(0)})`).join(" and ")}.` : "",
  ].filter(Boolean).join(" ");
  const facts = { years: pts.map((p) => ({ year: p.car_year, overall: Number(p.overall_score), band: p.rating_band, ...Object.fromEntries(CATS.map((c) => [c.name, p[`score_${c.key}` as "score_gov"] == null ? null : Number(p[`score_${c.key}` as "score_gov"])])) })),
    weakest_kpis: weakKpis.map((x) => ({ kpi: x.k.name, score: x.sc })) };
  let text = base;
  try { text = await draft(user as User, s.client_id, "CAR performance summary (3 to 5 sentences: overall movement, strongest and weakest category, top 2 actions before the next 31 March filing). Use only these scores.", base, facts); } catch { /* keep the template */ }
  await q("update car_perf_snapshots set summary = $2, summary_status = 'draft', summary_approved_by = null where id = $1", [s.id, text]);
  redirect(flash(back, "Summary drafted from the scores. Edit it, then approve it to show it in the portal and the PDF."));
}

export async function saveSummary(fd: FormData) {
  const { s, user, back } = await snapFor(fd);
  const text = str(fd, "summary"), approve = str(fd, "op") === "approve";
  if (approve && !canApprove(user)) redirect(flash(back, "Only a Lead Consultant or Firm Admin can approve the summary.", "error"));
  if (approve && !text) redirect(flash(back, "Write the summary before approving it.", "error"));
  await q("update car_perf_snapshots set summary = $2, summary_status = $3, summary_approved_by = $4 where id = $1", [s.id, text || null, !text ? "none" : approve ? "approved" : "draft", approve ? user.id : null]);
  await audit(user, approve ? "approve" : "update", "car_perf_summary", s.id, { client_id: s.client_id });
  redirect(flash(back, approve ? "Summary approved: it shows in the portal and the PDF." : "Summary saved as a draft."));
}

