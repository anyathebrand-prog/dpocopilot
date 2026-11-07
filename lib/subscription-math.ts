// DPCO annual subscription: pure date rules (no database), shared by the gate, the pay page and the daily reminders.
const addDays = (d: string, n: number) => { const x = new Date(d + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const daysUntil = (d: string, today: string) => Math.round((Date.parse(d) - Date.parse(today)) / 86_400_000);

export const GRACE_DAYS = 7;
export type SubState = "unpaid" | "active" | "grace" | "locked";

/** unpaid: never paid. active: on or before the end date. grace: up to 7 days after, read-only. locked: after that. */
export function subState(ends: string | null | undefined, today: string): SubState {
  if (!ends) return "unpaid";
  if (today <= ends) return "active";
  return today <= addDays(ends, GRACE_DAYS) ? "grace" : "locked";
}

const plusYear = (d: string) => `${Number(d.slice(0, 4)) + 1}${d.slice(4) === "-02-29" ? "-02-28" : d.slice(4)}`;

/** The new end date after a payment: a year on from the current end while it is still running or in grace (early renewals keep their days), otherwise a year from today. */
export const nextEnd = (ends: string | null | undefined, today: string) => {
  const s = subState(ends, today);
  return plusYear(s === "active" || s === "grace" ? ends! : today);
};

/** Reminder stages, by days until the end date. Only the latest stage reached is sent, once per end date. */
export const STAGES: [string, number][] = [["d30", 30], ["d7", 7], ["d1", 1], ["grace", -1], ["locked", -(GRACE_DAYS + 1)]];
export function reminderStage(ends: string, today: string): string | null {
  const left = daysUntil(ends, today);
  let stage: string | null = null;
  for (const [s, at] of STAGES) if (left <= at) stage = s;
  return stage;
}
