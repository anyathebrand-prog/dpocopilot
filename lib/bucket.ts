// CloudVantage Bucket-as-a-Service (Nigeria-hosted object storage), docs: https://buckets.cloudvantage.com.ng/bucketaas/docs
// Used for images and PDFs when CLOUDVANTAGE_EMAIL, CLOUDVANTAGE_PASSWORD, BUCKET_PROJECT_ID and BUCKET_NAME are set;
// other files stay on local disk. Server-side only: the credentials and token never reach the browser.
const BASE = (process.env.CLOUDVANTAGE_BASE_URL ?? "https://buckets.cloudvantage.com.ng/bucketaas").replace(/\/$/, "");
const EMAIL = process.env.CLOUDVANTAGE_EMAIL, PASSWORD = process.env.CLOUDVANTAGE_PASSWORD;
const PROJECT = process.env.BUCKET_PROJECT_ID, BUCKET = process.env.BUCKET_NAME;
const REFRESH_MS = 5 * 60 * 1000;

export const bucketOn = () => !!(EMAIL && PASSWORD && PROJECT && BUCKET);

let token: { key: string; expires: number } | null = null;

/** POST /tokens/generate-token. Succeeds on HTTP 2xx (docs say 200, the live API sends 201) with statuscode "00". Never logs the password or key. */
export async function generateToken(): Promise<{ key: string; expires: number }> {
  if (!EMAIL || !PASSWORD) throw new Error("CloudVantage: set CLOUDVANTAGE_EMAIL and CLOUDVANTAGE_PASSWORD.");
  const r = await fetch(`${BASE}/tokens/generate-token`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const j = await r.json().catch(() => ({} as Record<string, string>));
  if (r.status === 400) throw new Error(`CloudVantage token: bad request (${j.error ?? "email and password are required"}).`);
  if (r.status === 502) throw new Error(`CloudVantage token: account service unreachable (${j.error ?? "502"}).`);
  if (!r.ok || j.statuscode !== "00" || !j.key) throw new Error(`CloudVantage token: failed (HTTP ${r.status}, ${j.statusmessage ?? j.error ?? "no key"}).`);
  return { key: j.key, expires: Date.parse(j.expires_at) || Date.now() + 23 * 3600 * 1000 };
}

/** Cached token, regenerated within 5 minutes of expires_at. */
async function getToken(force = false) {
  if (force || !token || token.expires - Date.now() < REFRESH_MS) token = await generateToken();
  return token.key;
}

/** fetch with "AuthToken: Bearer <key>" (the live API rejects the raw key with 403). On 401/403 regenerates the token once and retries once. */
export async function cvFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const go = async (force: boolean) => fetch(`${BASE}/${path.replace(/^\//, "")}`, { ...init, headers: { ...(init.headers as Record<string, string>), AuthToken: `Bearer ${await getToken(force)}` } });
  const r = await go(false);
  return r.status === 401 || r.status === 403 ? go(true) : r;
}

const obj = (p: string) => `${encodeURIComponent(PROJECT!)}/buckets-aas/${encodeURIComponent(BUCKET!)}/${p}`;

/** Uploads privately (no expires_in_hours, so no public link) into folder/name. Throws on failure. */
export async function bucketPut(folder: string, name: string, buf: Buffer, mime: string) {
  // Folder may already exist; a real failure surfaces on the upload below.
  await cvFetch(obj(`create-delete-folder/${encodeURIComponent(folder)}`), { method: "POST" }).catch(() => {});
  const fd = new FormData();
  fd.append("file", new Blob([new Uint8Array(buf)], { type: mime }), name);
  const r = await cvFetch(obj(`upload-object-folder/${encodeURIComponent(folder)}`), { method: "POST", body: fd });
  const body = await r.text();
  if (!r.ok || /"error"/.test(body)) throw new Error(`bucket upload failed (${r.status}): ${body.slice(0, 300)}`);
}

/** Downloads folder/name. The API can answer 200 with a JSON error, so a JSON reply counts as failure. */
export async function bucketGet(folder: string, name: string): Promise<Buffer> {
  const path = obj(`download-object/${encodeURIComponent(folder)}/${encodeURIComponent(name)}`);
  // The live API occasionally resets the connection (ECONNRESET); one retry recovers it.
  const r = await cvFetch(path).catch(() => cvFetch(path));
  if (!r.ok || /json/.test(r.headers.get("content-type") ?? "")) throw new Error(`bucket download failed (${r.status}): ${(await r.text()).slice(0, 300)}`);
  return Buffer.from(await r.arrayBuffer());
}
