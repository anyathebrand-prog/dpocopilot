import Link from "next/link";
import { redirect } from "next/navigation";
import { requireFirmRole, ROLE_LABEL } from "@/lib/auth";
import { q } from "@/lib/db";
import { Field, PageHead } from "@/components/ui";
import { Submit } from "@/components/client";
import { createClient } from "./actions";
import { COUNTRIES, COUNTRY, money } from "@/lib/country";
import { SIZES, feeFor } from "@/lib/checkout";

export default async function NewClient({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const u = await requireFirmRole("firm_admin", "lead_consultant");
  if (u.plan === "solo") redirect(`/app?error=${encodeURIComponent("Clients come from your accepted proposals, or your DPCO adds them for you.")}`);
  const sp = await searchParams;
  const pre = (k: string) => (typeof sp[k] === "string" ? sp[k].slice(0, 200) : ""); // prefilled from a proposal
  const fees = await Promise.all(SIZES.map(([k]) => feeFor(k)));
  const members = await q("select m.id, u.name, m.role from memberships m join users u on u.id = m.user_id where m.firm_id = $1 and m.status = 'active' order by u.name", [u.firm_id]);
  return (
    <>
      <PageHead title="Add client" />
      {sp.error && <div className="banner error" role="alert">{sp.error}</div>}
      <form action={createClient} style={{ maxWidth: 640 }}>
        <Field label="Client name" required><input name="name" defaultValue={pre("name")} required /></Field>
        <Field label="Country" help="Sets the law and regulator, invoice currency and VAT, and whether the NDPC CAR applies." required>
          <select name="country" defaultValue={COUNTRY.code} required>{Object.values(COUNTRIES).map((c) => <option key={c.code} value={c.code}>{c.name} ({c.law.short}, {c.currency.code})</option>)}</select>
        </Field>
        <Field label="Sector"><input name="sector" defaultValue={pre("sector")} list="sectors" /></Field>
        <datalist id="sectors">{["Financial services", "Health", "Education", "Telecoms", "Government", "Retail or e-commerce", "Technology"].map((s) => <option key={s} value={s} />)}</datalist>
        <div className="row">
          <Field label="Number of data subjects" help="Customers, staff, students, patients… (approximate)." required><input type="number" name="data_subjects_count" defaultValue={pre("subjects")} min={0} inputMode="numeric" required style={{ width: 180 }} /></Field>
          <Field label="Number of departments" required><input type="number" name="departments_count" defaultValue={pre("departments")} min={0} inputMode="numeric" required style={{ width: 140 }} /></Field>
        </div>
        {fees.some((f) => f) && (
          <div className="meta" style={{ marginBottom: 16 }}>
            <p style={{ margin: "0 0 4px" }}>These set the client&apos;s size and onboarding fee (the larger band applies). You&apos;ll go to checkout next; the portal invitation is sent after payment.</p>
            <ul style={{ margin: 0 }}>{SIZES.map(([k, l], i) => <li key={k}>{l}: <b>{fees[i] ? money(fees[i]) : "no fee"}</b></li>)}</ul>
          </div>
        )}
        <Field label="CAR filing due date" help="Nigerian clients only. Appears on the calendar."><input type="date" name="car_filing_due_on" /></Field>
        <fieldset>
          <legend>Primary client contact</legend>
          <p className="meta">Optional. They get an invitation to the client portal.</p>
          <Field label="Name"><input name="contact_name" defaultValue={pre("contact_name")} autoComplete="off" /></Field>
          <Field label="Email"><input type="email" name="contact_email" defaultValue={pre("contact_email")} autoComplete="off" /></Field>
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
