import Link from "next/link";
import { requireContact } from "@/lib/auth";
import { q } from "@/lib/db";
import { totals, sumMoney, paidPct, PAYMENTS_SQL, type Line } from "@/lib/invoice";
import { Receipts } from "@/components/payments";
import { moneyIn } from "@/lib/country";
import { fmtDate } from "@/lib/rules";
import { Empty } from "@/components/ui";

/** The client's invoices from their DPCO (cancelled ones hidden), each downloadable as PDF or Word. */
export default async function PortalInvoices() {
  const u = await requireContact();
  const rows = await q(`select i.*, ${PAYMENTS_SQL} from invoices i where i.client_id = $1 and i.status <> 'cancelled' order by i.issued_on desc, i.created_at desc`, [u.client_id]);
  const notices = await q("select n.id, n.audit_year, n.sent_at, i.number from audit_notices n left join invoices i on i.id = n.invoice_id where n.client_id = $1 and n.sent_at is not null order by n.audit_year desc", [u.client_id]);
  const due = sumMoney(rows.filter((r) => r.status === "unpaid"));
  const exp = (id: string, f: string) => `/export?kind=invoice&id=${id}&format=${f}`;
  return (
    <>
      <nav className="meta"><Link href="/portal">Home</Link> / Invoices</nav>
      <h1>Invoices</h1>
      <p className="meta">From {u.firm_name}. Outstanding: <b>{due}</b></p>
      {notices.length > 0 && (
        <section style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 18 }}>Compliance audit notices</h2>
          {notices.map((n) => (
            <div key={n.id} className="rule-row info"><span><b>{n.audit_year} Compliance Audit Notification</b>{n.number && <span className="meta"> · with invoice {n.number}</span>}</span>
              <a className="btn secondary" href={`/export?kind=audit-notice&id=${n.id}&format=pdf`} target="_blank">Open letter</a></div>
          ))}
        </section>
      )}
      {rows.length === 0 ? <Empty><p>No invoices yet.</p></Empty> : (
        <table className="register">
          <thead><tr><th>Invoice</th><th>Date</th><th>Services</th><th className="num">Total</th><th>Status</th><th></th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id}>
              <td>{r.number}</td>
              <td data-label="Date" className="small">{fmtDate(r.issued_on)}{r.due_on && r.status === "unpaid" && <span className="meta"><br />Due {fmtDate(r.due_on)}</span>}</td>
              <td data-label="Services" className="small">{(r.lines as Line[]).map((l) => l.service).join(", ")}</td>
              <td data-label="Total" className="num">{moneyIn(r.currency, totals(r.lines, Number(r.vat_rate)).total)}</td>
              <td data-label="Status">{r.status === "paid" ? "Paid" : paidPct(r.payments) > 0 ? `Part paid (${paidPct(r.payments)}%)` : "Unpaid"}<Receipts id={r.id} payments={r.payments} /></td>
              <td><div className="row" style={{ gap: 6, flexWrap: "wrap" }}><a className="btn secondary" href={exp(r.id, "pdf")} target="_blank">PDF</a><a className="btn secondary" href={exp(r.id, "doc")}>Word</a></div></td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </>
  );
}
