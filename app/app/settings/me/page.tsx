import { redirect } from "next/navigation";
import { requireFirm, audit } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { str, opt, flash } from "@/lib/form";
import { PageHead, Flash, Field, Banner } from "@/components/ui";
import { Submit } from "@/components/client";
import { readDoc, linkedinOk, NG_STATES } from "@/lib/solo-profile";
import { fmtWAT } from "@/lib/rules";

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

/** Solo DPO: update the professional profile from sign-up (what their DPCO sees). A new certificate or CV replaces the old one. */
async function saveProfile(fd: FormData) {
  "use server";
  const u = await requireFirm();
  if (u.plan !== "solo") redirect("/app/settings/firm");
  const cur = await one("select cv_name from solo_profiles where firm_id = $1", [u.firm_id]);
  if (!cur) redirect(BACK);
  const years = Number(str(fd, "years_experience")), linkedin = str(fd, "linkedin");
  if (!str(fd, "phone") || !NG_STATES.includes(str(fd, "state")) || !Number.isInteger(years) || years < 0 || years > 60 || !str(fd, "certification"))
    redirect(flash(BACK, "Enter your phone number, state, years of experience and certification.", "error"));
  const cert = await readDoc(fd.get("cert_file")), cv = await readDoc(fd.get("cv_file"));
  if (cert === "bad" || cv === "bad") redirect(flash(BACK, "Upload the certificate or CV as a PDF, PNG or JPEG under 5 MB.", "error"));
  if (!linkedinOk(linkedin)) redirect(flash(BACK, "Enter your LinkedIn profile as a full link (https://www.linkedin.com/in/…).", "error"));
  if (!linkedin && !cv && !cur.cv_name) redirect(flash(BACK, "Upload your CV or give your LinkedIn profile.", "error"));
  await q("update solo_profiles set phone = $2, state = $3, years_experience = $4, certification = $5, linkedin = $6 where firm_id = $1",
    [u.firm_id, str(fd, "phone").slice(0, 40), str(fd, "state"), years, str(fd, "certification").slice(0, 300), linkedin || null]);
  if (cert) await q("update solo_profiles set cert_file = $2, cert_mime = $3, cert_name = $4 where firm_id = $1", [u.firm_id, cert.bytes, cert.mime, cert.name]);
  if (cv) await q("update solo_profiles set cv_file = $2, cv_mime = $3, cv_name = $4 where firm_id = $1", [u.firm_id, cv.bytes, cv.mime, cv.name]);
  await audit(u, "update", "solo_profile", u.firm_id, { details: { certificate: !!cert, cv: !!cv } });
  redirect(flash(BACK, `Professional profile saved. ${u.dpco_name ?? "Your DPCO"} sees the update.`));
}

/** Solo DPO: how they sign and can be reached on documents. The branding (logo, firm name, address, licence) is their DPCO's. */
export default async function MyDetails({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const u = await requireFirm();
  if (u.plan !== "solo") redirect("/app/settings/firm");
  const sp = await searchParams;
  const sp2 = await one("select phone, state, years_experience, certification, linkedin, cert_name, cv_name, created_at from solo_profiles where firm_id = $1", [u.firm_id]);
  const file = (kind: string) => `/solo-file?firm=${u.firm_id}&kind=${kind}`;
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

      {sp2 && (
        <form action={saveProfile} className="panel" style={{ maxWidth: 640, marginTop: 24 }}>
          <h3 style={{ marginTop: 0 }}>Professional profile</h3>
          <p className="meta">What you gave at sign-up ({fmtWAT(sp2.created_at)}). {u.dpco_name ?? "Your DPCO"} sees this.</p>
          <div className="row">
            <Field label="Phone number" required><input type="tel" name="phone" defaultValue={sp2.phone} required /></Field>
            <Field label="State" required><select name="state" defaultValue={sp2.state} required>{NG_STATES.map((s) => <option key={s}>{s}</option>)}</select></Field>
            <Field label="Years of experience" required><input type="number" name="years_experience" min={0} max={60} defaultValue={sp2.years_experience} required style={{ width: 120 }} /></Field>
          </div>
          <Field label="Certification" required><input name="certification" defaultValue={sp2.certification} required /></Field>
          <Field label="Certificate" help="Upload a new one only to replace it (PDF, PNG or JPEG, up to 5 MB).">
            <span style={{ display: "block", marginBottom: 6 }}><a href={file("cert")} target="_blank">{sp2.cert_name}</a></span>
            <input type="file" name="cert_file" accept=".pdf,.png,.jpg,.jpeg" />
          </Field>
          <Field label="CV" help="Upload a new one only to replace it. A CV or LinkedIn profile is required.">
            {sp2.cv_name ? <span style={{ display: "block", marginBottom: 6 }}><a href={file("cv")} target="_blank">{sp2.cv_name}</a></span> : <span className="meta" style={{ display: "block", marginBottom: 6 }}>None uploaded</span>}
            <input type="file" name="cv_file" accept=".pdf,.png,.jpg,.jpeg" />
          </Field>
          <Field label="LinkedIn profile"><input type="url" name="linkedin" defaultValue={sp2.linkedin ?? ""} placeholder="https://www.linkedin.com/in/…" /></Field>
          <Submit className="btn secondary">Save profile</Submit>
        </form>
      )}
    </>
  );
}
