import { redirect } from "next/navigation";
import { requireClient, audit, send } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { str, opt, flash } from "@/lib/form";
import { SERVICES, totals, sumMoney, paidPct, PAYMENTS_SQL, type Line } from "@/lib/invoice";
import { Receipts, ConfirmPayment } from "@/components/payments";
import { fmtDate, fmtWAT, todayWAT } from "@/lib/rules";
import { Flash, Field, Hidden, Chip, Empty } from "@/components/ui";
import { Submit } from "@/components/client";
import { setInvoiceStatus as setStatus } from "@/app/app/billing/actions";
import { countryOf, moneyIn, parseAmount } from "@/lib/country";

async function create(fd: FormData) {
  "use server";
  const { user, client } = await requireClient(str(fd, "client_id"), { write: true });
  const back = `/app/clients/${client.id}/billing`;
  const lines: Line[] = [];
  for (const [i, service] of SERVICES.entries()) {
    if (fd.get(`s${i}`) !== "on") continue;
    const amount = parseAmount(str(fd, `a${i}`));
    if (!Number.isFinite(amount) || amount <= 0) redirect(flash(back, `Enter an amount for ${service}.`, "error"));
    lines.push({ service, description: str(fd, `d${i}`), amount: Math.round(amount * 100) / 100 });
  }
  const xs = fd.getAll("xs").map(String), xd = fd.getAll("xd").map(String), xa = fd.getAll("xa").map(String);
  for (const [k, raw] of xs.entries()) {
    const service = raw.trim().slice(0, 200);
    if (!service || fd.get(`xon${k}`) !== "on") continue;
    const amount = parseAmount(xa[k] ?? "");
    if (!Number.isFinite(amount) || amount <= 0) redirect(flash(back, `Enter an amount for ${service}.`, "error"));
    lines.push({ service, description: (xd[k] ?? "").trim().slice(0, 500), amount: Math.round(amount * 100) / 100 });
  }
  if (!lines.length) redirect(flash(back, "Select at least one service.", "error"));
  const issued = opt(fd, "issued_on") ?? todayWAT(), year = issued.slice(0, 4);
  const n = (await one<{ n: number }>("select count(*)::int as n from invoices where firm_id = $1 and number like $2", [client.firm_id, `INV-${year}-%`]))!.n;
  const r = await one("insert into invoices (firm_id, client_id, number, issued_on, due_on, lines, vat_rate, notes, created_by, currency) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id",
    [client.firm_id, client.id, `INV-${year}-${String(n + 1).padStart(3, "0")}`, issued, opt(fd, "due_on"), JSON.stringify(lines), fd.get("vat") === "on" ? countryOf(client.country).vatRate : 0, opt(fd, "notes"), user.id, countryOf(client.country).currency.code]);
  await audit(user, "create", "invoice", r!.id, { client_id: client.id });
  redirect(flash(back, "Invoice created"));
}

async function email(fd: FormData) {
  "use server";
  const inv = await one("select * from invoices where id = $1", [/^[0-9a-f-]{36}$/.test(str(fd, "id")) ? str(fd, "id") : null]);
  if (!inv) redirect("/forbidden");
  const { user } = await requireClient(inv.client_id, { write: true });
  const back = `/app/clients/${inv.client_id}/billing`;
  const contacts = await q<{ email: string }>("select email from client_contacts where client_id = $1 and status = 'active'", [inv.client_id]);
  if (!contacts.length) redirect(flash(back, "This client has no active portal contacts to email. Invite one under Settings.", "error"));
  // Email carries no invoice content, only "log in to view" (TRD 9.1); the invoice is in the portal.
  for (const c of contacts) await send("email", c.email, "invoice_issued", `${user.firm_name} has sent you invoice ${inv.number}. Log in to view and download it: ${process.env.APP_URL ?? "http://localhost:3000"}/portal/invoices`);
  await q("update invoices set sent_at = now() where id = $1", [inv.id]);
  await audit(user, "update", "invoice", inv.id, { client_id: inv.client_id, details: { emailed: contacts.length } });
  redirect(flash(back, `Invoice ${inv.number} emailed to ${contacts.map((c) => c.email).join(", ")}`));
}

