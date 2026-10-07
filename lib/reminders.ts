import { q } from "./db";
import { send, notifyTeam } from "./auth";
import { carReminderStage, todayWAT, fmtDate, CAR_REMINDER_DAYS } from "./rules";

const BASE = process.env.APP_URL ?? "http://localhost:3000";

/** Daily: email each client's active contacts as their CAR filing date approaches, and alert the firm team in-app.
 *  Safe to run any number of times a day; car_reminders makes each stage send once. */
export async function sendCarReminders(now = new Date()) {
  const today = todayWAT(now);
  const clients = await q<{ id: string; firm_id: string; name: string; due: string }>(
    `select id, firm_id, name, car_filing_due_on as due from clients
     where archived_at is null and car_filing_due_on between $1::date and $1::date + $2::int`, [today, CAR_REMINDER_DAYS[0]]);
  let sent = 0;
  for (const c of clients) {
    const stage = carReminderStage(c.due, today);
    if (stage === null) continue;
    const claimed = await q("insert into car_reminders (client_id, due_on, days_before) values ($1,$2,$3) on conflict do nothing returning 1", [c.id, c.due, stage]);
    if (!claimed.length) continue;
    const when = stage === 0 ? "today" : `on ${fmtDate(c.due)}`;
    // Email carries no compliance content, only "log in to view" (TRD §9.1).
    const contacts = await q<{ email: string }>("select email from client_contacts where client_id = $1 and status = 'active'", [c.id]);
    for (const r of contacts) await send("email", r.email, "car_reminder", `Your annual Compliance Audit Return is due ${when}. Log in to view: ${BASE}/portal`);
    await notifyTeam(c.firm_id, c.id, "car_due", `${c.name}: Compliance Audit Return due ${when}`, `/app/clients/${c.id}/car-readiness`);
    sent++;
  }
  return { today, clients: sent };
}
