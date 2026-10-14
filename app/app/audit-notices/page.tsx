import Link from "next/link";
import { redirect } from "next/navigation";
import { requireFirm, requireClient, clientScope, scopeArgs, audit, send } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { str, flash } from "@/lib/form";
import { naira, totals, type Line } from "@/lib/invoice";
import { noticeInitials } from "@/lib/audit-notice";
import { todayWAT, fmtWAT } from "@/lib/rules";
import { PageHead, Flash, Field, Hidden, Empty } from "@/components/ui";
import { Submit } from "@/components/client";

const validYear = (v: string) => (/^\d{4}$/.test(v) && Number(v) >= 2019 && Number(v) <= 2100 ? Number(v) : null);

/** Create (or refresh the invoice of) one notice per ticked client for the year. */
async function generate(fd: FormData) {
  "use server";
  const u = await requireFirm();
  const year = validYear(str(fd, "year"));
  if (!year) redirect(flash("/app/audit-notices", "Enter a four-digit audit year.", "error"));
  const ids = fd.getAll("client").map(String);
  if (!ids.length) redirect(flash(`/app/audit-notices?year=${year}`, "Tick at least one client.", "error"));
  const firm = (await one("select name from firms where id = $1", [u.firm_id]))!;
  let made = 0;
  for (const id of ids) {
    const { client } = await requireClient(id, { write: true });
    const invId = str(fd, `inv_${id}`) || null;
    if (invId && !(await one("select 1 from invoices where id = $1 and client_id = $2", [invId, id]))) redirect("/forbidden");
    const n = (await one<{ n: number }>("select count(*)::int as n from audit_notices where firm_id = $1 and audit_year = $2", [u.firm_id, year]))!.n;
    const r = await one(`insert into audit_notices (firm_id, client_id, audit_year, invoice_id, our_ref, created_by) values ($1,$2,$3,$4,$5,$6)
      on conflict (client_id, audit_year) do update set invoice_id = excluded.invoice_id returning id, (xmax = 0) as inserted`,
      [u.firm_id, id, year, invId, `${noticeInitials(firm.name) || "DPCO"}/${noticeInitials(client.name)}/CAN/${year}/${String(n + 1).padStart(2, "0")}`, u.id]);
    if (r!.inserted) made++;
    await audit(u, "create", "audit_notice", r!.id, { client_id: id, details: { year, invoice: invId } });
  }
  redirect(flash(`/app/audit-notices?year=${year}`, `${made} new letter${made === 1 ? "" : "s"} generated${ids.length > made ? `, ${ids.length - made} updated` : ""}.`));
}

/** Send one notice (id) or every unsent notice of the year (all=1): notify contacts; the letter and invoice appear in the portal. */
async function sendNotices(fd: FormData) {
  "use server";
  const u = await requireFirm();
  const year = validYear(str(fd, "year"))!;
  const rows = str(fd, "id")
    ? await q("select * from audit_notices where id = $1 and firm_id = $2", [str(fd, "id"), u.firm_id])
    : await q("select * from audit_notices where firm_id = $1 and audit_year = $2 and sent_at is null", [u.firm_id, year]);
  let sent = 0;
  for (const n of rows) {
    await requireClient(n.client_id, { write: true });
    const contacts = await q<{ email: string }>("select email from client_contacts where client_id = $1 and status = 'active'", [n.client_id]);
    for (const c of contacts) await send("email", c.email, "audit_notice", `${u.firm_name} has sent you the ${n.audit_year} Compliance Audit Notification Letter${n.invoice_id ? " with the engagement invoice" : ""}. Log in to view it: ${process.env.APP_URL ?? "http://localhost:3000"}/portal/invoices`);
    if (n.invoice_id) await q("update invoices set sent_at = coalesce(sent_at, now()) where id = $1", [n.invoice_id]);
    await q("update audit_notices set sent_at = now() where id = $1", [n.id]);
    await audit(u, "update", "audit_notice", n.id, { client_id: n.client_id, details: { sent: contacts.length } });
    sent++;
  }
  redirect(flash(`/app/audit-notices?year=${year}`, sent ? `${sent} letter${sent === 1 ? "" : "s"} sent. Clients see the letter and invoice in their portal.` : "Nothing to send."));
}

