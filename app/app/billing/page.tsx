import Link from "next/link";
import { requireFirm, clientScope, scopeArgs } from "@/lib/auth";
import { q } from "@/lib/db";
import { totals, naira, type Line } from "@/lib/invoice";
import { fmtDate, todayWAT } from "@/lib/rules";
import { PageHead, Empty } from "@/components/ui";

const STATUSES = ["all", "unpaid", "overdue", "paid", "cancelled"];

/** Every invoice across the clients this user can see, with outstanding, overdue and paid totals. */
export default async function FirmBilling({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const u = await requireFirm();
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status) ? sp.status : "all", today = todayWAT(), year = today.slice(0, 4);
  const all = await q(`select i.*, c.name as client from invoices i join clients c on c.id = i.client_id where ${clientScope(u)} order by i.issued_on desc, i.created_at desc`, scopeArgs(u));
  const total = (r: any) => totals(r.lines, Number(r.vat_rate)).total;
  const overdue = (r: any) => r.status === "unpaid" && r.due_on && r.due_on < today;
  const sum = (rs: any[]) => naira(rs.reduce((s, r) => s + total(r), 0));
  const rows = all.filter((r) => status === "all" || (status === "overdue" ? overdue(r) : r.status === status));
  return (
    <>
      <PageHead title="Billing" sub="Invoices across all your clients." />
      <div className="row" style={{ gap: 16, marginBottom: 16 }}>
        <div className="panel"><div className="meta">Outstanding</div><b className="num">{sum(all.filter((r) => r.status === "unpaid"))}</b></div>
        <div className="panel"><div className="meta">Overdue</div><b className="num">{sum(all.filter(overdue))}</b></div>
        <div className="panel"><div className="meta">Paid in {year}</div><b className="num">{sum(all.filter((r) => r.status === "paid" && String(r.paid_on ?? "").startsWith(year)))}</b></div>
      </div>
      <nav className="row" style={{ gap: 12, marginBottom: 12 }} aria-label="Filter by status">
        {STATUSES.map((s) => s === status ? <b key={s}>{s}</b> : <Link key={s} href={`/app/billing?status=${s}`}>{s}</Link>)}
      </nav>
      {rows.length === 0 ? <Empty><p>No invoices here. Create one from a client&apos;s Billing section.</p></Empty> : (
        <table className="register">
          <thead><tr><th>Invoice</th><th>Client</th><th>Date</th><th>Services</th><th className="num">Total</th><th>Status</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id}>
              <td><a href={`/export?kind=invoice&id=${r.id}&format=pdf`} target="_blank">{r.number}</a></td>
              <td data-label="Client"><Link href={`/app/clients/${r.client_id}/billing`}>{r.client}</Link></td>
              <td data-label="Date" className="small">{fmtDate(r.issued_on)}{r.due_on && <span className="meta"><br />Due {fmtDate(r.due_on)}</span>}</td>
              <td data-label="Services" className="small">{(r.lines as Line[]).map((l) => l.service).join(", ")}</td>
              <td data-label="Total" className="num">{naira(total(r))}</td>
              <td data-label="Status" className="small">{overdue(r) ? <b>overdue</b> : r.status}{r.status === "paid" && r.receipt_no && <><br /><a href={`/export?kind=receipt&id=${r.id}&format=pdf`} target="_blank">{r.receipt_no}</a></>}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </>
  );
}
