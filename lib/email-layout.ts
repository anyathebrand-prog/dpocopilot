// Shared HTML layout for every email except the invitation (lib/email-invite.ts), in the same design.
// brand: set for emails sent on a client's behalf to the public (DSAR replies): their name in the header, no DPO Copilot branding.
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const F = "font-family:'Segoe UI',Helvetica,Arial,sans-serif;";
const URL_RE = /:?\s*(https?:\/\/[^\s]+)/;

export type Layout = { heading: string; text: string; button?: string; brand?: string };

/** The first link in the text becomes the button (labelled `button`, default "Open"); the rest is paragraphs. */
export function layoutHtml({ heading, text, button, brand }: Layout) {
  const url = text.match(URL_RE)?.[1];
  const paras = (url ? text.replace(URL_RE, ".").replace(/\.\.$/, ".") : text).split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    .map((p) => `<p style="margin:0 0 14px; ${F} font-size:15px; line-height:24px; color:#334563;">${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
  const head = brand
    ? `<span style="${F} font-size:18px; font-weight:700; color:#FFFFFF;">${esc(brand)}</span>`
    : `<img src="cid:dpocopilot-logo" width="150" height="40" alt="DPO Copilot" style="display:block; width:150px; height:auto; border:0; color:#FFFFFF; ${F} font-size:18px; font-weight:700;">`;
  const btn = url ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 6px;"><tr><td>
      <a href="${esc(url)}" target="_blank" style="display:inline-block; background:#12336E; color:#FFFFFF; ${F} font-size:16px; font-weight:600; line-height:50px; padding:0 32px; border-radius:10px;">${esc(button ?? "Open")}</a></td></tr></table>
      <p style="margin:12px 0 0; ${F} font-size:13px; line-height:20px; color:#6B7C99;">Button not working? Paste this link into your browser:<br><a href="${esc(url)}" style="color:#1E4FA8; word-break:break-all;">${esc(url)}</a></p>` : "";
  const foot = brand
    ? `Sent by ${esc(brand)} in response to your data protection request.`
    : `DPO Copilot &mdash; compliance workflows for Nigerian data protection teams.<br>Your data is hosted in Nigeria.<br><br><a href="https://www.dpocopilot.ng" style="color:#12336E; font-weight:600;">dpocopilot.ng</a>`;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(heading)}</title></head>
<body style="margin:0; padding:0; background:#EEF2F8;">
<div style="display:none; max-height:0; overflow:hidden; font-size:1px; line-height:1px; color:#EEF2F8;">${esc(text.slice(0, 120))}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#EEF2F8;"><tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:100%;">
  <tr><td style="background:#0A1F44; border-radius:16px 16px 0 0; padding:28px 40px 8px;">${head}</td></tr>
  <tr><td style="background:#0A1F44; padding:16px 40px 32px;"><h1 style="margin:0; ${F} font-size:26px; line-height:34px; font-weight:700; color:#FFFFFF;">${esc(heading)}</h1></td></tr>
  <tr><td style="background:#FFFFFF; padding:32px 40px 36px; border-radius:0 0 16px 16px;">${paras}${btn}</td></tr>
  <tr><td align="center" style="padding:28px 24px 8px; ${F} font-size:12px; line-height:19px; color:#6B7C99;">${foot}</td></tr>
</table></td></tr></table></body></html>`;
}
