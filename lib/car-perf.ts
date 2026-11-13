// CAR Performance Trend on the server: settings, auto-computing the twelve KPIs from the modules for a CAR year,
// scoring and storing a snapshot, and loading a client's trend. Every query is scoped by client (and so by firm):
// callers reach a client only through requireClient (firm users) or requireContact (the client's own portal).
import { q, one } from "./db";
import { answersOf } from "./data";
import { KPIS, CATS, asSettings, score, kpiValue, filingStatus, r1, type Settings, type Value, type Source, type CatKey } from "./car-perf-model";

export async function getSettings(clientId: string): Promise<Settings> {
  const r = await one<{ weights: unknown; tolerances: unknown }>("select weights, tolerances from car_perf_settings where client_id = $1", [clientId]);
  return asSettings(r ? { weights: r.weights, tolerances: r.tolerances } : null);
}

const n = (x: unknown) => Number(x ?? 0);

/** The twelve KPI values for a client and CAR year, computed from the modules. */
export async function autoValues(clientId: string, year: number, filingDate: string | null): Promise<Record<string, Value>> {
  const from = `${year}-01-01`, to = `${year + 1}-01-01`;
  const ropa = (await one(`select count(*) filter (where lawful_basis is not null and coalesce(trim(data_subjects), '') <> '' and coalesce(trim(data_categories), '') <> ''
      and coalesce(trim(retention_period), '') <> '' and coalesce(trim(security_measures), '') <> '')::int as num, count(*)::int as den
    from ropa_entries where client_id = $1 and state <> 'archived'`, [clientId]))!;
  const staff = Number((await answersOf(clientId)).org_staff_count) || 0;
  const trained = n((await one(`select coalesce(sum(actual_participants), 0)::int as t from trainings where client_id = $1 and status = 'completed'
    and kind in ('general_staff','role_based','management','champion') and coalesce(completed_on, starts_on) >= $2 and coalesce(completed_on, starts_on) < $3`, [clientId, from, to]))!.t);
  const br = (await one(`select count(*)::int as all_n, count(*) filter (where b.notification_required = 'yes')::int as den,
      count(*) filter (where b.notification_required = 'yes' and exists (select 1 from breach_notifications n where n.breach_id = b.id and n.audience = 'regulator'
        and n.sent_at is not null and n.sent_at <= b.aware_at + interval '72 hours'))::int as num
    from breaches b where b.client_id = $1 and b.aware_at >= $2 and b.aware_at < $3`, [clientId, from, to]))!;
  const hi = (await one(`select count(*)::int as den, count(*) filter (where status = 'completed' and date_closed is not null and date_closed <= created_at::date + 90)::int as num
    from remediation_actions where client_id = $1 and audit_year = $2 and priority = 'high'`, [clientId, year]))!;
  const dpia = (await one(`select count(*)::int as den, count(*) filter (where exists (select 1 from dpia_ropa dr join dpias d on d.id = dr.dpia_id
      where dr.ropa_entry_id = r.id and (select v.status from content_versions v where v.parent_type = 'dpia' and v.parent_id = d.id order by v.version_no desc limit 1)
        in ('approved','awaiting_client_signoff','client_signed_off')))::int as num
    from ropa_entries r where r.client_id = $1 and r.state = 'active' and r.is_high_risk`, [clientId]))!;
  const dsar = (await one(`select count(*)::int as den, count(*) filter (where closed_at is not null and closed_at::date <= received_on + 30)::int as num
    from dsars where client_id = $1 and received_on >= $2 and received_on < $3`, [clientId, from, to]))!;
  const rem = (await one(`select count(*)::int as all_n, count(*) filter (where status <> 'completed')::int as open from remediation_actions where client_id = $1 and audit_year = $2`, [clientId, year]))!;
  const fin = (await one(`select count(*)::int as all_n, count(*) filter (where status = 'open')::int as open from car_findings where client_id = $1 and audit_year = $2`, [clientId, year]))!;
  const tia = (await one(`select count(*)::int as den, count(*) filter (where status = 'approved' and coalesce(answers->>'mechanism', '') not in ('', 'none'))::int as num
    from assessments where client_id = $1 and kind = 'tia'`, [clientId]))!;
  const xfer = n(tia.den) ? tia : (await one(`select count(*)::int as den, count(*) filter (where coalesce(trim(transfer_safeguard), '') <> '')::int as num
    from ropa_entries where client_id = $1 and state = 'active' and has_transfer`, [clientId]))!;
  const tp = (await one(`select count(*)::int as den, count(*) filter (where answers->>'dpa_status' = 'Signed')::int as dpa,
      count(*) filter (where status = 'approved' and approved_at >= $2 and approved_at < $3)::int as done
    from assessments where client_id = $1 and kind = 'tpra'`, [clientId, from, to]))!;
  return {
    "GOV-1": { numerator: n(ropa.num), denominator: n(ropa.den) },
    "GOV-2": { numerator: Math.min(trained, staff), denominator: staff },
    "GOV-3": { raw: filingStatus(year, filingDate) },
    "SEC-1": { raw: n(br.all_n) },
    "SEC-2": { numerator: n(br.num), denominator: n(br.den) },
    "SEC-3": { numerator: n(hi.num), denominator: n(hi.den) },
    "ACC-1": { numerator: n(dpia.num), denominator: n(dpia.den) },
    "ACC-2": { numerator: n(dsar.num), denominator: n(dsar.den) },
    "ACC-3": { raw: n(rem.all_n) ? n(rem.open) : n(fin.all_n) ? n(fin.open) : null },
    "CBT-1": { numerator: n(xfer.num), denominator: n(xfer.den) },
    "DPR-1": { numerator: n(tp.dpa), denominator: n(tp.den) },
    "DPR-2": { numerator: n(tp.done), denominator: n(tp.den) },
  };
}

