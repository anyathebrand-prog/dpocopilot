// Usage example and live check: generates a token, then makes one authenticated call (GET /projects).
// Run: node --env-file=.env.local scripts/cloudvantage-check.ts
import { generateToken, cvFetch } from "../lib/bucket.ts";

const t = await generateToken();
console.log(`Token OK, expires ${new Date(t.expires).toISOString()}`); // the key itself is never printed
const r = await cvFetch("projects");
console.log(`GET /projects -> ${r.status}`, await r.text());
