// Email delivery through Resend's HTTP API (https://resend.com/docs/api-reference/emails/send-email).
// On when RESEND_API_KEY and EMAIL_FROM are set; otherwise messages are only recorded and logged (dev).
// Every email is HTML in the shared layout (lib/email-layout.ts) unless the caller supplies its own, plus the plain text.
import { layoutHtml } from "./email-layout.ts"; // .ts: also loaded directly by node --test

const SUBJECTS: Record<string, string> = {
  invitation: "You've been invited to DPO Copilot", otp: "Your signing code", breach_alert: "Urgent: new breach report",
  evidence_request: "A document has been requested", signoff_request: "A document is waiting for your sign-off",
  tpra_evidence: "Documents requested about a data processor", tia_evidence: "Documents requested about a transfer of personal data abroad", tia_signoff: "A cross-border transfer assessment is waiting for your approval", tpra_signoff: "A processor risk assessment is waiting for your sign-off",
  questionnaire: "Your data protection questionnaire", car_reminder: "Compliance Audit Return reminder",
  invoice_issued: "New invoice", receipt_issued: "Payment receipt", audit_notice: "Compliance Audit Notification",
  dsar_acknowledgement: "We have received your data request", email_changed: "Your login email was changed",
  solo_request: "A Solo DPO wants to work with your firm", solo_decision: "Your DPCO has responded", proposal_review: "A proposal is waiting for your approval", proposal_decision: "Your proposal has been reviewed", withdrawal_request: "Withdrawal request to pay", withdrawal_decision: "Your withdrawal",
};

// Our logo travels inside the email as an inline attachment (cid:), so it shows even before the site is public.
const LOGO_CID = "dpocopilot-logo";
const inlineLogo = async () => ({ filename: "logo.png", content: (await import("node:fs")).readFileSync(`${process.cwd()}/public/logo.png`).toString("base64"), content_id: LOGO_CID });

// Label for the button made from the email's link.
const BUTTONS: Record<string, string> = {
  invitation: "Accept invitation", breach_alert: "View breach", evidence_request: "Open portal", signoff_request: "Review document", tpra_evidence: "Upload documents", tia_evidence: "Upload documents", tia_signoff: "Review and approve", tpra_signoff: "Review and sign",
  questionnaire: "Open questionnaire", solo_request: "Review request", solo_decision: "Open DPO Copilot", proposal_review: "Review proposal", proposal_decision: "Open proposal", withdrawal_request: "Open payouts", withdrawal_decision: "Open wallet", car_reminder: "Open portal", invoice_issued: "View invoice", receipt_issued: "View receipt", audit_notice: "View letter",
};

export const emailOn = () => !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

export type RawFile = { filename: string; content: string }; // content: base64
export async function resendPayload(to: string, template: string, text: string, subject: string | null, fileIds: string[], html?: string, raw: RawFile[] = []) {
  const attachments: { filename: string; content: string; content_id?: string }[] = [...raw];
  if (fileIds.length) {
    // lazy: files.ts imports auth.ts, which imports this module
    const [{ q }, { readStored }] = await Promise.all([import("./db"), import("./files")]);
    for (const f of await q<{ original_name: string; storage_path: string }>("select original_name, storage_path from files where id = any($1)", [fileIds]))
      attachments.push({ filename: f.original_name, content: (await readStored(f.storage_path)).toString("base64") });
  }
  if (html?.includes(`cid:${LOGO_CID}`)) attachments.push(await inlineLogo());
  return { from: process.env.EMAIL_FROM, to: [to], subject: subject ?? SUBJECTS[template] ?? "Notification", text, ...(html ? { html } : {}), ...(attachments.length ? { attachments } : {}) };
}

/** Sends one email. Never throws: a failure is logged and returned as false so the user's action still completes. */
export async function deliver(to: string, template: string, text: string, subject: string | null, fileIds: string[], html?: string, brand?: string, raw: RawFile[] = []): Promise<boolean> {
  html ??= layoutHtml({ heading: subject ?? SUBJECTS[template] ?? "Notification", text, button: BUTTONS[template], brand });
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(await resendPayload(to, template, text, subject, fileIds, html, raw)),
    });
    if (r.ok) return true;
    console.error(`[email] Resend ${r.status} for ${template}: ${(await r.text()).slice(0, 300)}`);
  } catch (e) { console.error(`[email] ${template} failed:`, e); }
  return false;
}
