// Compliance Audit Notification Letter: tells each client to prepare for the coming year's data protection compliance audit
// and Compliance Audit Return (GAID Art. 10), with the engagement invoice enclosed.
import { one } from "./db";
import { answersOf } from "./data";
import { fmtDate, todayWAT } from "./rules";
import { CSS } from "./car-report";
import { invoiceHtml, naira, totals } from "./invoice";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
export const noticeInitials = (n: string) => n.split(/\s+/).filter((w) => /^[A-Za-z]/.test(w) && !/^(ltd|limited|plc|of|and|the)\.?$/i.test(w)).map((w) => w[0].toUpperCase()).join("").slice(0, 8);

export async function loadAuditNotice(id: string) {
  const n = await one("select * from audit_notices where id = $1", [id]);
  if (!n) return null;
  const firm = (await one("select * from firms where id = $1", [n.firm_id]))!;
  const c = (await one("select name, mi_class from clients where id = $1", [n.client_id]))!;
  const inv = n.invoice_id ? await one("select * from invoices where id = $1", [n.invoice_id]) : null;
  return { n, firm, client: c, inv, ans: await answersOf(n.client_id) };
}

/** The letter, then the attached invoice on the next page (the enclosure). */
export function auditNoticeHtml({ n, firm, client, inv, ans }: NonNullable<Awaited<ReturnType<typeof loadAuditNotice>>>) {
  const s = (k: string) => (typeof ans[k] === "string" && (ans[k] as string).trim() ? (ans[k] as string).trim() : "");
  const org = s("org_legal_name") || client.name, year = Number(n.audit_year), due = `31 March ${year + 1}`;
  const dpo = s("dpo_name"), dcpmi = client.mi_class === "major_importance";
  const total = inv ? totals(inv.lines, Number(inv.vat_rate)).total : 0;
  const logo = firm.logo && firm.logo_w && firm.logo_h ? `<img src="${firm.logo}" width="${Math.round((firm.logo_w * 56) / firm.logo_h)}" height="56" alt="${esc(firm.name)}" style="height:56px;width:auto">` : `<b>${esc(firm.name)}</b>`;
  const clientInfo = { name: org, address: s("org_address"), email: s("org_email"), phone: s("org_phone") };
  const body = `
<section>
<table><tr><td style="width:24%">${logo}</td>
  <td><p style="margin:0"><b>${esc(firm.name)}</b></p><p style="margin:0;font-size:8.5pt">${[firm.address, firm.email, firm.website, firm.phone, firm.rc_number ? `RC: ${firm.rc_number}` : null].filter(Boolean).map(esc).join("<br>")}</p></td>
  <td style="width:18%;text-align:right"><p style="margin:0;font-size:8pt"><b>DPCO</b>${firm.ndpc_licence_no ? `<br>${esc(firm.ndpc_licence_no)}` : ""}</p></td></tr></table>
<p>Our Ref: ${esc(n.our_ref)}<br>Date: ${fmtDate(String(n.letter_date ?? todayWAT()))}</p>
<p>${dpo ? `${esc(dpo)}<br>` : ""}The Data Protection Officer<br><b>${esc(org)}</b>${s("org_address") ? `<br>${esc(s("org_address")).replace(/,\s*/g, ",<br>")}` : ""}</p>
<p>Dear ${dpo ? esc(dpo) : "Sir/Madam"},</p>
<p><b><u>RE: NOTIFICATION OF ${year} DATA PROTECTION COMPLIANCE AUDIT AND COMPLIANCE AUDIT RETURN (CAR) FILING</u></b></p>
<p>As ${esc(org)}'s Data Protection Compliance Organisation, we write to notify you of the annual data protection compliance audit for the ${year} audit year, and to ask that ${esc(org)} begins preparing for it now.</p>
<h3>1. The Obligation</h3>
<p>Under the Nigeria Data Protection Act, 2023 (NDPA) and the General Application and Implementation Directive (GAID) 2025, every data controller or processor of major importance must conduct an annual data protection compliance audit and file its Compliance Audit Return (CAR) with the Nigeria Data Protection Commission (NDPC) through a licensed Data Protection Compliance Organisation.${dcpmi ? ` ${esc(org)} is classified as a data controller or processor of major importance, so this obligation applies.` : ""}</p>
<table>
  <tr><td class="k">Audit period</td><td>1 January – 31 December ${year}</td></tr>
  <tr><td class="k">CAR filing deadline</td><td><b>${due}</b></td></tr>
  <tr><td class="k">Late filing</td><td>An administrative penalty of 50% of the applicable filing fee, in addition to the NDPC's wider enforcement powers under section 48 of the NDPA</td></tr>
</table>
<h3>2. What to Prepare</h3>
<p>To keep the audit efficient, we recommend that ${esc(org)}:</p>
<ul>
  <li>confirms its Data Protection Officer and a liaison officer for the audit;</li>
  <li>updates its Record of Processing Activities for any new systems, vendors or processing since the last audit;</li>
  <li>gathers evidence of policies, privacy notices, consent records, data subject requests, breach records, DPIAs, training and vendor agreements for the period;</li>
  <li>closes out open actions from the previous audit's remediation plan;</li>
  <li>confirms a convenient commencement date for fieldwork, ideally early in the year so the CAR is filed well ahead of ${due}.</li>
</ul>
<p>Once the engagement is confirmed, we will send a detailed Audit Readiness Letter listing the documents and evidence to be made available.</p>
<h3>3. Engagement and Fees</h3>
<p>${inv ? `Our invoice <b>${esc(inv.number)}</b> for ${naira(total)} covering the ${year} engagement is enclosed. Settlement confirms the engagement and allows us to schedule the audit.` : `Our invoice for the ${year} engagement will follow under separate cover.`} Statutory fees payable to the NDPC are billed at cost where applicable.</p>
<p>We value our relationship with ${esc(org)} and look forward to supporting another year of demonstrable compliance. Please contact us with any questions.</p>
<p>Yours faithfully,</p>
<p><b>For: ${esc(firm.name).toUpperCase()}</b></p>
<p style="margin-top:32px"><b>${esc(firm.signatory_name ?? "")}</b>${firm.signatory_credentials ? `, ${esc(firm.signatory_credentials)}` : ""}<br>${esc(firm.signatory_title ?? "")}</p>
${inv ? `<p class="note">Enclosure: Invoice ${esc(inv.number)}</p>` : ""}
</section>
${inv ? `<section class="break">${invoiceHtml(inv, firm, clientInfo).body}</section>` : ""}`;
  return { title: `${org} Compliance Audit Notification ${year}`, css: CSS(`${firm.name} · ${n.our_ref}`), body };
}
