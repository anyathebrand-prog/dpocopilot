// Wallet earnings: written when a task is done or an invoice is paid, removed again if that's undone.
import { q, one } from "./db";
import { totals } from "./invoice";
import { share, available } from "./wallet-math";

/** A done task with a fee earns its assignee that fee, paid by the task's firm (not for a Solo DPO's own tasks). */
export async function syncTaskEarning(taskId: string) {
  await q("delete from wallet_entries where kind = 'task_fee' and source_id = $1", [taskId]);
  const t = await one(`select t.id, t.title, t.fee, t.firm_id, m.user_id, c.name as client from tasks t join firms f on f.id = t.firm_id
    join memberships m on m.id = t.assignee_membership_id join clients c on c.id = t.client_id
    where t.id = $1 and t.status = 'done' and t.fee > 0 and f.plan <> 'solo'`, [taskId]);
  if (t) await q("insert into wallet_entries (user_id, payer_firm_id, kind, source_id, amount, description) values ($1,$2,'task_fee',$3,$4,$5)",
    [t.user_id, t.firm_id, t.id, Number(t.fee), `Task fee: ${t.title} (${t.client})`]);
}

/**
 * A paid invoice (naira, before VAT) earns:
 * - on a DPCO firm, each person assigned to the client their own % (memberships.earning_pct), paid by the firm;
 * - on a Solo DPO's practice, the Solo DPO their % (firms.solo_share_pct), paid by their DPCO, which collects from the client.
 */
export async function syncInvoiceEarnings(invoiceId: string) {
  await q("delete from wallet_entries where kind = 'invoice_share' and source_id = $1", [invoiceId]);
  const inv = await one(`select i.*, c.name as client, f.plan, f.dpco_firm_id, f.dpco_status, f.solo_share_pct from invoices i
    join clients c on c.id = i.client_id join firms f on f.id = i.firm_id where i.id = $1 and i.status = 'paid'`, [invoiceId]);
  if (!inv || (inv.currency && inv.currency !== "NGN")) return; // shortcut: wallets are in naira; other currencies aren't shared yet
  const base = totals(inv.lines, 0).subtotal, what = `${inv.number} (${inv.client})`;
  const credit = (userId: string, payer: string, pct: number) => share(base, pct) > 0
    ? q("insert into wallet_entries (user_id, payer_firm_id, kind, source_id, amount, description) values ($1,$2,'invoice_share',$3,$4,$5) on conflict do nothing",
      [userId, payer, inv.id, share(base, pct), `${pct}% of invoice ${what}`]) : null;
  if (inv.plan === "solo") {
    if (inv.dpco_status !== "approved" || !inv.dpco_firm_id) return;
    const m = await one("select user_id from memberships where firm_id = $1 and status = 'active' order by created_at limit 1", [inv.firm_id]);
    if (m) await credit(m.user_id, inv.dpco_firm_id, Number(inv.solo_share_pct));
    return;
  }
  const team = await q(`select m.user_id, m.earning_pct from client_assignments ca join memberships m on m.id = ca.membership_id
    where ca.client_id = $1 and m.status = 'active' and m.earning_pct > 0`, [inv.client_id]);
  for (const m of team) await credit(m.user_id, inv.firm_id, Number(m.earning_pct));
}

/** A person's wallet, per firm that pays them: earned, withdrawn, available, and the history. */
export async function walletOf(userId: string) {
  const firms = await q(`select f.id, f.name,
      coalesce((select sum(amount) from wallet_entries e where e.user_id = $1 and e.payer_firm_id = f.id), 0)::float as earned
    from firms f where exists (select 1 from wallet_entries e where e.user_id = $1 and e.payer_firm_id = f.id)
       or exists (select 1 from withdrawals w where w.user_id = $1 and w.payer_firm_id = f.id) order by f.name`, [userId]);
  const wds = await q("select * from withdrawals where user_id = $1 order by created_at desc", [userId]);
  const entries = await q("select e.*, f.name as payer from wallet_entries e join firms f on f.id = e.payer_firm_id where e.user_id = $1 order by e.created_at desc limit 200", [userId]);
  return {
    payers: firms.map((f) => {
      const mine = wds.filter((w) => w.payer_firm_id === f.id).map((w) => ({ amount: Number(w.amount), status: w.status }));
      return { id: f.id as string, name: f.name as string, earned: f.earned as number, available: available(f.earned, mine) };
    }),
    withdrawals: wds, entries,
  };
}
