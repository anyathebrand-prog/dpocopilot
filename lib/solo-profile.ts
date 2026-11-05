// A Solo DPO's professional details, given at sign-up and shown to the DPCO they ask to work under.
import { imageSize } from "./files";

export const NG_STATES = ["Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT Abuja", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"];
const MAX = 5 * 1024 * 1024;

/** A certificate or CV upload: PDF, PNG or JPEG up to 5 MB, checked by its content, not its name. */
export async function readDoc(f: FormDataEntryValue | null): Promise<{ bytes: Buffer; mime: string; name: string } | null | "bad"> {
  if (!(f instanceof File) || !f.size) return null;
  if (f.size > MAX) return "bad";
  const bytes = Buffer.from(await f.arrayBuffer());
  const mime = bytes.subarray(0, 5).toString("latin1") === "%PDF-" ? "application/pdf" : imageSize(bytes)?.type === "png" ? "image/png" : imageSize(bytes)?.type === "jpeg" ? "image/jpeg" : null;
  return mime ? { bytes, mime, name: f.name.slice(0, 200) } : "bad";
}

export const linkedinOk = (v: string) => !v || /^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/\S+$/i.test(v);
