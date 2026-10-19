import { q } from "@/lib/db";
import { todayWAT } from "@/lib/rules";
import { countedPath, sourceOf, isBot } from "@/lib/visits";

/** Counts one public page view (sent by VisitBeacon). Stores counts only: no cookie, IP or user agent is kept. */
export async function POST(req: Request) {
  if (isBot(req.headers.get("user-agent"))) return new Response(null, { status: 204 });
  const b = await req.json().catch(() => null);
  const path = countedPath(b?.path);
  if (!path) return new Response(null, { status: 204 });
  const host = new URL(req.url).hostname;
  const landing = b?.landing === true, src = landing ? sourceOf(b?.ref, host) ?? "internal" : "internal";
  await q(`insert into page_views (day, path, source, views, landings) values ($1,$2,$3,1,$4)
    on conflict (day, path, source) do update set views = page_views.views + 1, landings = page_views.landings + excluded.landings`,
    [todayWAT(), path, src, landing && src !== "internal" ? 1 : 0]);
  return new Response(null, { status: 204 });
}
