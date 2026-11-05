/** Public base URL of this install, for sitemap, robots, Open Graph and llms.txt. Tolerates APP_URL set without https://. */
const raw = (process.env.APP_URL ?? "http://localhost:3000").trim().replace(/\/+$/, "");
const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
export const SITE_URL = URL.canParse(withScheme) ? withScheme : "http://localhost:3000";
