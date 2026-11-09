"use server";
import { redirect } from "next/navigation";
import { ndpcBlock } from "@/lib/ndpc-guard";
import { requireFirmRole, audit } from "@/lib/auth";
import { one, tx } from "@/lib/db";
import { invite } from "@/lib/invites";
import { insertClient } from "@/lib/clients";
import { str, opt, all } from "@/lib/form";
import { feeFor, startCheckout } from "@/lib/checkout";
import { sizeFor } from "@/lib/client-size";

/** Create a client (from the Add client page, or from a proposal on the Proposals page). */
export async function createClient(fd: FormData) {
  const back = str(fd, "from") === "proposals" ? "/app/proposals" : "/app/clients/new";
  const u = await requireFirmRole("firm_admin", "lead_consultant");
  if (u.plan === "solo") redirect("/app"); // Solo DPOs get clients from accepted proposals or their DPCO
  const name = str(fd, "name");
  if (!name) redirect(`${back}?error=Enter+the+client%27s+name`);
  const why = await ndpcBlock(u.firm_id, name);
  if (why) redirect(`${back}?error=${encodeURIComponent(why)}`);
  const dup = await one("select 1 from clients where firm_id = $1 and lower(name) = lower($2)", [u.firm_id, name]);
  const team = all(fd, "team");
  const contactEmail = str(fd, "contact_email").toLowerCase();
  const subjects = Number(str(fd, "data_subjects_count")), depts = Number(str(fd, "departments_count"));
  if (![subjects, depts].every((n) => Number.isInteger(n) && n >= 0 && n <= 1e9)) redirect(`${back}?error=Enter+the+number+of+data+subjects+and+departments`);
  const size = sizeFor(subjects, depts);
  const fee = await feeFor(size);
  const { clientId, contactId } = await tx(async (t) => {
    const id = await insertClient(t, u.firm_id, u.id, { name, sector: opt(fd, "sector"), size, car_filing_due_on: opt(fd, "car_filing_due_on"), country: opt(fd, "country") });
    for (const m of team) await t.query("insert into client_assignments (client_id, membership_id) select $1, id from memberships where id = $2 and firm_id = $3", [id, m, u.firm_id]);
    let contactId: string | undefined;
    if (contactEmail) {
      const cc = await t.query<{ id: string }>("insert into client_contacts (firm_id, client_id, name, email) values ($1,$2,$3,$4) returning id", [u.firm_id, id, str(fd, "contact_name") || contactEmail, contactEmail]);
      contactId = cc.rows[0].id;
    }
    await t.query("update clients set data_subjects_count = $2, departments_count = $3, checkout_amount = $4 where id = $1", [id, subjects, depts, fee || null]); // fee set: invitations wait for checkout
    await audit(u, "create", "client", id, { client_id: id }, t);
    return { clientId: id, contactId };
  });
  if (fee) { // straight to Paystack; if it can't start, the checkout page offers a retry
    let url: string | null = null;
    try { url = await startCheckout({ id: clientId, firm_id: u.firm_id, name, checkout_amount: fee }, { id: u.id, email: u.email, name: u.name }); } catch (e) { console.error("[paystack]", e); }
    redirect(url ?? `/app/clients/${clientId}/checkout?error=${encodeURIComponent("Payment could not be started. Try again.")}`);
  }
  if (contactId) await invite({ firm_id: u.firm_id, client_id: clientId, contact_id: contactId, email: contactEmail, role: "client_contact", invited_by: u.id });
  redirect(`/app/clients/${clientId}?ok=${encodeURIComponent(dup ? "Client created. Note: another client already has this name." : "Client created")}`);
}
