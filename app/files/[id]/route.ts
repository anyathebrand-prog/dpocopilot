import { getUser, clientScope, scopeArgs } from "@/lib/auth";
import { one } from "@/lib/db";
import { readStored } from "@/lib/files";

/** Downloads only after an access check: firm users by client scope, contacts for their own client. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await getUser();
  if (!u || !/^[0-9a-f-]{36}$/.test(id)) return new Response("Not found", { status: 404 });
  const f = u.kind === "firm"
    ? await one(`select f.* from files f join clients c on c.id = f.client_id where f.id = $3 and ${clientScope(u)}`, [...scopeArgs(u), id])
    : u.kind === "contact" ? await one("select * from files where id = $1 and client_id = $2", [id, u.client_id]) : null;
  if (!f) return new Response("Not found", { status: 404 });
  let buf: Buffer;
  try { buf = await readStored(f.storage_path); } catch (e) { console.error(e); return new Response("File storage is unavailable. Try again shortly.", { status: 503 }); }
  return new Response(new Uint8Array(buf), {
    headers: {
      "content-type": f.mime,
      "content-disposition": `attachment; filename="${encodeURIComponent(f.original_name)}"`,
      "x-content-type-options": "nosniff",
      "cache-control": "private, no-store",
    },
  });
}
