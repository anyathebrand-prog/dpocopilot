"use server";
import { redirect } from "next/navigation";
import { syncInvoiceEarnings } from "@/lib/wallet";
import { requireClient, audit, send } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { str, flash } from "@/lib/form";
import { todayWAT } from "@/lib/rules";
import { draftReadinessLetter } from "@/lib/readiness-letter";
import { countryOf, CAR_COUNTRIES } from "@/lib/country";

/** Mark an invoice paid (receipt generated, client told), cancelled or unpaid. Used on the Invoices page and a client's Billing page. */
export async function setInvoiceStatus(fd: FormData) {
  const inv = await one("select * from invoices where id = $1", [/^[0-9a-f-]{36}$/.test(str(fd, "id")) ? str(fd, "id") : null]);
  if (!inv) redirect("/forbidden");
  const { user } = await requireClient(inv.client_id, { write: true, unpaid: true }); // works before the client's onboarding fee is paid
  const back = str(fd, "back") === "invoices" ? "/app/billing" : `/app/clients/${inv.client_id}/billing`;
  const status = str(fd, "status");
  if (!["unpaid", "paid", "cancelled"].includes(status)) redirect("/forbidden");
  await q("update invoices set status = $2, paid_on = $3 where id = $1", [inv.id, status, status === "paid" ? todayWAT() : null]);
  await syncInvoiceEarnings(inv.id); // paid → team / Solo DPO shares; unpaid or cancelled → shares removed
  if (status === "paid") { // Receipt generated automatically; the client is told it's in the portal.
    let receipt = inv.receipt_no;
    if (!receipt) {
      const year = todayWAT().slice(0, 4);
      const n = (await one<{ n: number }>("select count(*)::int as n from invoices where firm_id = $1 and receipt_no like $2", [inv.firm_id, `RCT-${year}-%`]))!.n;
      receipt = `RCT-${year}-${String(n + 1).padStart(3, "0")}`;
      await q("update invoices set receipt_no = $2 where id = $1", [inv.id, receipt]);
    }
    const contacts = await q<{ email: string }>("select email from client_contacts where client_id = $1 and status = 'active'", [inv.client_id]);
    for (const c of contacts) await send("email", c.email, "receipt_issued", `${user.firm_name} has received your payment for invoice ${inv.number}. Your receipt ${receipt} is ready. Log in to download it: ${process.env.APP_URL ?? "http://localhost:3000"}/portal/invoices`);
    const car = CAR_COUNTRIES.includes(countryOf((await one("select country from clients where id = $1", [inv.client_id]))?.country).code);
    if (car) await draftReadinessLetter(inv.id, user.id); // the CAR audit can start: draft the readiness letter for the client
    await audit(user, "update", "invoice", inv.id, { client_id: inv.client_id, details: { status, receipt } });
    redirect(flash(back, `Marked as paid. Receipt ${receipt} generated${contacts.length ? " and the client notified" : ""}. ${car ? " Audit readiness letter drafted under Documents." : ""}`));
  }
  await audit(user, "update", "invoice", inv.id, { client_id: inv.client_id, details: { status } });
  redirect(flash(back, status === "paid" ? "Marked as paid" : status === "cancelled" ? "Invoice cancelled" : "Marked as unpaid"));
}
