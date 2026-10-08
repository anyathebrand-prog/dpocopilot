// Client invoices: services in the DPCO's scope, totals, and the printable invoice.
import { CSS } from "./car-report";
import { fmtDate } from "./rules";

export const SERVICES = [
  "NDPC DCMI/DPMI Registration",
  "Compliance Audit Assessment (CAR)",
  "CAR Filing",
  "Data Protection Impact Assessment (DPIA)",
  "Legitimate Interest Assessment (LIA)",
  "Cross-Border Risk Assessment (CBRA)",
  "Record of Processing Activity (RoPA) Documentation",
  "Policy Development",
  "Data Protection Officer (DPO) Training and Certification",
  "Employee Data Protection Training",
];
export type Line = { service: string; description: string; amount: number };

export const naira = (n: number) => "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export function totals(lines: Line[], vatRate: number) {
  const subtotal = lines.reduce((s, l) => s + l.amount, 0), vat = Math.round(subtotal * vatRate) / 100;
  return { subtotal, vat, total: subtotal + vat };
}

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const lines2 = (...xs: unknown[]) => xs.filter((x) => x && String(x).trim()).map(esc).join("<br>");

export function invoiceHtml(inv: any, firm: any, client: { name: string; address?: string | null; email?: string | null; phone?: string | null }) {
  const vatRate = Number(inv.vat_rate), t = totals(inv.lines, vatRate);
  const body = `
<table><tr><td style="background:#0d1f4a;color:#FFFFFF;padding:14px"><p style="margin:0;color:#FFFFFF;font-size:18pt"><b>${esc(firm.name)}</b></p>
  <p style="margin:2px 0 0;color:#FFFFFF">${lines2(firm.address, [firm.phone, firm.email].filter(Boolean).join(" · "), firm.website)}</p></td>
  <td style="background:#0d1f4a;color:#FFFFFF;text-align:right;width:35%"><p style="margin:0;color:#FFFFFF;font-size:22pt"><b>INVOICE</b></p></td></tr></table>
<table>
  <tr><td class="k">Bill to</td><td><b>${esc(client.name)}</b>${client.address || client.email || client.phone ? "<br>" + lines2(client.address, [client.phone, client.email].filter(Boolean).join(" · ")) : ""}</td></tr>
  <tr><td class="k">Invoice number</td><td>${esc(inv.number)}</td></tr>
  <tr><td class="k">Invoice date</td><td>${fmtDate(inv.issued_on)}</td></tr>
  ${inv.due_on ? `<tr><td class="k">Due date</td><td>${fmtDate(inv.due_on)}</td></tr>` : ""}
  ${inv.status === "paid" ? `<tr><td class="k">Status</td><td><b>PAID</b>${inv.paid_on ? ` on ${fmtDate(inv.paid_on)}` : ""}</td></tr>` : ""}
</table>
<table><tr><th style="width:6%">S/N</th><th>Service</th><th style="width:24%;text-align:right">Amount (₦)</th></tr>
  ${inv.lines.map((l: Line, i: number) => `<tr><td>${i + 1}</td><td><b>${esc(l.service)}</b>${l.description ? `<br>${esc(l.description)}` : ""}</td><td style="text-align:right">${naira(l.amount)}</td></tr>`).join("")}
  <tr class="sub"><td></td><td>Subtotal</td><td style="text-align:right">${naira(t.subtotal)}</td></tr>
  ${vatRate ? `<tr class="sub"><td></td><td>VAT (${vatRate}%)</td><td style="text-align:right">${naira(t.vat)}</td></tr>` : ""}
  <tr class="sub"><td></td><td><b>Total due</b></td><td style="text-align:right"><b>${naira(t.total)}</b></td></tr></table>
${inv.notes ? `<h3>Notes and payment details</h3><p>${esc(inv.notes).replace(/\n/g, "<br>")}</p>` : ""}
<p style="margin-top:28px">${lines2(firm.signatory_name, firm.signatory_title)}<br>For: ${esc(firm.name)}</p>`;
  return { title: `Invoice ${inv.number} - ${client.name}`, css: CSS(`${firm.name} · Invoice ${inv.number}`), body };
}
