import { redirect } from "next/navigation";
import { requireFirmRole, audit } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { str, opt, flash } from "@/lib/form";
import { Flash, Field, PageHead } from "@/components/ui";
import { Submit } from "@/components/client";
import { imageSize } from "@/lib/files";

const FIELDS: [key: string, label: string, help?: string][] = [
  ["address", "Office address"],
  ["website", "Website"],
  ["email", "Email"],
  ["phone", "Phone"],
  ["ndpc_licence_no", "NDPC DPCO licence number", "Printed on the audit verification statement."],
  ["signatory_name", "Report signatory", "The person who signs audit reports, e.g. Dr. Ivan Anya."],
  ["signatory_credentials", "Signatory credentials", "e.g. FIIM, CDPO, CISA"],
  ["signatory_title", "Signatory title", "e.g. Director, Professional Services"],
];

async function save(fd: FormData) {
  "use server";
  const u = await requireFirmRole("firm_admin");
  const name = str(fd, "name");
  if (!name) redirect(flash("/app/settings/firm", "Enter the firm's name.", "error"));
  await q(`update firms set name = $2, ${FIELDS.map(([k], i) => `${k} = $${i + 3}`).join(", ")} where id = $1`, [u.firm_id, name, ...FIELDS.map(([k]) => opt(fd, k))]);
  const logo = fd.get("logo");
  if (logo instanceof File && logo.size) {
    const buf = Buffer.from(await logo.arrayBuffer()), dim = imageSize(buf);
    if (!dim || logo.size > 500_000) redirect(flash("/app/settings/firm", "The logo must be a PNG or JPEG under 500 KB.", "error"));
    await q("update firms set logo = $2, logo_w = $3, logo_h = $4 where id = $1", [u.firm_id, `data:image/${dim.type};base64,${buf.toString("base64")}`, dim.w, dim.h]);
  }
  if (fd.get("remove_logo") === "on") await q("update firms set logo = null, logo_w = null, logo_h = null where id = $1", [u.firm_id]);
  await audit(u, "update", "firm", u.firm_id, {});
  redirect(flash("/app/settings/firm", "Firm profile saved"));
}

/** The DPCO's own details, printed on CAR audit reports and remediation plans. */
export default async function FirmProfile({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const u = await requireFirmRole("firm_admin");
  const sp = await searchParams;
  const f = await one("select * from firms where id = $1", [u.firm_id]);
  return (
    <>
      <PageHead title="Firm profile" sub="Shown on the audit reports, remediation plans and invoices you generate for clients." />
      <Flash sp={sp} />
      <form action={save} className="panel" style={{ maxWidth: 720 }}>
        <Field label="Firm name" required><input name="name" defaultValue={f!.name} required /></Field>
        {FIELDS.map(([k, label, help]) => <Field key={k} label={label} help={help}><input name={k} defaultValue={f![k] ?? ""} /></Field>)}
        <Field label="Logo" help="PNG or JPEG under 500 KB. Printed on invoices.">
          {f!.logo && <span style={{ display: "block", marginBottom: 6 }}>{/* eslint-disable-next-line @next/next/no-img-element -- stored data URL */}<img src={f!.logo} alt="Current logo" style={{ height: 48 }} /> <label className="check" style={{ display: "inline-flex" }}><input type="checkbox" name="remove_logo" />Remove</label></span>}
          <input type="file" name="logo" accept=".png,.jpg,.jpeg,image/png,image/jpeg" />
        </Field>
        <Submit>Save firm profile</Submit>
      </form>
    </>
  );
}
