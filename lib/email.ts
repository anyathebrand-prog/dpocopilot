// Email delivery through Resend's HTTP API (https://resend.com/docs/api-reference/emails/send-email).
// On when RESEND_API_KEY and EMAIL_FROM are set; otherwise messages are only recorded and logged (dev).

const SUBJECTS: Record<string, string> = {
  invitation: "You've been invited to DPO Copilot", otp: "Your signing code", breach_alert: "Urgent: new breach report",
  evidence_request: "A document has been requested", signoff_request: "A document is waiting for your sign-off",
  questionnaire: "Your data protection questionnaire", car_reminder: "Compliance Audit Return reminder",
  invoice_issued: "New invoice", receipt_issued: "Payment receipt", audit_notice: "Compliance Audit Notification",
  dsar_acknowledgement: "We have received your data request",
};

export const emailOn = () => !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

export async function resendPayload(to: string, template: string, text: string, subject: string | null, fileIds: string[], html?: string) {
  const attachments = [];
  if (fileIds.length) {
    // lazy: files.ts imports auth.ts, which imports this module
    const [{ q }, { readStored }] = await Promise.all([import("./db"), import("./files")]);
    for (const f of await q<{ original_name: string; storage_path: string }>("select original_name, storage_path from files where id = any($1)", [fileIds]))
      attachments.push({ filename: f.original_name, content: (await readStored(f.storage_path)).toString("base64") });
  }
  return { from: process.env.EMAIL_FROM, to: [to], subject: subject ?? SUBJECTS[template] ?? "Notification", text, ...(html ? { html } : {}), ...(attachments.length ? { attachments } : {}) };
}

/** Sends one email. Never throws: a failure is logged and returned as false so the user's action still completes. */
export async function deliver(to: string, template: string, text: string, subject: string | null, fileIds: string[], html?: string): Promise<boolean> {
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(await resendPayload(to, template, text, subject, fileIds, html)),
    });
    if (r.ok) return true;
    console.error(`[email] Resend ${r.status} for ${template}: ${(await r.text()).slice(0, 300)}`);
  } catch (e) { console.error(`[email] ${template} failed:`, e); }
  return false;
}
