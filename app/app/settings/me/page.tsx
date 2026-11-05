import { redirect } from "next/navigation";
import { requireFirm, audit } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { str, opt, flash } from "@/lib/form";
import { PageHead, Flash, Field, Banner } from "@/components/ui";
import { Submit } from "@/components/client";

const BACK = "/app/settings/me";

async function save(fd: FormData) {
  "use server";
  const u = await requireFirm();
  if (u.plan !== "solo") redirect("/app/settings/firm");
  const name = str(fd, "signatory_name").slice(0, 200), email = str(fd, "email").toLowerCase().slice(0, 200);
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) redirect(flash(BACK, "Enter your name as it should appear on documents, and a valid email.", "error"));
  await q("update firms set signatory_name = $2, signatory_title = $3, signatory_credentials = $4, email = $5, phone = $6 where id = $1",
    [u.firm_id, name, opt(fd, "signatory_title")?.slice(0, 200) ?? null, opt(fd, "signatory_credentials")?.slice(0, 300) ?? null, email, opt(fd, "phone")?.slice(0, 40) ?? null]);
  await audit(u, "update", "firm", u.firm_id, { details: { my_details: true } });
  redirect(flash(BACK, "Saved. Your documents use these details."));
}

/** Solo DPO: how they sign and can be reached on documents. The branding (logo, firm name, address, licence) is their DPCO's. */
export default async function MyDetails({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const u = await requireFirm();
  if (u.plan !== "solo") redirect("/app/settings/firm");
  const sp = await searchParams;
  const f = (await one("select signatory_name, signatory_title, signatory_credentials, email, phone from firms where id = $1", [u.firm_id]))!;
  return (
    <>
      <PageHead title="My details" sub="How you sign proposals, invoices, letters and reports, and how clients reach you." />
      <Flash sp={sp} />
      <Banner kind="info">Your documents carry <b>{u.dpco_name ?? "your DPCO"}</b>&apos;s name, logo, address and NDPC licence, signed by you with the details below.</Banner>
      <form action={save} className="panel" style={{ maxWidth: 640 }}>
        <Field label="Your name, as signed" required><input name="signatory_name" defaultValue={f.signatory_name ?? u.name} required /></Field>
        <Field label="Title"><input name="signatory_title" defaultValue={f.signatory_title ?? "Data Protection Officer"} /></Field>
        <Field label="Credentials" help="e.g. CDPO"><input name="signatory_credentials" defaultValue={f.signatory_credentials ?? ""} /></Field>
        <div className="row">
          <Field label="Email on documents" required><input type="email" name="email" defaultValue={f.email ?? u.email} required /></Field>
          <Field label="Phone on documents"><input type="tel" name="phone" defaultValue={f.phone ?? ""} /></Field>
        </div>
        <Submit>Save details</Submit>
      </form>
    </>
  );
}
