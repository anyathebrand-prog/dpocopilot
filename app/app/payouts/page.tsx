import { redirect } from "next/navigation";
import { requireFirmRole, audit, send } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { str, flash } from "@/lib/form";
import { money } from "@/lib/country";
import { fmtWAT } from "@/lib/rules";
import { PageHead, Flash, Hidden, Field, Empty } from "@/components/ui";
import { Submit } from "@/components/client";

const BACK = "/app/payouts";

async function decide(fd: FormData) {
  "use server";
  const u = await requireFirmRole("firm_admin");
  const paid = str(fd, "op") === "paid", note = str(fd, "note").slice(0, 500);
  if (!paid && !note) redirect(flash(BACK, "Give a reason when rejecting a withdrawal.", "error"));
  const w = await one(`update withdrawals set status = $3, note = $4, decided_by = $5, decided_at = now() where id = $1 and payer_firm_id = $2 and status = 'pending'
    returning id, user_id, amount`, [/^[0-9a-f-]{36}$/.test(str(fd, "id")) ? str(fd, "id") : null, u.firm_id, paid ? "paid" : "rejected", note || null, u.id]);
  if (!w) redirect(BACK);
  await audit(u, "update", "withdrawal", w.id, { details: { status: paid ? "paid" : "rejected" } });
  // Tell the person in their own workspace (a Solo DPO's is their practice) and by email.
  const to = await one("select u.email, m.firm_id from users u left join memberships m on m.user_id = u.id and m.status = 'active' where u.id = $1", [w.user_id]);
  const msg = paid ? `${u.firm_name} paid your withdrawal of ${money(Number(w.amount))} to your bank account.` : `${u.firm_name} rejected your withdrawal of ${money(Number(w.amount))}: ${note}`;
  if (to?.firm_id) await q("insert into notifications (firm_id, recipient_user_id, kind, message, link) values ($1,$2,'withdrawal_decision',$3,'/app/wallet')", [to.firm_id, w.user_id, msg]);
  if (to?.email) await send("email", to.email, "withdrawal_decision", `${msg} Log in to view: ${process.env.APP_URL ?? "http://localhost:3000"}/app/wallet`);
  redirect(flash(BACK, paid ? "Marked as paid and the person notified." : "Rejected and the person notified."));
}

/** Firm Admin: withdrawal requests from the firm's team and Solo DPOs. Pay from the firm's bank, then mark as paid. */
export default async function Payouts({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const u = await requireFirmRole("firm_admin");
  const sp = await searchParams;
  const rows = await q(`select w.*, us.name from withdrawals w join users us on us.id = w.user_id where w.payer_firm_id = $1 order by w.status = 'pending' desc, w.created_at desc limit 200`, [u.firm_id]);
  const owed = await q(`select us.name, (sum(e.amount) - coalesce((select sum(x.amount) from withdrawals x where x.user_id = e.user_id and x.payer_firm_id = $1 and x.status <> 'rejected'), 0))::float as balance
    from wallet_entries e join users us on us.id = e.user_id where e.payer_firm_id = $1 group by e.user_id, us.name order by us.name`, [u.firm_id]);
  const pending = rows.filter((r) => r.status === "pending");
  return (
    <>
      <PageHead title="Payouts" sub="Withdrawals requested by your team and Solo DPOs. Pay them from your firm's bank, then mark them as paid." />
      <Flash sp={sp} />
      <h2>To pay</h2>
      {pending.length === 0 ? <p className="meta">No withdrawals waiting.</p> : pending.map((w) => (
        <form key={w.id} action={decide} className="panel" style={{ marginBottom: 12 }}><Hidden values={{ id: w.id }} />
          <div className="spread">
            <span><b>{w.name}</b> · <b className="num">{money(Number(w.amount))}</b><div className="meta">Requested {fmtWAT(w.created_at)}</div></span>
            <span className="small">{w.bank_account_name}<br />{w.bank_name} · <span className="num">{w.bank_account_number}</span></span>
          </div>
          <div className="row" style={{ marginTop: 8, alignItems: "flex-end" }}>
            <Field label="Note" help="Required when rejecting."><input name="note" style={{ width: 300 }} /></Field>
            <Submit name="op" value="paid">Mark as paid</Submit><Submit className="btn secondary" name="op" value="reject">Reject</Submit>
          </div>
        </form>
      ))}
      <h2>Balances owed</h2>
      {owed.length === 0 ? <Empty><p>Nobody has earned anything from your firm yet.</p></Empty> : (
        <table className="register"><thead><tr><th>Person</th><th className="num">Available to withdraw</th></tr></thead>
          <tbody>{owed.map((o) => <tr key={o.name}><td>{o.name}</td><td data-label="Available" className="num">{money(o.balance)}</td></tr>)}</tbody></table>
      )}
      <h2>History</h2>
      {rows.filter((r) => r.status !== "pending").length === 0 ? <p className="meta">Nothing paid yet.</p> : (
        <table className="register"><thead><tr><th>Person</th><th className="num">Amount</th><th>Status</th></tr></thead>
          <tbody>{rows.filter((r) => r.status !== "pending").map((w) => (
            <tr key={w.id}><td>{w.name}</td><td data-label="Amount" className="num">{money(Number(w.amount))}</td><td data-label="Status" className="small">{w.status === "paid" ? `Paid ${fmtWAT(w.decided_at)}` : `Rejected: ${w.note}`}</td></tr>
          ))}</tbody></table>
      )}
    </>
  );
}
