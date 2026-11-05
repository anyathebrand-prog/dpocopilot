import { getUser } from "@/lib/auth";
import { one } from "@/lib/db";

/** A Solo DPO's certificate or CV: for the Solo DPO themselves, the DPCO they asked to work under, and the Secretary. */
export async function GET(req: Request) {
  const url = new URL(req.url), firm = url.searchParams.get("firm") ?? "", kind = url.searchParams.get("kind");
  const u = await getUser();
  if (!u || !/^[0-9a-f-]{36}$/.test(firm) || (kind !== "cert" && kind !== "cv")) return new Response("Not found", { status: 404 });
  const f = await one(`select sp.${kind}_file as bytes, sp.${kind}_mime as mime, sp.${kind}_name as name, f.dpco_firm_id, f.dpco_status
    from solo_profiles sp join firms f on f.id = sp.firm_id where sp.firm_id = $1`, [firm]);
  const allowed = f && (u.kind === "secretary" || (u.kind === "firm" && (u.firm_id === firm || (u.firm_id === f.dpco_firm_id && f.dpco_status !== "declined"))));
  if (!allowed || !f.bytes) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(f.bytes), { headers: {
    "content-type": f.mime, "content-disposition": `inline; filename="${encodeURIComponent(f.name)}"`,
    "x-content-type-options": "nosniff", "cache-control": "private, no-store" } });
}
