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
  mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm",
};
const VIDEO = new Set(["mp4", "mov", "webm"]), MAX_VIDEO = 100 * 1024 * 1024;
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
  const r = await storeFile(u, client, file, evidenceRequestId);
  return "error" in r ? r.error : null;
}

/** Validate, scan and store one upload for a client; returns the file id, or a message for the user. */
export async function storeFile(u: User, client: { id: string; firm_id: string }, file: File, evidenceRequestId: string | null): Promise<{ id: string } | { error: string }> {
  const fail = (error: string) => ({ error });
  if (!file || !file.size) return fail("Choose a file.");
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED[ext]) return fail(`${file.name}: this file type isn't allowed. Use PDF, Word, Excel, CSV, text, a photo or a video (MP4, MOV, WebM).`);
  if (VIDEO.has(ext) ? file.size > MAX_VIDEO : file.size > MAX) return fail(`${file.name} is larger than ${VIDEO.has(ext) ? "100" : "25"} MB.`);
  const buf = Buffer.from(await file.arrayBuffer());
  let clean: boolean | null;
  try { clean = await clamScan(buf); } catch { return fail("The virus scanner is unavailable. Try again shortly."); }
  if (clean === false) {
    await audit(u, "create", "file_rejected", null, { client_id: client.id, firm_id: client.firm_id, details: { reason: "infected" } });
    return fail(`${file.name} was rejected by the security scan.`);
  }
  if (clean === null && process.env.NODE_ENV === "production") return fail("File uploads are disabled until the virus scanner is configured.");
  const id = randomUUID();
  const rel = path.join(client.firm_id, client.id, id);
  mkdirSync(path.join(ROOT, client.firm_id, client.id), { recursive: true });
  writeFileSync(path.join(ROOT, rel), buf);
  await q(`insert into files (id, firm_id, client_id, evidence_request_id, original_name, mime, size_bytes, sha256, storage_path, scan_status, uploaded_by)
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [id, client.firm_id, client.id, evidenceRequestId, file.name.slice(0, 200), ALLOWED[ext], file.size, sha256(buf), rel, clean ? "clean" : "unscanned", u.id]);
  await audit(u, "create", "file", id, { client_id: client.id, firm_id: client.firm_id, details: { evidence_request: evidenceRequestId } });
  return { id };
}

/** Width and height of a PNG or JPEG, or null for anything else. */
export function imageSize(b: Buffer): { type: "png" | "jpeg"; w: number; h: number } | null {
  if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) return { type: "png", w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  if (b[0] !== 0xff || b[1] !== 0xd8) return null;
  for (let i = 2; i + 9 < b.length;) {
    if (b[i] !== 0xff) return null;
    const m = b[i + 1], len = b.readUInt16BE(i + 2);
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { type: "jpeg", w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5) };
    i += 2 + len;
  }
  return null;
}

export const readStored = (rel: string) => readFileSync(path.join(ROOT, rel));
