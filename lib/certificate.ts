// CDPO certificate details from a PDF's text: certifying body, certificate number, issue and expiry dates.
// ponytail: text PDFs only; scanned certificates (images) have no text and need OCR, so the fields stay for typing.

export type CertDetails = { body: string | null; number: string | null; issued: string | null; expires: string | null };

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const DATE = /\b(\d{1,2})(?:st|nd|rd|th)?[\s\-\/.]+([A-Za-z]{3,9}|\d{1,2})[\s,\-\/.]+(\d{4})\b|\b([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b|\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g;

function iso(y: number, m: number, d: number) {
  if (!(y >= 1990 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31)) return null;
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCMonth() === m - 1 ? t.toISOString().slice(0, 10) : null; // rejects 31 February etc.
}
const month = (s: string) => (/^\d+$/.test(s) ? Number(s) : MONTHS.indexOf(s.slice(0, 3).toLowerCase()) + 1 || NaN);

/** Every date in the text, in order, as YYYY-MM-DD. Numeric dates are read day-first (Nigeria: 12/03/2025 = 12 March). */
export function findDates(text: string): { at: number; date: string }[] {
  const out: { at: number; date: string }[] = [];
  for (const m of text.matchAll(DATE)) {
    const date = m[1] ? iso(+m[3], month(m[2]), +m[1]) : m[4] ? iso(+m[6], month(m[4]), +m[5]) : iso(+m[7], +m[8], +m[9]);
    if (date) out.push({ at: m.index!, date });
  }
  return out;
}

const ISSUED = /\b(date\s+of\s+(issue|award)|issue\s+date|issued(\s+on)?|date\s+issued|awarded(\s+on)?|certified\s+on|effective\s+(date|from))\b/i;
const EXPIRES = /\b(expiry\s+date|expiration\s+date|date\s+of\s+expiry|expires(\s+on)?|expiry|valid\s+(until|till|through|thru|to)|validity)\b/i;

/** The first date within 80 characters after a label. */
function labelled(text: string, label: RegExp, dates: { at: number; date: string }[]) {
  const m = label.exec(text);
  if (!m) return null;
  const from = m.index + m[0].length;
  return dates.find((d) => d.at >= from && d.at <= from + 80)?.date ?? null;
}

const KNOWN_BODIES: [RegExp, string][] = [
  [/\bIAPP\b|International Association of Privacy Professionals/i, "International Association of Privacy Professionals (IAPP)"],
  [/\bPECB\b/i, "PECB"],
  [/\bEXIN\b/i, "EXIN"],
  [/\bBCS\b|British Computer Society/i, "BCS, The Chartered Institute for IT"],
  [/\bISACA\b/i, "ISACA"],
  [/Nigeria Data Protection Commission|\bNDPC\b/i, "Nigeria Data Protection Commission (NDPC)"],
];
const ORG = /\b(institute|institution|association|academy|council|commission|board|society|foundation|university|college|authority|centre|center|limited|ltd|plc)\b/i;
const NOT_BODY = /\b(this is to certify|certify that|awarded to|presented to|has (successfully )?completed|signature|signed)\b/i;

const NUMBER_LABELLED = /\b(?:certificate|cert|credential|registration|reg|licen[cs]e|membership|serial)\.?\s*(?:no|number|num|id|#)\.?\s*[:#\-]?\s*((?=[A-Z0-9\/\-.]*\d)[A-Z0-9][A-Z0-9\/\-.]{2,})/i;
const NUMBER_CODE = /\b[A-Z]{2,}[\/\-](?=[A-Z0-9\/\-]*\d)[A-Z0-9][A-Z0-9\/\-]*\b/;

export function parseCertificate(text: string): CertDetails {
  const flat = text.replace(/[ \t]+/g, " ");
  const dates = findDates(flat);
  let issued = labelled(flat, ISSUED, dates), expires = labelled(flat, EXPIRES, dates);
  const sorted = [...new Set(dates.map((d) => d.date))].sort();
  if (!issued && sorted.length) issued = sorted.find((d) => d !== expires) ?? null;
  if (!expires && sorted.length >= 2 && sorted.at(-1) !== issued) expires = sorted.at(-1)!;

  const number = (NUMBER_LABELLED.exec(flat)?.[1] ?? NUMBER_CODE.exec(flat)?.[0] ?? null)?.replace(/[.\-\/]+$/, "") ?? null;

  const known = KNOWN_BODIES.find(([re]) => re.test(flat))?.[1];
  const line = flat.split(/\r?\n/).map((l) => l.trim()).find((l) => l.length > 3 && l.length <= 100 && ORG.test(l) && !NOT_BODY.test(l));
  return { body: known ?? line ?? null, number, issued, expires };
}

/** Plain text of a PDF ("" for scanned/image-only PDFs or unreadable files). */
export async function pdfText(bytes: Uint8Array): Promise<string> {
  try {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const { text } = await extractText(await getDocumentProxy(new Uint8Array(bytes)), { mergePages: true });
    return text;
  } catch {
    return "";
  }
}