export default async function Billing({ params, searchParams }: { params: Promise<{ clientId: string }>; searchParams: Promise<Record<string, string>> }) {
  const { clientId } = await params;
  const sp = await searchParams;
  const { client } = await requireClient(clientId);
  const rows = await q(`select i.*, ${PAYMENTS_SQL} from invoices i where i.client_id = $1 order by i.issued_on desc, i.created_at desc`, [clientId]);
  const ro = !!client.archived_at;
  // Prefill from a proposal of this firm ("Create invoice" on the proposal page)
  const prop = /^[0-9a-f-]{36}$/.test(sp.from_proposal ?? "") ? await one<{ number: string; lines: Line[]; vat_rate: string }>("select number, lines, vat_rate from proposals where id = $1 and firm_id = $2", [sp.from_proposal, client.firm_id]) : null;
  const pl = (s: string) => prop?.lines.find((l) => l.service === s);
  const extra = (prop?.lines ?? []).filter((l) => !(SERVICES as readonly string[]).includes(l.service));
  const outstanding = sumMoney(rows.filter((r) => r.status === "unpaid")), cc = countryOf(client.country);
  const exp = (id: string, f: string) => `/export?kind=invoice&id=${id}&format=${f}`;
  const act = (id: string, status: string, label: string) => (
    <form action={setStatus} style={{ display: "inline" }}><Hidden values={{ id, status }} /><Submit className="btn secondary">{label}</Submit></form>
  );
  return (
    <>
      <h2 style={{ marginTop: 0 }}>Billing</h2>
      <p className="meta">Invoices for this client. Outstanding: <b>{outstanding}</b></p>
      <Flash sp={sp} />
      {rows.length === 0 ? <Empty><p>No invoices yet.</p></Empty> : (
        <table className="register">
          <thead><tr><th>Invoice</th><th>Date</th><th>Services</th><th className="num">Total</th><th>Status</th><th></th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id}>
              <td><a href={exp(r.id, "pdf")} target="_blank">{r.number}</a></td>
              <td data-label="Date" className="small">{fmtDate(r.issued_on)}{r.due_on && <span className="meta"><br />Due {fmtDate(r.due_on)}</span>}{r.sent_at && <span className="meta"><br />Emailed {fmtWAT(r.sent_at)}</span>}</td>
              <td data-label="Services" className="small">{(r.lines as Line[]).map((l) => l.service).join(", ")}</td>
              <td data-label="Total" className="num">{moneyIn(r.currency, totals(r.lines, Number(r.vat_rate)).total)}</td>
              <td data-label="Status"><Chip status={r.status === "paid" ? "complete" : r.status === "cancelled" ? "archived" : "open"} /> <span className="small">{r.status === "unpaid" && paidPct(r.payments) > 0 ? `part paid (${paidPct(r.payments)}%)` : r.status}{r.status === "paid" && r.paid_on && <> {fmtDate(r.paid_on)}</>}<Receipts id={r.id} payments={r.payments} word /></span></td>
              <td><div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                <a className="btn secondary" href={exp(r.id, "pdf")} target="_blank">PDF</a><a className="btn secondary" href={exp(r.id, "doc")}>Word</a>
                {!ro && r.status === "unpaid" && <form action={email} style={{ display: "inline" }}><Hidden values={{ id: r.id }} /><Submit className="btn secondary">{r.sent_at ? "Email again" : "Email to client"}</Submit></form>}
                {!ro && r.status === "unpaid" && <><ConfirmPayment id={r.id} payments={r.payments} action={setStatus} />{act(r.id, "cancelled", "Cancel")}</>}
                {!ro && r.status !== "unpaid" && act(r.id, "unpaid", "Reopen")}
              </div></td>
            </tr>
          ))}</tbody>
        </table>
      )}
      {!ro && (
        <form action={create} className="panel" id="new-invoice" style={{ marginTop: 24 }}>
          <Hidden values={{ client_id: clientId }} />
          <h3 style={{ marginTop: 0 }}>New invoice</h3>
          {prop && <p className="banner ok" role="status">Filled in from proposal <b>{prop.number}</b>. Check the amounts before creating the invoice.</p>}
          <p className="meta">Tick the services to bill and enter each amount in {cc.currency.code} ({cc.name} client).</p>
          <table className="register">
            <thead><tr><th>Service</th><th>Description (optional)</th><th>Amount ({cc.currency.symbol})</th></tr></thead>
            <tbody>{SERVICES.map((s, i) => (
              <tr key={s}>
                <td><label className="check"><input type="checkbox" name={`s${i}`} defaultChecked={!!pl(s)} />{i + 1}. {s}</label></td>
                <td><input name={`d${i}`} placeholder="e.g. scope, period" defaultValue={pl(s)?.description ?? ""} /></td>
                <td style={{ textAlign: "right" }}><input name={`a${i}`} inputMode="decimal" placeholder="0.00" style={{ width: 140, textAlign: "right" }} defaultValue={pl(s)?.amount ?? ""} /></td>
              </tr>
            ))}
            {extra.map((l, k) => (
              <tr key={`x${k}`}>
                <td><label className="check"><input type="checkbox" name={`xon${k}`} defaultChecked />{l.service}</label><input type="hidden" name="xs" value={l.service} /></td>
                <td><input name="xd" defaultValue={l.description ?? ""} placeholder="e.g. scope, period" /></td>
                <td style={{ textAlign: "right" }}><input name="xa" inputMode="decimal" defaultValue={l.amount} style={{ width: 140, textAlign: "right" }} /></td>
              </tr>
            ))}</tbody>
          </table>
          <div className="row" style={{ alignItems: "flex-end", marginTop: 12 }}>
            <Field label="Invoice date"><input type="date" name="issued_on" defaultValue={todayWAT()} /></Field>
            <Field label="Due date"><input type="date" name="due_on" /></Field>
            <label className="check"><input type="checkbox" name="vat" defaultChecked={!!prop && Number(prop.vat_rate) > 0} />Add VAT ({cc.vatRate}%)</label>
          </div>
          <Field label="Notes and payment details" help="e.g. bank name, account name and number."><textarea name="notes" rows={3} /></Field>
          <Submit>Create invoice</Submit>
        </form>
      )}
    </>
  );
}
