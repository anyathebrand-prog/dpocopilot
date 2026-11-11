// A new DPIA's first draft: every one of the 13 steps written from the client's records (company profile, onboarding
// answers, RoPA), with [To be completed] where the records are silent. The DPCO edits or adds to any step afterwards.
import { loadCtx } from "./data";
import { DPIA_STEPS, dpiaStep, suggestedRisks, type DpiaBody } from "./templates";

export async function draftDpiaBody(clientId: string, ropaIds: string[], focus: { system?: string; department?: string } = {}): Promise<DpiaBody> {
  const ctx = { ...(await loadCtx(clientId, ropaIds)), ...focus };
  const body: DpiaBody = {};
  for (const s of DPIA_STEPS) {
    if (s.key === "scoring") body.risks_list = suggestedRisks(ctx);
    else body[s.key] = dpiaStep(s.key, ctx);
  }
  return body;
}

/** Documents to upload for a system DPIA. */
export const DPIA_DOCS = ["System Architecture Diagram", "Data Flow Diagram", "Database Design / Schema", "System Requirements Specification", "User Access and Role Matrix",
  "Information Security Policy", "Data Retention and Disposal Policy", "Encryption and Backup Documentation", "API and Third-Party Integration Documentation",
  "Incident and Breach Management Procedures", "Privacy Policy and Consent Mechanism", "Hosting and Cloud Infrastructure Documentation"];
