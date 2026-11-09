import Link from "next/link";
import { redirect } from "next/navigation";
import { requireFirm, clientScope, scopeArgs } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { str } from "@/lib/form";
import { totals, sumMoney, type Line } from "@/lib/invoice";
import { moneyIn } from "@/lib/country";
import { fmtDate, todayWAT } from "@/lib/rules";
import { PageHead, Empty, Field } from "@/components/ui";

/** Pick a client, then create the invoice on its billing page. */
async function newInvoice(fd: FormData) {
  "use server";
  const u = await requireFirm();
  const id = str(fd, "client_id"), args = scopeArgs(u);
  const c = /^[0-9a-f-]{36}$/.test(id) ? await one<{ id: string }>(`select c.id from clients c where c.id = $${args.length + 1} and ${clientScope(u)}`, [...args, id]) : null;
  redirect(c ? `/app/clients/${c.id}/billing` : "/app/billing");
}

const STATUSES = ["all", "unpaid", "overdue", "paid", "cancelled"];

/** Every invoice across the clients this user can see, with outstanding, overdue and paid totals. */
export default async function FirmBilling({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const u = await requireFirm();
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status) ? sp.status : "all", today = todayWAT(), year = today.slice(0, 4);
  const all = await q(`select i.*, c.name as client from invoices i join clients c on c.id = i.client_id where ${clientScope(u)} order by i.issued_on desc, i.created_at desc`, scopeArgs(u));
  const clients = await q<{ id: string; name: string }>(`select c.id, c.name from clients c where c.archived_at is null and ${clientScope(u)} order by c.name`, scopeArgs(u));
  const total = (r: any) => totals(r.lines, Number(r.vat_rate)).total;
  const overdue = (r: any) => r.status === "unpaid" && r.due_on && r.due_on < today;
  const sum = sumMoney;
  const rows = all.filter((r) => status === "all" || (status === "overdue" ? overdue(r) : r.status === status));
  return (
    <>
      <PageHead title="Invoices" sub="Invoices across all your clients." />
      {clients.length > 0 && (
        <form action={newInvoice} className="panel row" style={{ alignItems: "flex-end", marginBottom: 16, maxWidth: 640 }}>
          <Field label="New invoice for"><select name="client_id" required defaultValue=""><option value="" disabled>Choose a client</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <button className="btn">Create invoice</button>
        </form>
      )}
      <div className="row" style={{ gap: 16, marginBottom: 16 }}>
        <div className="panel"><div className="meta">Outstanding</div><b className="num">{sum(all.filter((r) => r.status === "unpaid"))}</b></div>
        <div className="panel"><div className="meta">Overdue</div><b className="num">{sum(all.filter(overdue))}</b></div>
        <div className="panel"><div className="meta">Paid in {year}</div><b className="num">{sum(all.filter((r) => r.status === "paid" && String(r.paid_on ?? "").startsWith(year)))}</b></div>
      </div>
      <nav className="row" style={{ gap: 12, marginBottom: 12 }} aria-label="Filter by status">
        {STATUSES.map((s) => s === status ? <b key={s}>{s}</b> : <Link key={s} href={`/app/billing?status=${s}`}>{s}</Link>)}
      </nav>
      {rows.length === 0 ? <Empty><p>No invoices here. Choose a client above to create one.</p></Empty> : (
        <table className="register">
          <thead><tr><th>Invoice</th><th>Client</th><th>Date</th><th>Services</th><th className="num">Total</th><th>Status</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id}>
              <td><a href={`/export?kind=invoice&id=${r.id}&format=pdf`} target="_blank">{r.number}</a></td>
              <td data-label="Client"><Link href={`/app/clients/${r.client_id}/billing`}>{r.client}</Link></td>
              <td data-label="Date" className="small">{fmtDate(r.issued_on)}{r.due_on && <span className="meta"><br />Due {fmtDate(r.due_on)}</span>}</td>
              <td data-label="Services" className="small">{(r.lines as Line[]).map((l) => l.service).join(", ")}</td>
              <td data-label="Total" className="num">{moneyIn(r.currency, total(r))}</td>
              <td data-label="Status" className="small">{overdue(r) ? <b>overdue</b> : r.status}{r.status === "paid" && r.receipt_no && <><br /><a href={`/export?kind=receipt&id=${r.id}&format=pdf`} target="_blank">{r.receipt_no}</a></>}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </>
  );
}
