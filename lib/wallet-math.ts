// Wallet arithmetic, kept free of the database so it can be tested on its own.

/** A person's share of an amount at a percentage, rounded to kobo. */
export const share = (amount: number, pct: number) => Math.round(amount * pct) / 100;

/** Available = earned − withdrawals that are pending or paid (a rejected one gives the money back). */
export function available(earned: number, withdrawals: { amount: number; status: string }[]) {
  return Math.round((earned - withdrawals.filter((w) => w.status !== "rejected").reduce((s, w) => s + w.amount, 0)) * 100) / 100;
}

/** A withdrawal request is valid when it's a positive amount, in kobo, and no more than what's available. */
export const validWithdrawal = (amount: number, avail: number) => Number.isFinite(amount) && amount > 0 && Math.round(amount * 100) === amount * 100 && amount <= avail;
