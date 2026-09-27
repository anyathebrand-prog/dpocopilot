import { q, tx } from "./db";
import { audit, notifyTeam, type User } from "./auth";
import { setting } from "./data";
import { dsarDeadline } from "./rules";

export type DsarInput = { request_type: string; received_on: string; requester_name: string; requester_contact: string | null; details: string | null; id_status?: string; ropa?: string[] };

/** FR16.1–16.3: deadline = date received + the published DSAR period (default 30 days), snapshotted on the record. */
export async function createDsar(u: User, client: { id: string; firm_id: string; name: string }, d: DsarInput, via: "firm" | "portal") {
  const days = Number(await setting("dsar_response_days")) || 30;
  const ropa = d.ropa?.length ? (await q("select id from ropa_entries where client_id = $1 and id = any($2::uuid[])", [client.id, d.ropa])).map((r) => r.id) : [];
  const id = await tx(async (t) => {
    const r = await t.query<{ id: string }>(`insert into dsars (firm_id, client_id, source, logged_by, request_type, received_on, period_days, deadline_on, requester_name, requester_contact, details, id_status)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning id`,
      [client.firm_id, client.id, via, u.id, d.request_type, d.received_on, days, dsarDeadline(d.received_on, days), d.requester_name, d.requester_contact, d.details, d.id_status ?? "not_verified"]);
    for (const e of ropa) await t.query("insert into dsar_ropa (dsar_id, ropa_entry_id) values ($1,$2)", [r.rows[0].id, e]);
    await audit(u, "create", "dsar", r.rows[0].id, { client_id: client.id, firm_id: client.firm_id, details: { via } }, t);
    return r.rows[0].id;
  });
  if (via === "portal") await notifyTeam(client.firm_id, client.id, "dsar_logged", `${client.name} logged a data subject request`, `/app/clients/${client.id}/dsars/${id}`);
  return id;
}
