import { timingSafeEqual } from "node:crypto";
import { one } from "./db";

/** Per-install settings for a DPCO's own copy (deploy/README.md). Read at request time: the root layout calls
 *  connection(), so one build serves every install. Unset = the shared DPO Copilot site with open sign-up. */
export const INSTALL = {
  singleFirm: process.env.SINGLE_FIRM === "1",
  name: process.env.BRAND_NAME || "DPO Copilot",
  logo: process.env.BRAND_LOGO || "/logo.png",
};

/** Header branding for single-firm installs (the DPCO's logo, no marketing nav); undefined on the shared site. */
export const headerBrand = INSTALL.singleFirm ? { name: INSTALL.name, logo: INSTALL.logo } : undefined;

/** A DPCO's own install takes exactly one firm, created at handover with the install's SETUP_TOKEN. The shared site is open (FLAG-1). */
export async function signUpOpen(token: string) {
  if (!INSTALL.singleFirm) return true;
  const want = Buffer.from(process.env.SETUP_TOKEN ?? ""), got = Buffer.from(token);
  if (!want.length || want.length !== got.length || !timingSafeEqual(want, got)) return false;
  return !(await one("select 1 from firms limit 1"));
}
