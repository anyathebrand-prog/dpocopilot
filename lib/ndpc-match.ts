// Matching company names against NDPC's published list of audited organisations.
export type Filing = { name: string; year: string; ref: string };

const SUFFIX = /\b(limited|ltd|plc|nig|nigeria|ng|llc|inc|co|company|enterprises?|ventures?|the)\b/g;
/** Lowercase, drop brackets, punctuation and common company suffixes. */
export const norm = (s: string) => s.toLowerCase().replace(/\(.*?\)/g, " ").replace(/&/g, " and ").replace(/[^a-z0-9 ]+/g, " ").replace(SUFFIX, " ").replace(/\s+/g, " ").trim();

/** Filings whose name matches the query: exact (after normalising) first, then names containing every word of it. */
export function findFilings(list: Filing[], query: string, limit = 20) {
  const q = norm(query), words = q.split(" ").filter(Boolean);
  if (!words.length) return [];
  const scored: [number, Filing][] = [];
  for (const f of list) {
    const n = norm(f.name), raw = f.name.toLowerCase();
    if (n === q) scored.push([0, f]);
    else if (words.every((w) => n.split(" ").includes(w))) scored.push([1, f]);
    else if (raw.includes(query.trim().toLowerCase())) scored.push([2, f]);
  }
  return scored.sort((a, b) => a[0] - b[0] || a[1].name.length - b[1].name.length).slice(0, limit).map(([exact, f]) => ({ ...f, exact: exact === 0 }));
}