export type ValRow = { kpi_code: string; numerator: string | null; denominator: string | null; raw_value: string | null; score: string | null; source: Source; override_reason: string | null; updated_at: string };
export type Snap = { id: string; car_year: number; status: "draft" | "locked"; filing_date: string | null; filing_status: string; overall_score: string | null; rating_band: string | null;
  score_gov: string | null; score_sec: string | null; score_acc: string | null; score_cbt: string | null; score_dpr: string | null; weights_used: unknown; tolerances_used: unknown;
  locked_at: string | null; locker: string | null; summary: string | null; summary_status: string; values: Record<string, ValRow> };

export const toValue = (v: ValRow | undefined): Value | undefined => v && { numerator: v.numerator == null ? null : Number(v.numerator), denominator: v.denominator == null ? null : Number(v.denominator), raw: v.raw_value };

/** Refresh a draft snapshot: auto rows from the modules, then the stored scores (with the client's current settings). */
export async function refreshDraft(clientId: string, snapId: string) {
  const s = await one<{ id: string; firm_id: string; car_year: number; filing_date: string | null; status: string }>("select id, firm_id, car_year, to_char(filing_date, 'YYYY-MM-DD') as filing_date, status from car_perf_snapshots where id = $1 and client_id = $2", [snapId, clientId]);
  if (!s || s.status !== "draft") return;
  const auto = await autoValues(clientId, s.car_year, s.filing_date);
  const kept = new Set((await q<{ kpi_code: string }>("select kpi_code from car_perf_values where snapshot_id = $1 and source <> 'auto'", [s.id])).map((r) => r.kpi_code));
  for (const k of KPIS) {
    if (kept.has(k.code)) continue;
    const v = auto[k.code];
    await q(`insert into car_perf_values (snapshot_id, firm_id, kpi_code, numerator, denominator, raw_value, source) values ($1,$2,$3,$4,$5,$6,'auto')
      on conflict (snapshot_id, kpi_code) do update set numerator = excluded.numerator, denominator = excluded.denominator, raw_value = excluded.raw_value, updated_at = now()
      where car_perf_values.source = 'auto'`, [s.id, s.firm_id, k.code, v.numerator ?? null, v.denominator ?? null, v.raw == null ? null : String(v.raw)]);
  }
  await rescore(clientId, s.id);
}

/** Store a snapshot's KPI and category scores. Draft: the client's current settings. Locked snapshots are never rescored. */
export async function rescore(clientId: string, snapId: string) {
  const s = await one<{ status: string }>("select status from car_perf_snapshots where id = $1 and client_id = $2", [snapId, clientId]);
  if (!s || s.status !== "draft") return;
  const settings = await getSettings(clientId);
  const rows = await q<ValRow>("select * from car_perf_values where snapshot_id = $1", [snapId]);
  const values = Object.fromEntries(rows.map((r) => [r.kpi_code, toValue(r)!]));
  const sc = score(values, settings);
  for (const k of KPIS) await q("update car_perf_values set score = $3 where snapshot_id = $1 and kpi_code = $2", [snapId, k.code, sc.kpi[k.code] == null ? null : r1(sc.kpi[k.code]!)]);
  const c = (k: CatKey) => (sc.cats[k] == null ? null : r1(sc.cats[k]!));
  await q(`update car_perf_snapshots set score_gov = $2, score_sec = $3, score_acc = $4, score_cbt = $5, score_dpr = $6, overall_score = $7, rating_band = $8,
    weights_used = $9, tolerances_used = $10, updated_at = now() where id = $1`,
    [snapId, c("gov"), c("sec"), c("acc"), c("cbt"), c("dpr"), sc.overall == null ? null : r1(sc.overall), sc.band, JSON.stringify(settings.weights), JSON.stringify(settings.tolerances)]);
}

