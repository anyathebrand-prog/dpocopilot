import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { q } from "@/lib/db";
import { generateDocument } from "@/lib/content";
import { TEMPLATE_TITLES } from "@/lib/templates";
import { Flash, Chip, Empty, Hidden, Field } from "@/components/ui";
import { Submit } from "@/components/client";
import { redirect } from "next/navigation";
import { requireClient as requireClientW, audit } from "@/lib/auth";
import { one } from "@/lib/db";
import { str, opt, flash } from "@/lib/form";
import { lettersFor } from "@/lib/readiness-letter";

async function saveLetter(fd: FormData) {
  "use server";
  const l = await one("select * from readiness_letters where id = $1", [/^[0-9a-f-]{36}$/.test(str(fd, "id")) ? str(fd, "id") : null]);
  if (!l) redirect("/forbidden");
  const { user } = await requireClientW(l.client_id, { write: true });
  const back = `/app/clients/${l.client_id}/documents#readiness`, year = Number(str(fd, "audit_year"));
  if (!str(fd, "addressee") || !str(fd, "salutation") || !Number.isInteger(year) || year < 2019 || year > 2100) redirect(flash(back, "Enter the addressee, salutation and a four-digit audit year.", "error"));
  await q(`update readiness_letters set your_ref = $2, letter_date = coalesce($3::date, letter_date), audit_year = $4, commencement_on = $5, addressee = $6, salutation = $7, copy_to = $8, updated_at = now() where id = $1`,
    [l.id, opt(fd, "your_ref"), opt(fd, "letter_date"), year, opt(fd, "commencement_on"), str(fd, "addressee"), str(fd, "salutation"), opt(fd, "copy_to")]);
  await audit(user, "update", "readiness_letter", l.id, { client_id: l.client_id });
  redirect(flash(back, "Readiness letter saved"));
}

export default async function Documents({ params, searchParams }: { params: Promise<{ clientId: string }>; searchParams: Promise<Record<string, string>> }) {
  const { clientId } = await params;
  const sp = await searchParams;
  const { client } = await requireClient(clientId);
  const rows = await q(`select d.*, v.status, v.version_no, v.ai_generated from documents d
    join lateral (select * from content_versions where parent_type = 'document' and parent_id = d.id order by version_no desc limit 1) v on true
    where d.client_id = $1 order by d.created_at desc`, [clientId]);
  const active = await q("select 1 from ropa_entries where client_id = $1 and state = 'active' limit 1", [clientId]);
  const letters = await lettersFor(clientId);
  return (
    <>
      <h2 style={{ marginTop: 0 }}>Documents</h2>
      <Flash sp={sp} />
      <div className="panel spread" style={{ marginBottom: 16 }}>
        <div><b>Data Protection Framework</b><div className="meta">Overarching policy and linked policies (classification, website privacy, DPIA, incident response, retention, consent), built from the onboarding answers, departments and RoPA. Aligned with the NDPA and GAID.</div></div>
        <div className="row"><a className="btn" href={`/export?kind=framework&client=${clientId}&format=pdf`} target="_blank">PDF</a><a className="btn secondary" href={`/export?kind=framework&client=${clientId}&format=doc`}>Word</a><a className="btn secondary" href={`/export?kind=framework&client=${clientId}&format=pdf` + "&cover=only"} target="_blank">Cover letter (PDF)</a><a className="btn secondary" href={`/export?kind=framework&client=${clientId}&format=doc` + "&cover=only"}>Cover letter (Word)</a></div>
      </div>
      <section id="readiness" style={{ marginBottom: 24 }}>
        <h3>Data Protection Audit Readiness Letters</h3>
        {letters.length === 0 ? <p className="meta">Drafted automatically when one of this client&apos;s invoices is marked paid.</p> : letters.map((l) => (
          <details key={l.id} className="group" open={letters[0].id === l.id}>
            <summary><span>{l.our_ref} · {l.audit_year} audit{l.invoice_number && <span className="meta"> · from invoice {l.invoice_number}</span>}</span>
              <span className="row"><a className="btn" href={`/export?kind=readiness&id=${l.id}&format=pdf`} target="_blank">PDF</a><a className="btn secondary" href={`/export?kind=readiness&id=${l.id}&format=doc`}>Word</a></span></summary>
            <form action={saveLetter} style={{ maxWidth: 720 }}>
              <Hidden values={{ id: l.id }} />
              <fieldset disabled={!!client.archived_at}>
                <div className="row">
                  <Field label="Audit year" required><input type="number" name="audit_year" min={2019} max={2100} defaultValue={l.audit_year} required style={{ width: 120 }} /></Field>
                  <Field label="Commencement date"><input type="date" name="commencement_on" defaultValue={l.commencement_on ?? ""} /></Field>
                  <Field label="Letter date"><input type="date" name="letter_date" defaultValue={l.letter_date ?? ""} /></Field>
                </div>
                <Field label="Your Ref" help="The client's reference, e.g. from their approval letter"><input name="your_ref" defaultValue={l.your_ref ?? ""} /></Field>
                <Field label="Addressee" required help="Name and title, one per line"><textarea name="addressee" rows={2} required defaultValue={l.addressee} /></Field>
                <Field label="Salutation" required><input name="salutation" required defaultValue={l.salutation} /></Field>
                <Field label="Copy" help="e.g. The Vice-Chancellor"><input name="copy_to" defaultValue={l.copy_to ?? ""} /></Field>
                {!client.archived_at && <Submit className="btn secondary">Save letter</Submit>}
              </fieldset>
            </form>
          </details>
        ))}
      </section>
      {!client.archived_at && (
        <form action={generateDocument} className="panel row" style={{ alignItems: "flex-end", marginBottom: 24 }}>
          <Hidden values={{ client_id: clientId }} />
          <Field label="Template"><select name="template_key">{Object.entries(TEMPLATE_TITLES).map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></Field>
          <div style={{ marginBottom: 20 }}><Submit>Generate document</Submit></div>
          {!active.length && <p className="why" style={{ width: "100%" }}>No active RoPA entries yet, so some fields can&apos;t be pre-filled. You can still generate and edit by hand.</p>}
        </form>
      )}
      {rows.length === 0 ? <Empty><p>Generate your first policy from the client&apos;s data map.</p></Empty> : (
        <table className="register">
          <thead><tr><th>Document</th><th>Status</th><th className="num">Version</th><th>NDPA provisions</th></tr></thead>
          <tbody>{rows.map((d) => (
            <tr key={d.id}>
              <td><Link href={`/app/clients/${clientId}/documents/${d.id}`}>{d.title}</Link></td>
              <td data-label="Status"><Chip status={d.status} ai={d.ai_generated} /></td>
              <td data-label="Version" className="num">{d.version_no}</td>
              <td data-label="NDPA" className="small">{d.ndpa_refs}{d.reference_tags && <div className="meta">Also: {d.reference_tags}</div>}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </>
  );
}
