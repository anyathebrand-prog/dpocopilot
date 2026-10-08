import { redirect } from "next/navigation";
import { requireClient, audit } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { str, opt, flash } from "@/lib/form";
import { SERVICES, totals, naira, type Line } from "@/lib/invoice";
import { fmtDate, todayWAT } from "@/lib/rules";
import { Flash, Field, Hidden, Chip, Empty } from "@/components/ui";
import { Submit } from "@/components/client";

async function create(fd: FormData) {
  "use server";
  const { user, client } = await requireClient(str(fd, "client_id"), { write: true });
  const back = `/app/clients/${client.id}/billing`;
  const lines: Line[] = [];
  for (const [i, service] of SERVICES.entries()) {
    if (fd.get(`s${i}`) !== "on") continue;
    const amount = Number(str(fd, `a${i}`).replace(/[,₦\s]/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) redirect(flash(back, `Enter an amount for ${service}.`, "error"));
    lines.push({ service, description: str(fd, `d${i}`), amount: Math.round(amount * 100) / 100 });
  }
  if (!lines.length) redirect(flash(back, "Select at least one service.", "error"));
  const issued = opt(fd, "issued_on") ?? todayWAT(), year = issued.slice(0, 4);
  const n = (await one<{ n: number }>("select count(*)::int as n from invoices where firm_id = $1 and number like $2", [client.firm_id, `INV-${year}-%`]))!.n;
  const r = await one("insert into invoices (firm_id, client_id, number, issued_on, due_on, lines, vat_rate, notes, created_by) values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id",
    [client.firm_id, client.id, `INV-${year}-${String(n + 1).padStart(3, "0")}`, issued, opt(fd, "due_on"), JSON.stringify(lines), fd.get("vat") === "on" ? 7.5 : 0, opt(fd, "notes"), user.id]);
  await audit(user, "create", "invoice", r!.id, { client_id: client.id });
  redirect(flash(back, "Invoice created"));
}

async function setStatus(fd: FormData) {
  "use server";
  const inv = await one("select * from invoices where id = $1", [/^[0-9a-f-]{36}$/.test(str(fd, "id")) ? str(fd, "id") : null]);
  if (!inv) redirect("/forbidden");
  const { user } = await requireClient(inv.client_id, { write: true });
  const status = str(fd, "status");
  if (!["unpaid", "paid", "cancelled"].includes(status)) redirect("/forbidden");
  await q("update invoices set status = $2, paid_on = $3 where id = $1", [inv.id, status, status === "paid" ? todayWAT() : null]);
  await audit(user, "update", "invoice", inv.id, { client_id: inv.client_id, details: { status } });
  redirect(flash(`/app/clients/${inv.client_id}/billing`, status === "paid" ? "Marked as paid" : status === "cancelled" ? "Invoice cancelled" : "Marked as unpaid"));
}

export default async function Billing({ params, searchParams }: { params: Promise<{ clientId: string }>; searchParams: Promise<Record<string, string>> }) {
  const { clientId } = await params;
  const sp = await searchParams;
  const { client } = await requireClient(clientId);
  const rows = await q("select * from invoices where client_id = $1 order by issued_on desc, created_at desc", [clientId]);
  const ro = !!client.archived_at;
  const outstanding = rows.filter((r) => r.status === "unpaid").reduce((s, r) => s + totals(r.lines, Number(r.vat_rate)).total, 0);
  const exp = (id: string, f: string) => `/export?kind=invoice&id=${id}&format=${f}`;
  const act = (id: string, status: string, label: string) => (
    <form action={setStatus} style={{ display: "inline" }}><Hidden values={{ id, status }} /><Submit className="btn secondary">{label}</Submit></form>
  );
  return (
    <>
      <h2 style={{ marginTop: 0 }}>Billing</h2>
      <p className="meta">Invoices for this client. Outstanding: <b>{naira(outstanding)}</b></p>
      <Flash sp={sp} />
      {rows.length === 0 ? <Empty><p>No invoices yet.</p></Empty> : (
        <table className="register">
          <thead><tr><th>Invoice</th><th>Date</th><th>Services</th><th className="num">Total</th><th>Status</th><th></th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id}>
              <td><a href={exp(r.id, "pdf")} target="_blank">{r.number}</a></td>
              <td data-label="Date" className="small">{fmtDate(r.issued_on)}{r.due_on && <span className="meta"><br />Due {fmtDate(r.due_on)}</span>}</td>
              <td data-label="Services" className="small">{(r.lines as Line[]).map((l) => l.service).join(", ")}</td>
              <td data-label="Total" className="num">{naira(totals(r.lines, Number(r.vat_rate)).total)}</td>
              <td data-label="Status"><Chip status={r.status === "paid" ? "complete" : r.status === "cancelled" ? "archived" : "open"} /> <span className="small">{r.status}</span></td>
              <td className="row" style={{ gap: 6 }}>
                <a className="btn secondary" href={exp(r.id, "pdf")} target="_blank">PDF</a><a className="btn secondary" href={exp(r.id, "doc")}>Word</a>
                {!ro && r.status === "unpaid" && <>{act(r.id, "paid", "Mark paid")}{act(r.id, "cancelled", "Cancel")}</>}
                {!ro && r.status !== "unpaid" && act(r.id, "unpaid", "Reopen")}
              </td>
            </tr>
          ))}</tbody>
        </table>
      )}
      {!ro && (
        <form action={create} className="panel" style={{ marginTop: 24 }}>
          <Hidden values={{ client_id: clientId }} />
          <h3 style={{ marginTop: 0 }}>New invoice</h3>
          <p className="meta">Tick the services to bill and enter each amount in naira.</p>
          <table className="register">
            <thead><tr><th>Service</th><th>Description (optional)</th><th>Amount (₦)</th></tr></thead>
            <tbody>{SERVICES.map((s, i) => (
              <tr key={s}>
                <td><label className="check"><input type="checkbox" name={`s${i}`} />{i + 1}. {s}</label></td>
                <td><input name={`d${i}`} placeholder="e.g. scope, period" /></td>
                <td><input name={`a${i}`} inputMode="decimal" placeholder="0.00" style={{ width: 140 }} /></td>
              </tr>
            ))}</tbody>
          </table>
          <div className="row" style={{ alignItems: "flex-end", marginTop: 12 }}>
            <Field label="Invoice date"><input type="date" name="issued_on" defaultValue={todayWAT()} /></Field>
            <Field label="Due date"><input type="date" name="due_on" /></Field>
            <label className="check"><input type="checkbox" name="vat" />Add VAT (7.5%)</label>
          </div>
          <Field label="Notes and payment details" help="e.g. bank name, account name and number."><textarea name="notes" rows={3} /></Field>
          <Submit>Create invoice</Submit>
        </form>
      )}
    </>
  );
}
