import { scryptSync, randomBytes, timingSafeEqual, createHash, createHmac, randomInt } from "node:crypto";

// ponytail: scrypt from node:crypto instead of Argon2id (TRD §6); swap if an audit insists on Argon2.
export function hashPassword(pw: string) {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString("hex")}$${scryptSync(pw, salt, 64).toString("hex")}`;
}

export function verifyPassword(pw: string, stored: string) {
  const [, salt, hash] = stored.split("$");
  if (!salt || !hash) return false;
  const a = scryptSync(pw, Buffer.from(salt, "hex"), 64), b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export const sha256 = (s: string | Buffer) => createHash("sha256").update(s).digest("hex");
export const newToken = () => randomBytes(32).toString("base64url");
export const newOtp = () => String(randomInt(0, 1_000_000)).padStart(6, "0");

// ---------- TOTP (RFC 6238) for MFA, stdlib only ----------
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32(buf: Buffer) {
  let bits = "", out = "";
  for (const b of buf) bits += b.toString(2).padStart(8, "0");
  for (let i = 0; i < bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5).padEnd(5, "0"), 2)];
  return out;
}
function unbase32(s: string) {
  let bits = "";
  for (const c of s.replace(/=+$/, "").toUpperCase()) bits += B32.indexOf(c).toString(2).padStart(5, "0");
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}
export const newTotpSecret = () => base32(randomBytes(20));

export function totp(secret: string, ms = Date.now(), digits = 6) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(ms / 30_000)));
  const h = createHmac("sha1", unbase32(secret)).update(counter).digest();
  const o = h[h.length - 1] & 0xf;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 10 ** digits).padStart(digits, "0");
}
/** Accepts the current code and one step either side for clock drift. */
export const verifyTotp = (secret: string, code: string, ms = Date.now()) =>
  /^\d{6}$/.test(code) && [-30_000, 0, 30_000].some((d) => totp(secret, ms + d) === code);
