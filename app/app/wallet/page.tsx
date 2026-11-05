import { redirect } from "next/navigation";
import { requireFirm, audit } from "@/lib/auth";
import { q, one, tx } from "@/lib/db";
import { str, flash } from "@/lib/form";
import { money, parseAmount } from "@/lib/country";
import { fmtWAT } from "@/lib/rules";
import { walletOf } from "@/lib/wallet";
import { available, validWithdrawal } from "@/lib/wallet-math";
import { notifyFirm } from "@/lib/solo";
import { PageHead, Flash, Field, Empty } from "@/components/ui";
import { Submit } from "@/components/client";

const BACK = "/app/wallet";

async function saveBank(fd: FormData) {
  "use server";
  const u = await requireFirm();
  const bank = str(fd, "bank_name").slice(0, 100), num = str(fd, "bank_account_number").replace(/\s/g, ""), name = str(fd, "bank_account_name").slice(0, 200);
  if (!bank || !/^\d{10}$/.test(num) || !name) redirect(flash(BACK, "Enter your bank, 10-digit account number and account name.", "error"));
  await q("update users set bank_name = $2, bank_account_number = $3, bank_account_name = $4 where id = $1", [u.id, bank, num, name]);
  await audit(u, "update", "user", u.id, { details: { bank_details: true } });
  redirect(flash(BACK, "Bank details saved."));
}

async function withdraw(fd: FormData) {
  "use server";
  const u = await requireFirm();
  const payer = str(fd, "payer"), amount = parseAmount(str(fd, "amount"));
  if (!/^[0-9a-f-]{36}$/.test(payer)) redirect(BACK);
  const me = await one("select bank_name, bank_account_number, bank_account_name from users where id = $1", [u.id]);
  if (!me?.bank_account_number) redirect(flash(BACK, "Add your bank details first.", "error"));
  const w = await tx(async (t) => {
    await t.query("select 1 from users where id = $1 for update", [u.id]); // one withdrawal at a time per person
    const earned = Number((await t.query("select coalesce(sum(amount), 0) as s from wallet_entries where user_id = $1 and payer_firm_id = $2", [u.id, payer])).rows[0].s);
    const prev = (await t.query("select amount, status from withdrawals where user_id = $1 and payer_firm_id = $2", [u.id, payer])).rows.map((r: any) => ({ amount: Number(r.amount), status: r.status }));
    if (!validWithdrawal(amount, available(earned, prev))) return null;
    return (await t.query("insert into withdrawals (user_id, payer_firm_id, amount, bank_name, bank_account_number, bank_account_name) values ($1,$2,$3,$4,$5,$6) returning id",
      [u.id, payer, amount, me!.bank_name, me!.bank_account_number, me!.bank_account_name])).rows[0];
  });
  if (!w) redirect(flash(BACK, "Enter an amount up to your available balance.", "error"));
  await audit(u, "create", "withdrawal", w.id, { details: { amount } });
  await notifyFirm(payer, "withdrawal_request", `${u.name} asked to withdraw ${money(amount)} to their bank account.`, "/app/payouts", ["firm_admin"]);
  redirect(flash(BACK, `Withdrawal of ${money(amount)} requested. You'll be notified when it's paid.`));
}

/** What this person has earned (task fees, their share of paid invoices), withdrawn and can withdraw, per firm that pays them. */
export default async function Wallet({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const u = await requireFirm();
  const sp = await searchParams;
  const w = await walletOf(u.id);
  const me = (await one("select bank_name, bank_account_number, bank_account_name from users where id = $1", [u.id]))!;
  const total = w.payers.reduce((s, p) => s + p.available, 0);
  return (
    <>
      <PageHead title="Wallet" sub="What you've earned from task fees and your share of paid client invoices, and what you've withdrawn." />
      <Flash sp={sp} />
      <div className="row" style={{ gap: 16, marginBottom: 16 }}>
        <div className="panel"><div className="meta">Available to withdraw</div><b className="num" style={{ fontSize: 24 }}>{money(total)}</b></div>
        <div className="panel"><div className="meta">Earned in total</div><b className="num" style={{ fontSize: 24 }}>{money(w.payers.reduce((s, p) => s + p.earned, 0))}</b></div>
      </div>

      {w.payers.length > 0 && (
        <form action={withdraw} className="panel row" style={{ alignItems: "flex-end", maxWidth: 720 }}>
          <Field label="Paid by" required>
            <select name="payer" required>{w.payers.map((p) => <option key={p.id} value={p.id}>{p.name} · {money(p.available)} available</option>)}</select>
          </Field>
          <Field label="Amount (₦)" required><input name="amount" inputMode="decimal" required style={{ width: 160 }} /></Field>
          <Submit>Withdraw to my bank</Submit>
        </form>
      )}

      <form action={saveBank} className="panel" style={{ maxWidth: 720, marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Bank account</h3>
        <p className="meta">Withdrawals are paid here by the firm that owes you.</p>
        <div className="row">
          <Field label="Bank" required><input name="bank_name" defaultValue={me.bank_name ?? ""} required placeholder="e.g. Access Bank" /></Field>
          <Field label="Account number" required><input name="bank_account_number" defaultValue={me.bank_account_number ?? ""} required inputMode="numeric" pattern="\d{10}" maxLength={10} style={{ width: 160 }} /></Field>
          <Field label="Account name" required><input name="bank_account_name" defaultValue={me.bank_account_name ?? ""} required /></Field>
        </div>
        <Submit className="btn secondary">Save bank details</Submit>
      </form>

      <h2>Withdrawals</h2>
      {w.withdrawals.length === 0 ? <p className="meta">None yet.</p> : (
        <table className="register"><thead><tr><th>Requested</th><th className="num">Amount</th><th>Status</th></tr></thead>
          <tbody>{w.withdrawals.map((x) => (
            <tr key={x.id}><td className="small">{fmtWAT(x.created_at)}</td><td data-label="Amount" className="num">{money(Number(x.amount))}</td>
              <td data-label="Status">{x.status === "paid" ? `Paid ${fmtWAT(x.decided_at)}` : x.status === "rejected" ? `Rejected: ${x.note ?? ""}` : "Pending"}</td></tr>
          ))}</tbody></table>
      )}

      <h2>Earnings</h2>
      {w.entries.length === 0 ? <Empty><p>No earnings yet. They appear when a task assigned to you with a fee is marked done, or a client invoice you share in is paid.</p></Empty> : (
        <table className="register"><thead><tr><th>Date</th><th>For</th><th>Paid by</th><th className="num">Amount</th></tr></thead>
          <tbody>{w.entries.map((e) => (
            <tr key={e.id}><td className="small">{fmtWAT(e.created_at)}</td><td data-label="For">{e.description}</td><td data-label="Paid by" className="small">{e.payer}</td><td data-label="Amount" className="num">{money(Number(e.amount))}</td></tr>
          ))}</tbody></table>
      )}
    </>
  );
}
