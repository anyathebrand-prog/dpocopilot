import Link from "next/link";
import { requireContact } from "@/lib/auth";
import { q } from "@/lib/db";
import { totals, naira, type Line } from "@/lib/invoice";
import { fmtDate } from "@/lib/rules";
import { Empty } from "@/components/ui";

/** The client's invoices from their DPCO (cancelled ones hidden), each downloadable as PDF or Word. */
export default async function PortalInvoices() {
  const u = await requireContact();
  const rows = await q("select * from invoices where client_id = $1 and status <> 'cancelled' order by issued_on desc, created_at desc", [u.client_id]);
  const due = rows.filter((r) => r.status === "unpaid").reduce((s, r) => s + totals(r.lines, Number(r.vat_rate)).total, 0);
  const exp = (id: string, f: string) => `/export?kind=invoice&id=${id}&format=${f}`;
  return (
    <>
      <nav className="meta"><Link href="/portal">Home</Link> / Invoices</nav>
      <h1>Invoices</h1>
      <p className="meta">From {u.firm_name}. Outstanding: <b>{naira(due)}</b></p>
      {rows.length === 0 ? <Empty><p>No invoices yet.</p></Empty> : (
        <table className="register">
          <thead><tr><th>Invoice</th><th>Date</th><th>Services</th><th className="num">Total</th><th>Status</th><th></th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id}>
              <td>{r.number}</td>
              <td data-label="Date" className="small">{fmtDate(r.issued_on)}{r.due_on && r.status === "unpaid" && <span className="meta"><br />Due {fmtDate(r.due_on)}</span>}</td>
              <td data-label="Services" className="small">{(r.lines as Line[]).map((l) => l.service).join(", ")}</td>
              <td data-label="Total" className="num">{naira(totals(r.lines, Number(r.vat_rate)).total)}</td>
              <td data-label="Status">{r.status === "paid" ? "Paid" : "Unpaid"}</td>
              <td className="row" style={{ gap: 6 }}>{r.status === "paid" && r.receipt_no && <a className="btn" href={`/export?kind=receipt&id=${r.id}&format=pdf`} target="_blank">Receipt</a>}<a className="btn secondary" href={exp(r.id, "pdf")} target="_blank">PDF</a><a className="btn secondary" href={exp(r.id, "doc")}>Word</a></td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </>
  );
}
