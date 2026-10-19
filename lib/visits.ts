// Cookieless visit counting for the public website. Only these pages are counted, never the workspace or portals.
const PUBLIC = /^\/(|pricing|pilot|privacy|terms|blog(\/[a-z0-9-]{1,120})?)$/;
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|headless|lighthouse/i;

/** The page to count, or null when it isn't a public page. */
export const countedPath = (p: unknown) => (typeof p === "string" && PUBLIC.test(p) ? p : null);
export const isBot = (ua: string | null) => !ua || BOT.test(ua);

/** Where a visit came from: the referring site's host (www. dropped), "direct", or null for an internal click. */
export function sourceOf(referrer: unknown, ownHost: string) {
  if (typeof referrer !== "string" || !referrer) return "direct";
  try {
    const h = new URL(referrer).hostname.replace(/^www\./, "").slice(0, 100);
    return h === ownHost.replace(/^www\./, "") ? null : h;
  } catch { return "direct"; }
}
