import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import net from "node:net";
import path from "node:path";
import { q } from "./db";
import { sha256 } from "./crypto";
import { audit, type User } from "./auth";

// ponytail: local disk under ./data/files. Production moves this to Nigeria-hosted S3-compatible storage (TRD §8, FLAG-3).
// Storage keys never contain names or original filenames (schema §7).
const ROOT = path.join(process.cwd(), "data", "files");
const MAX = 25 * 1024 * 1024;
const ALLOWED: Record<string, string> = {
  pdf: "application/pdf", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", csv: "text/csv",
  txt: "text/plain", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", heic: "image/heic",
};
export const ACCEPT = Object.keys(ALLOWED).map((e) => "." + e).join(",");

/** clamd INSTREAM scan (NFR8). Returns null when no scanner is configured. */
function clamScan(buf: Buffer): Promise<boolean | null> {
  const host = process.env.CLAMD_HOST;
  if (!host) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const s = net.connect(Number(process.env.CLAMD_PORT ?? 3310), host);
    let out = "";
    s.on("connect", () => {
      s.write("zINSTREAM\0");
      for (let i = 0; i < buf.length; i += 64 * 1024) {
        const chunk = buf.subarray(i, i + 64 * 1024), len = Buffer.alloc(4);
        len.writeUInt32BE(chunk.length); s.write(len); s.write(chunk);
      }
      s.end(Buffer.alloc(4));
    });
    s.on("data", (d) => (out += d));
    s.on("end", () => resolve(!/FOUND/.test(out)));
    s.on("error", reject);
    s.setTimeout(30_000, () => { s.destroy(); reject(new Error("scan timeout")); });
  });
}

export async function storeUpload(u: User, client: { id: string; firm_id: string }, file: File, evidenceRequestId: string): Promise<string | null> {
  if (!file || !file.size) return "Choose a file.";
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED[ext]) return `${file.name}: this file type isn't allowed. Use PDF, Word, Excel, CSV, text or a photo.`;
  if (file.size > MAX) return `${file.name} is larger than 25 MB.`;
  const buf = Buffer.from(await file.arrayBuffer());
  let clean: boolean | null;
  try { clean = await clamScan(buf); } catch { return "The virus scanner is unavailable. Try again shortly."; }
  if (clean === false) {
    await audit(u, "create", "file_rejected", null, { client_id: client.id, firm_id: client.firm_id, details: { reason: "infected" } });
    return `${file.name} was rejected by the security scan.`;
  }
  if (clean === null && process.env.NODE_ENV === "production") return "File uploads are disabled until the virus scanner is configured.";
  const id = randomUUID();
  const rel = path.join(client.firm_id, client.id, id);
  mkdirSync(path.join(ROOT, client.firm_id, client.id), { recursive: true });
  writeFileSync(path.join(ROOT, rel), buf);
  await q(`insert into files (id, firm_id, client_id, evidence_request_id, original_name, mime, size_bytes, sha256, storage_path, scan_status, uploaded_by)
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [id, client.firm_id, client.id, evidenceRequestId, file.name.slice(0, 200), ALLOWED[ext], file.size, sha256(buf), rel, clean ? "clean" : "unscanned", u.id]);
  await audit(u, "create", "file", id, { client_id: client.id, firm_id: client.firm_id, details: { evidence_request: evidenceRequestId } });
  return null;
}

export const readStored = (rel: string) => readFileSync(path.join(ROOT, rel));
