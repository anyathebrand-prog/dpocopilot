"use server";
import { redirect } from "next/navigation";
import { syncInvoiceEarnings } from "@/lib/wallet";
import { requireClient, audit, send } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { str, flash } from "@/lib/form";
import { todayWAT } from "@/lib/rules";
import { draftReadinessLetter } from "@/lib/readiness-letter";
import { countryOf, CAR_COUNTRIES } from "@/lib/country";
import { totals } from "@/lib/invoice";

/** Confirm a payment (a % of the invoice, with its own receipt; paid at 100%), or mark it cancelled or unpaid. Used on the Invoices page and a client's Billing page. */
export async function setInvoiceStatus(fd: FormData) {
  const inv = await one("select * from invoices where id = $1", [/^[0-9a-f-]{36}$/.test(str(fd, "id")) ? str(fd, "id") : null]);
  if (!inv) redirect("/forbidden");
  const { user } = await requireClient(inv.client_id, { write: true, unpaid: true }); // works before the client's onboarding fee is paid
  const back = str(fd, "back") === "invoices" ? "/app/billing" : `/app/clients/${inv.client_id}/billing`;
  const status = str(fd, "status");
  if (!["unpaid", "paid", "cancelled"].includes(status)) redirect("/forbidden");
  if (status === "paid") { // a payment of percent% (default: the balance) gets its own receipt; at 100% the invoice is paid
    const paid = Number((await one("select coalesce(sum(percent),0) as s from invoice_payments where invoice_id = $1", [inv.id]))!.s);
    const remaining = Math.max(0, 100 - paid);
    const asked = Number(str(fd, "percent") || remaining);
    if (remaining > 0 && !(asked > 0 && asked <= remaining)) redirect(flash(back, `Choose a percentage up to the ${remaining}% still to be paid.`, "error"));
    let receipt = inv.receipt_no as string | null, pct = 0;
    if (remaining > 0) {
      pct = asked;
      const year = todayWAT().slice(0, 4);
      const n = (await one<{ n: number }>("select count(*)::int as n from invoice_payments where firm_id = $1 and receipt_no like $2", [inv.firm_id, `RCT-${year}-%`]))!.n;
      receipt = `RCT-${year}-${String(n + 1).padStart(3, "0")}`;
      const total = totals(inv.lines, Number(inv.vat_rate)).total;
      await q("insert into invoice_payments (invoice_id, firm_id, percent, amount, receipt_no, paid_on, created_by) values ($1,$2,$3,$4,$5,$6,$7)",
        [inv.id, inv.firm_id, pct, Math.round(total * pct) / 100, receipt, todayWAT(), user.id]);
    }
    const full = paid + pct >= 100;
    const contacts = await q<{ email: string }>("select email from client_contacts where client_id = $1 and status = 'active'", [inv.client_id]);
    if (pct) for (const c of contacts) await send("email", c.email, "receipt_issued", `${user.firm_name} has received your payment${pct < 100 ? ` of ${pct}%` : ""} for invoice ${inv.number}. Your receipt ${receipt} is ready. Log in to download it: ${process.env.APP_URL ?? "http://localhost:3000"}/portal/invoices`);
    if (!full) {
      await audit(user, "update", "invoice", inv.id, { client_id: inv.client_id, details: { payment_percent: pct, receipt } });
      redirect(flash(back, `${pct}% payment confirmed. Receipt ${receipt} generated${contacts.length ? " and the client notified" : ""}. ${100 - paid - pct}% is still to be paid.`));
    }
    await q("update invoices set status = 'paid', paid_on = $2, receipt_no = $3 where id = $1", [inv.id, todayWAT(), receipt]);
    await syncInvoiceEarnings(inv.id); // paid → team / Solo DPO shares
    const car = CAR_COUNTRIES.includes(countryOf((await one("select country from clients where id = $1", [inv.client_id]))?.country).code);
    if (car) await draftReadinessLetter(inv.id, user.id); // the CAR audit can start: draft the readiness letter for the client
    await audit(user, "update", "invoice", inv.id, { client_id: inv.client_id, details: { status, receipt, payment_percent: pct } });
    redirect(flash(back, `Paid in full. ${pct ? `Receipt ${receipt} generated${contacts.length ? " and the client notified" : ""}.` : ""} ${car ? " Audit readiness letter drafted under Documents." : ""}`));
  }
  await q("update invoices set status = $2, paid_on = null where id = $1", [inv.id, status]);
  await syncInvoiceEarnings(inv.id); // unpaid or cancelled → shares removed
  await audit(user, "update", "invoice", inv.id, { client_id: inv.client_id, details: { status } });
  redirect(flash(back, status === "paid" ? "Marked as paid" : status === "cancelled" ? "Invoice cancelled" : "Marked as unpaid"));
}
