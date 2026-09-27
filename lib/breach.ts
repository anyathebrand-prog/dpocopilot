import { one, tx } from "./db";
import { audit, notifyTeam, type User } from "./auth";
import { breachDeadline } from "./rules";

export type BreachInput = { aware_at: Date; description: string; data_affected: string | null; subjects_affected: string | null; est_count: number | null; containment: string | null; severity: string | null; notification_required: string; reporter_phone?: string | null };

/** FR7.1–7.3, 7.6: records the incident, fixes the 72-hour deadline, alerts the team when the client reported it. */
export async function createBreach(u: User, client: { id: string; firm_id: string; name: string }, b: BreachInput, via: "firm" | "portal") {
  const id = await tx(async (t) => {
    const r = await t.query<{ id: string }>(`insert into breaches (firm_id, client_id, reported_via, reported_by, reporter_phone, aware_at, deadline_at, description, data_affected, subjects_affected, est_count, containment, severity, notification_required)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) returning id`,
      [client.firm_id, client.id, via, u.id, b.reporter_phone ?? null, b.aware_at, breachDeadline(b.aware_at), b.description, b.data_affected, b.subjects_affected, b.est_count, b.containment, b.severity, b.notification_required]);
    await audit(u, "create", "breach", r.rows[0].id, { client_id: client.id, firm_id: client.firm_id, details: { via } }, t);
    return r.rows[0].id;
  });
  if (via === "portal") await notifyTeam(client.firm_id, client.id, "breach_reported", `Suspected breach reported by ${client.name}`, `/app/clients/${client.id}/breaches/${id}`);
  return id;
}

export const reference = (id: string) => `BR-${id.slice(0, 8).toUpperCase()}`;

export async function breachFor(id: string, clientId: string) {
  return one("select * from breaches where id = $1 and client_id = $2", [/^[0-9a-f-]{36}$/.test(id) ? id : null, clientId]);
}
