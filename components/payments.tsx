import { paidPct, type Payment } from "@/lib/invoice";

/** Receipt links, one per instalment payment. */
export function Receipts({ id, payments, word }: { id: string; payments: Payment[]; word?: boolean }) {
  if (!payments?.length) return null;
  return <>{payments.map((p) => (
    <span key={p.id} style={{ display: "block" }}>
      <a href={`/export?kind=receipt&id=${id}&pay=${p.id}&format=pdf`} target="_blank">{p.receipt_no}</a> <span className="meta">({Number(p.percent)}%)</span>
      {word && <> · <a href={`/export?kind=receipt&id=${id}&pay=${p.id}&format=doc`}>Word</a></>}
    </span>
  ))}</>;
}

/** Confirm payment: pick the % the client paid (instalments), up to what is still owed. */
export function ConfirmPayment({ id, payments, action, back }: { id: string; payments: Payment[]; action: (fd: FormData) => Promise<void>; back?: string }) {
  const left = 100 - paidPct(payments);
  if (left <= 0) return null;
  const opts = [...new Set([10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90].filter((n) => n < left).concat(left))];
  return (
    <form action={action} className="row" style={{ gap: 6, alignItems: "center", flexWrap: "nowrap" }}>
      <input type="hidden" name="id" value={id} /><input type="hidden" name="status" value="paid" />
      {back && <input type="hidden" name="back" value={back} />}
      <select name="percent" defaultValue={left} aria-label="Percentage paid" style={{ width: "auto" }}>
        {opts.map((n) => <option key={n} value={n}>{n === left && left < 100 ? `${n}% (balance)` : `${n}%`}</option>)}
      </select>
      <button className="btn">Confirm payment</button>
    </form>
  );
}