export default async function AuditNotices({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const u = await requireFirm();
  const sp = await searchParams;
  const year = validYear(sp.year ?? "") ?? Number(todayWAT().slice(0, 4));
  const clients = await q(`select c.id, c.name from clients c where ${clientScope(u)} and c.archived_at is null order by c.name`, scopeArgs(u));
  const invoices = await q(`select i.id, i.client_id, i.number, i.status, i.lines, i.vat_rate from invoices i join clients c on c.id = i.client_id where ${clientScope(u)} and i.status <> 'cancelled' order by i.issued_on desc`, scopeArgs(u));
  const notices = await q(`select n.*, c.name as client, i.number as invoice_number from audit_notices n join clients c on c.id = n.client_id left join invoices i on i.id = n.invoice_id
    where ${clientScope(u)} and n.audit_year = $3 order by c.name`, [...scopeArgs(u), year]);
  const byClient = Object.fromEntries(notices.map((n) => [n.client_id, n]));
  const exp = (id: string, f: string) => `/export?kind=audit-notice&id=${id}&format=${f}`;
  const unsent = notices.filter((n) => !n.sent_at).length;
  return (
    <>
      <PageHead title="Compliance Audit Notification Letters" sub="Notify clients to prepare for the year's data protection compliance audit and CAR filing, with the engagement invoice attached." />
      <Flash sp={sp} />
      <form className="row" style={{ alignItems: "flex-end", marginBottom: 16 }}>
        <Field label="Audit year"><input type="number" name="year" min={2019} max={2100} defaultValue={year} style={{ width: 120 }} /></Field>
        <button className="btn secondary">Show</button>
        <span className="meta">CAR for the {year} audit year is due 31 March {year + 1}.</span>
      </form>

      {notices.length > 0 && (
        <>
          <div className="spread"><h3>Letters for {year}</h3>
            {unsent > 0 && <form action={sendNotices}><Hidden values={{ year: String(year) }} /><Submit>Send all unsent ({unsent})</Submit></form>}</div>
          <table className="register">
            <thead><tr><th>Client</th><th>Reference</th><th>Invoice attached</th><th>Status</th><th></th></tr></thead>
            <tbody>{notices.map((n) => (
              <tr key={n.id}>
                <td><Link href={`/app/clients/${n.client_id}/billing`}>{n.client}</Link></td>
                <td data-label="Reference" className="small">{n.our_ref}</td>
                <td data-label="Invoice" className="small">{n.invoice_number ?? "None"}</td>
                <td data-label="Status" className="small">{n.sent_at ? `Sent ${fmtWAT(n.sent_at)}` : "Draft"}</td>
                <td><div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                  <a className="btn secondary" href={exp(n.id, "pdf")} target="_blank">PDF</a><a className="btn secondary" href={exp(n.id, "doc")}>Word</a>
                  <form action={sendNotices}><Hidden values={{ id: n.id, year: String(year) }} /><Submit className="btn">{n.sent_at ? "Send again" : "Send"}</Submit></form>
                </div></td>
              </tr>
            ))}</tbody>
          </table>
        </>
      )}

      <form action={generate} className="panel" style={{ marginTop: 24 }}>
        <Hidden values={{ year: String(year) }} />
        <h3 style={{ marginTop: 0 }}>Generate Compliance Audit Notification Letters · {year}</h3>
        {clients.length === 0 ? <Empty><p>No active clients.</p></Empty> : (
          <table className="register">
            <thead><tr><th>Client</th><th>Attach invoice</th></tr></thead>
            <tbody>{clients.map((c) => {
              const mine = invoices.filter((i) => i.client_id === c.id), current = byClient[c.id]?.invoice_id ?? mine.find((i) => i.status === "unpaid")?.id ?? "";
              return (
                <tr key={c.id}>
                  <td><label className="check"><input type="checkbox" name="client" value={c.id} defaultChecked />{c.name}</label></td>
                  <td>{mine.length === 0 ? <span className="meta">No invoices yet — <Link href={`/app/clients/${c.id}/billing`}>create one</Link></span> : (
                    <select name={`inv_${c.id}`} defaultValue={current} style={{ width: "auto" }}>
                      <option value="">No invoice</option>
                      {mine.map((i) => <option key={i.id} value={i.id}>{i.number} · {naira(totals(i.lines as Line[], Number(i.vat_rate)).total)} · {i.status}</option>)}
                    </select>
                  )}</td>
                </tr>
              );
            })}</tbody>
          </table>
        )}
        {clients.length > 0 && <div style={{ marginTop: 12 }}><Submit>Generate Compliance Audit Notification Letter{clients.length > 1 ? "s" : ""}</Submit></div>}
      </form>
    </>
  );
}
