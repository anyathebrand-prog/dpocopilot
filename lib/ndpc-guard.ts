import { q } from "./db";
import { auditFilings } from "./ndpc";
import { findFilings, norm } from "./ndpc-match";

/**
 * Prospects that already filed their NDPC compliance audit for the previous year are off limits for new work
 * (proposals, adding as a client). This DPCO's own clients are always allowed (renewals). Exact name matches only.
 * Returns the reason to show, or null when the work may go ahead. If NDPC can't be reached the work is allowed.
 */
export async function ndpcBlock(firmId: string, company: string): Promise<string | null> {
  const n = norm(company);
  if (!n) return null;
  const clients = await q<{ name: string }>("select name from clients where firm_id = $1", [firmId]);
  if (clients.some((c) => norm(c.name) === n)) return null;
  const year = new Date().getFullYear() - 1;
  let hit;
  try { hit = findFilings(await auditFilings(year), company).find((f) => f.exact); }
  catch (e) { console.error("[ndpc] check skipped:", e); return null; }
  return hit ? `${hit.name} filed its ${year} compliance audit with the NDPC (reference ${hit.ref}), so it is already served by a DPCO. New work for it isn't allowed. See NDPC check for details.` : null;
}
