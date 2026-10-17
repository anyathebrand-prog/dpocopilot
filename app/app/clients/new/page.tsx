import Link from "next/link";
import { redirect } from "next/navigation";
import { requireFirmRole, audit, ROLE_LABEL } from "@/lib/auth";
import { q, one, tx } from "@/lib/db";
import { invite } from "@/lib/invites";
import { insertClient } from "@/lib/clients";
import { str, opt, all } from "@/lib/form";
import { Field, PageHead } from "@/components/ui";
import { Submit } from "@/components/client";
import { COUNTRIES, COUNTRY, money } from "@/lib/country";
import { SIZES, feeFor } from "@/lib/checkout";

async function createClient(fd: FormData) {
  "use server";
  const u = await requireFirmRole("firm_admin", "lead_consultant");
  const name = str(fd, "name");
  if (!name) redirect("/app/clients/new?error=Enter+the+client%27s+name");
  const dup = await one("select 1 from clients where firm_id = $1 and lower(name) = lower($2)", [u.firm_id, name]);
  const team = all(fd, "team");
  const contactEmail = str(fd, "contact_email").toLowerCase();
  const size = SIZES.some(([k]) => k === str(fd, "size")) ? str(fd, "size") : null;
  if (!size) redirect("/app/clients/new?error=Choose+the+client%27s+size");
  const fee = await feeFor(size);
  const { clientId, contactId } = await tx(async (t) => {
    const id = await insertClient(t, u.firm_id, u.id, { name, sector: opt(fd, "sector"), size, car_filing_due_on: opt(fd, "car_filing_due_on"), country: opt(fd, "country") });
    for (const m of team) await t.query("insert into client_assignments (client_id, membership_id) select $1, id from memberships where id = $2 and firm_id = $3", [id, m, u.firm_id]);
    let contactId: string | undefined;
    if (contactEmail) {
      const cc = await t.query<{ id: string }>("insert into client_contacts (firm_id, client_id, name, email) values ($1,$2,$3,$4) returning id", [u.firm_id, id, str(fd, "contact_name") || contactEmail, contactEmail]);
      contactId = cc.rows[0].id;
    }
    if (fee) await t.query("update clients set checkout_amount = $2 where id = $1", [id, fee]); // invitations wait for checkout
    await audit(u, "create", "client", id, { client_id: id }, t);
    return { clientId: id, contactId };
  });
  if (fee) redirect(`/app/clients/${clientId}/checkout`);
  if (contactId) await invite({ firm_id: u.firm_id, client_id: clientId, contact_id: contactId, email: contactEmail, role: "client_contact", invited_by: u.id });
  redirect(`/app/clients/${clientId}?ok=${encodeURIComponent(dup ? "Client created. Note: another client already has this name." : "Client created")}`);
}

export default async function NewClient({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const u = await requireFirmRole("firm_admin", "lead_consultant");
  const sp = await searchParams;
  const fees = await Promise.all(SIZES.map(([k]) => feeFor(k)));
  const members = await q("select m.id, u.name, m.role from memberships m join users u on u.id = m.user_id where m.firm_id = $1 and m.status = 'active' order by u.name", [u.firm_id]);
  return (
    <>
      <PageHead title="Add client" />
      {sp.error && <div className="banner error" role="alert">{sp.error}</div>}
      <form action={createClient} style={{ maxWidth: 640 }}>
        <Field label="Client name" required><input name="name" required /></Field>
        <Field label="Country" help="Sets the law and regulator, invoice currency and VAT, and whether the NDPC CAR applies." required>
          <select name="country" defaultValue={COUNTRY.code} required>{Object.values(COUNTRIES).map((c) => <option key={c.code} value={c.code}>{c.name} ({c.law.short}, {c.currency.code})</option>)}</select>
        </Field>
        <Field label="Sector"><input name="sector" list="sectors" /></Field>
        <datalist id="sectors">{["Financial services", "Health", "Education", "Telecoms", "Government", "Retail or e-commerce", "Technology"].map((s) => <option key={s} value={s} />)}</datalist>
        <Field label="Size" help={fees.some((f) => f) ? "Sets the client onboarding fee. You'll go to checkout next; the portal invitation is sent after payment." : undefined} required>
          <select name="size" required defaultValue="">
            <option value="" disabled>Choose…</option>
            {SIZES.map(([k, l], i) => <option key={k} value={k}>{l}{fees[i] ? ` · ${money(fees[i])}` : ""}</option>)}
          </select>
        </Field>
        <Field label="CAR filing due date" help="Nigerian clients only. Appears on the calendar."><input type="date" name="car_filing_due_on" /></Field>
        <fieldset>
          <legend>Primary client contact</legend>
          <p className="meta">Optional. They get an invitation to the client portal.</p>
          <Field label="Name"><input name="contact_name" autoComplete="off" /></Field>
          <Field label="Email"><input type="email" name="contact_email" autoComplete="off" /></Field>
        </fieldset>
        <fieldset>
          <legend>Assigned team</legend>
          <p className="meta">Associates only see clients they are assigned to.</p>
          {members.map((m) => (
            <label key={m.id} className="check"><input type="checkbox" name="team" value={m.id} defaultChecked={m.id === u.membership_id} />{m.name} <span className="meta">({ROLE_LABEL[m.role]})</span></label>
          ))}
        </fieldset>
        <div className="row"><Submit>Create client</Submit><Link href="/app" className="btn secondary">Cancel</Link></div>
      </form>
    </>
  );
}
