/** Public base URL of this install, for sitemap, robots, Open Graph and llms.txt. */
export const SITE_URL = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
