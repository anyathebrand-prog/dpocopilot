// CloudVantage Bucket-as-a-Service (Nigeria-hosted object storage), docs: https://buckets.cloudvantage.com.ng/bucketaas/docs
// Used for images and PDFs when BUCKET_API_KEY, BUCKET_PROJECT_ID and BUCKET_NAME are set; other files stay on local disk.
const BASE = (process.env.BUCKET_BASE_URL ?? "https://buckets.cloudvantage.com.ng/bucketaas").replace(/\/$/, "");
const KEY = process.env.BUCKET_API_KEY, PROJECT = process.env.BUCKET_PROJECT_ID, BUCKET = process.env.BUCKET_NAME;

export const bucketOn = () => !!(KEY && PROJECT && BUCKET);
const url = (p: string) => `${BASE}/${encodeURIComponent(PROJECT!)}/buckets-aas/${encodeURIComponent(BUCKET!)}/${p}`;
const auth = () => ({ AuthToken: `Bearer ${KEY}` });

/** Uploads privately (no expires_in_hours, so no public link) into folder/name. Throws on failure. */
export async function bucketPut(folder: string, name: string, buf: Buffer, mime: string) {
  // Folder may already exist; a failure here surfaces on the upload below.
  await fetch(url(`create-delete-folder/${encodeURIComponent(folder)}`), { method: "POST", headers: auth() }).catch(() => {});
  const fd = new FormData();
  fd.append("file", new Blob([new Uint8Array(buf)], { type: mime }), name);
  const r = await fetch(url(`upload-object-folder/${encodeURIComponent(folder)}`), { method: "POST", headers: auth(), body: fd });
  const body = await r.text();
  if (!r.ok || /"error"/.test(body)) throw new Error(`bucket upload failed (${r.status}): ${body.slice(0, 300)}`);
}

/** Downloads folder/name. The API can answer 200 with a JSON error, so a JSON reply counts as failure. */
export async function bucketGet(folder: string, name: string): Promise<Buffer> {
  const r = await fetch(url(`download-object/${encodeURIComponent(folder)}/${encodeURIComponent(name)}`), { headers: auth() });
  if (!r.ok || /json/.test(r.headers.get("content-type") ?? "")) throw new Error(`bucket download failed (${r.status}): ${(await r.text()).slice(0, 300)}`);
  return Buffer.from(await r.arrayBuffer());
}
