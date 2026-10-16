// Client invoices: services in the DPCO's scope, totals, and the printable invoice.
import { CSS } from "./car-report";
import { fmtDate } from "./rules";
import { money, moneyIn } from "./country";

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

/** Amount in the install's currency (kept as `naira` for existing callers). */
export const naira = money;
/** Sum of invoice totals, per currency: "₦1,000.00" or "₦1,000.00 + GH₵500.00" (₦0.00 when empty). */
export function sumMoney(rows: Record<string, any>[]) {
  const by = new Map<string | null, number>();
  for (const r of rows) by.set(r.currency ?? null, (by.get(r.currency ?? null) ?? 0) + totals(r.lines, Number(r.vat_rate)).total);
  return by.size ? [...by].map(([c, n]) => moneyIn(c, n)).join(" + ") : money(0);
}
export function totals(lines: Line[], vatRate: number) {
  const subtotal = lines.reduce((s, l) => s + l.amount, 0), vat = Math.round(subtotal * vatRate) / 100;
  return { subtotal, vat, total: subtotal + vat };
}

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const lines2 = (...xs: unknown[]) => xs.filter((x) => x && String(x).trim()).map(esc).join("<br>");

/** Invoice, or with receipt = true the payment receipt for a paid invoice (same layout, "RECEIPT", amount paid). */
export function invoiceHtml(inv: any, firm: any, client: { name: string; address?: string | null; email?: string | null; phone?: string | null }, receipt = false) {
  const m = (n: number) => moneyIn(inv.currency, n);
  const vatRate = Number(inv.vat_rate), t = totals(inv.lines, vatRate), doc = receipt ? "RECEIPT" : "INVOICE";
  const body = `
${firm.logo ? `<p><img src="${firm.logo}" width="${Math.round(firm.logo_w * 60 / firm.logo_h)}" height="60" alt="${esc(firm.name)}" style="height:60px;width:auto"></p>` : ""}
<table><tr><td style="background:#0d1f4a;color:#FFFFFF;padding:14px"><p style="margin:0;color:#FFFFFF;font-size:18pt"><b>${esc(firm.name)}</b></p>
  <p style="margin:2px 0 0;color:#FFFFFF">${lines2(firm.address, [firm.phone, firm.email].filter(Boolean).join(" · "), firm.website)}</p></td>
  <td style="background:#0d1f4a;color:#FFFFFF;text-align:right;width:35%"><p style="margin:0;color:#FFFFFF;font-size:22pt"><b>${doc}</b></p></td></tr></table>
<table>
  <tr><td class="k">${receipt ? "Received from" : "Bill to"}</td><td><b>${esc(client.name)}</b>${client.address || client.email || client.phone ? "<br>" + lines2(client.address, [client.phone, client.email].filter(Boolean).join(" · ")) : ""}</td></tr>
  ${receipt ? `<tr><td class="k">Receipt number</td><td>${esc(inv.receipt_no)}</td></tr><tr><td class="k">Payment date</td><td>${fmtDate(inv.paid_on)}</td></tr>` : ""}
  <tr><td class="k">Invoice number</td><td>${esc(inv.number)}</td></tr>
  <tr><td class="k">Invoice date</td><td>${fmtDate(inv.issued_on)}</td></tr>
  ${inv.due_on && !receipt ? `<tr><td class="k">Due date</td><td>${fmtDate(inv.due_on)}</td></tr>` : ""}
  ${inv.status === "paid" && !receipt ? `<tr><td class="k">Status</td><td><b>PAID</b>${inv.paid_on ? ` on ${fmtDate(inv.paid_on)}` : ""}</td></tr>` : ""}
</table>
<table><tr><th style="width:6%">S/N</th><th>Service</th><th style="width:24%;text-align:right">Amount (${m(0).replace(/[\d.,\s]/g, "")})</th></tr>
  ${inv.lines.map((l: Line, i: number) => `<tr><td>${i + 1}</td><td><b>${esc(l.service)}</b>${l.description ? `<br>${esc(l.description)}` : ""}</td><td style="text-align:right">${m(l.amount)}</td></tr>`).join("")}
  <tr class="sub"><td></td><td>Subtotal</td><td style="text-align:right">${m(t.subtotal)}</td></tr>
  ${vatRate ? `<tr class="sub"><td></td><td>VAT (${vatRate}%)</td><td style="text-align:right">${m(t.vat)}</td></tr>` : ""}
  <tr class="sub"><td></td><td><b>${receipt ? "Amount paid" : "Total due"}</b></td><td style="text-align:right"><b>${m(t.total)}</b></td></tr></table>
${receipt ? `<p><b>Payment of ${m(t.total)} received in full, with thanks.</b></p>` : ""}
${inv.notes && !receipt ? `<h3>Notes and payment details</h3><p>${esc(inv.notes).replace(/\n/g, "<br>")}</p>` : ""}
<p style="margin-top:28px">${lines2(firm.signatory_name, firm.signatory_title)}<br>For: ${esc(firm.name)}</p>`;
  const name = receipt ? `Receipt ${inv.receipt_no}` : `Invoice ${inv.number}`;
  return { title: `${name} - ${client.name}`, css: CSS(`${firm.name} · ${name}`), body };
}
