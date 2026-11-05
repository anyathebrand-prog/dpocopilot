// NDPC's public list of organisations that filed a compliance audit (https://services.ndpc.gov.ng/repo/?flp=audit).
// The page loads its table from a JSON feed per audit year; the feed's address is read from the page, so a new link keeps working.
import type { Filing } from "./ndpc-match";

const PAGE = "https://services.ndpc.gov.ng/repo/?flp=audit";
const TTL = 12 * 3600_000;
const cache = new Map<string, { at: number; list: Filing[] }>(); // shortcut: per-process memory; one install, a few lookups a day

async function feedUrl() {
  const html = await (await fetch(PAGE, { signal: AbortSignal.timeout(30_000) })).text();
  const m = html.match(/https:\/\/services\.ndpc\.gov\.ng\/dpimp\/engine\/print\.php\?[^'"\s]*name=Audit%20File/);
  if (!m) throw new Error("NDPC audit page changed: feed link not found");
  return m[0];
}

/** Every organisation NDPC lists as having filed its audit for the year. Cached for 12 hours. Throws if NDPC can't be reached. */
export async function auditFilings(year: number): Promise<Filing[]> {
  const hit = cache.get(String(year));
  if (hit && Date.now() - hit.at < TTL) return hit.list;
  const r = await fetch(`${await feedUrl()}&nd=${year}`, { signal: AbortSignal.timeout(90_000) });
  const rows: unknown[][] = (await r.json())?.data ?? [];
  const list = rows.map((x) => ({ name: String(x[0] ?? "").trim(), year: String(x[2] ?? year), ref: String(x[3] ?? "") })).filter((f) => f.name);
  cache.set(String(year), { at: Date.now(), list });
  return list;
}