/** Create the snapshot for a year if missing (draft), and return its id. */
export async function ensureSnapshot(client: { id: string; firm_id: string }, year: number) {
  const r = await one<{ id: string }>(`insert into car_perf_snapshots (firm_id, client_id, car_year) values ($1,$2,$3)
    on conflict (client_id, car_year) do update set updated_at = car_perf_snapshots.updated_at returning id`, [client.firm_id, client.id, year]);
  return r!.id;
}

/** A client's snapshots (most recent five years shown; gaps for missing years), with values. Portal: locked only. */
export async function loadTrend(clientId: string, opts: { lockedOnly?: boolean; refresh?: boolean; endYear?: number } = {}) {
  if (opts.refresh) for (const s of await q<{ id: string }>("select id from car_perf_snapshots where client_id = $1 and status = 'draft'", [clientId])) await refreshDraft(clientId, s.id);
  const snaps = await q<Snap>(`select s.id, s.car_year, s.status, to_char(s.filing_date, 'YYYY-MM-DD') as filing_date, s.filing_status, s.overall_score, s.rating_band,
      s.score_gov, s.score_sec, s.score_acc, s.score_cbt, s.score_dpr, s.weights_used, s.tolerances_used, s.locked_at, u.name as locker, s.summary, s.summary_status
    from car_perf_snapshots s left join users u on u.id = s.locked_by where s.client_id = $1 ${opts.lockedOnly ? "and s.status = 'locked'" : ""} order by s.car_year`, [clientId]);
  const vals = snaps.length ? await q<ValRow>("select v.*, to_char(v.updated_at, 'YYYY-MM-DD') as updated_at from car_perf_values v where v.snapshot_id = any($1::uuid[])", [snaps.map((s) => s.id)]) : [];
  for (const s of snaps) s.values = Object.fromEntries(vals.filter((v) => (v as unknown as { snapshot_id: string }).snapshot_id === s.id).map((v) => [v.kpi_code, v]));
  const all = snaps.map((s) => s.car_year);
  const end = opts.endYear && all.includes(opts.endYear) ? opts.endYear : all.length ? Math.max(...all) : null;
  const years = end == null ? [] : Array.from({ length: Math.min(5, end - Math.min(...all) + 1) }, (_, i) => end - Math.min(4, end - Math.min(...all)) + i);
  const targets = await q<{ car_year: number; scope: string; ref_code: string; target_value: string }>("select car_year, scope, ref_code, target_value from car_perf_targets where client_id = $1", [clientId]);
  const byYear = Object.fromEntries(snaps.map((s) => [s.car_year, s]));
  const cat = (s: Snap | undefined, k: CatKey) => (s ? (s[`score_${k}` as keyof Snap] as string | null) : null);
  const num = (x: string | null | undefined) => (x == null ? null : Number(x));
  const t = (yr: number, scope: string, ref: string) => num(targets.find((x) => x.car_year === yr && x.scope === scope && x.ref_code === ref)?.target_value);
  return {
    snaps, all, years, byYear,
    series: {
      overall: years.map((y) => num(byYear[y]?.overall_score)),
      cats: Object.fromEntries(CATS.map((c) => [c.key, years.map((y) => num(cat(byYear[y], c.key)))])) as Record<CatKey, (number | null)[]>,
      target: years.map((y) => t(y, "overall", "overall")),
      catTargets: Object.fromEntries(CATS.map((c) => [c.key, years.map((y) => t(y, "category", c.key))])) as Record<CatKey, (number | null)[]>,
      findings: years.map((y) => { const v = byYear[y]?.values["ACC-3"]; const x = v ? kpiValue("ACC-3", toValue(v)) : null; return x == null ? null : Number(x); }),
      breaches: years.map((y) => { const v = byYear[y]?.values["SEC-1"]; const x = v ? kpiValue("SEC-1", toValue(v)) : null; return x == null ? null : Number(x); }),
    },
    targets,
  };
}
export type Trend = Awaited<ReturnType<typeof loadTrend>>;
