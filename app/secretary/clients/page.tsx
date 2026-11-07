import { redirect } from "next/navigation";
import { requireSecretary, audit } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { str, flash } from "@/lib/form";
import { fmtDate, todayWAT } from "@/lib/rules";
import { subState, nextEnd } from "@/lib/subscription-math";
import { Flash, Hidden, PageHead, Empty } from "@/components/ui";
import { Submit } from "@/components/client";

const BACK = "/secretary/clients";
const STATE_LABEL = { active: "Active", grace: "Read-only (grace)", locked: "Paused", unpaid: "—" };

/** Secretary renews a client by a year (no payment taken here, e.g. paid outside Paystack), or sets its end date. */
async function renewClient(fd: FormData) {
  "use server";
  const u = await requireSecretary();
  const c = await one<{ id: string; firm_id: string; name: string; e: string | null }>("select id, firm_id, name, subscription_ends::text as e from clients where id = $1", [/^[0-9a-f-]{36}$/.test(str(fd, "client_id")) ? str(fd, "client_id") : null]);
  if (!c) redirect(BACK);
  const set = str(fd, "ends");
  if (set && !/^\d{4}-\d{2}-\d{2}$/.test(set)) redirect(flash(BACK, "Enter a valid date.", "error"));
  const end = str(fd, "op") === "renew" ? nextEnd(c.e, todayWAT()) : set || null;
  await q("update clients set subscription_ends = $2 where id = $1", [c.id, end]);
  await audit(u, "update", "client", c.id, { firm_id: c.firm_id, client_id: c.id, details: { subscription_ends: end, by: "secretary" } });
  redirect(flash(BACK, end ? `${c.name}'s subscription now ends on ${fmtDate(end)}.` : `${c.name} has no subscription end date.`));
}

/** Every client's subscription across the platform, soonest end first. */
export default async function SecretaryClients({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireSecretary();
  const sp = await searchParams;
  const today = todayWAT();
  const rows = await q<{ id: string; name: string; firm: string; e: string | null }>(`select c.id, c.name, f.name as firm, c.subscription_ends::text as e
    from clients c join firms f on f.id = c.firm_id where c.archived_at is null order by c.subscription_ends nulls last, f.name, c.name`);
  return (
    <>
      <PageHead title="Client subscriptions" sub="Each client's subscription runs a year from payment. After it ends, their portal is read-only for 7 days, then paused. The DPCO renews through Paystack; you can renew here without a payment." />
      <Flash sp={sp} />
      {rows.length === 0 ? <Empty><p>No clients yet.</p></Empty> : (
        <table className="register">
          <thead><tr><th>Client</th><th>DPCO</th><th>Status</th><th>Ends</th><th>Renew</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id}>
              <td>{r.name}</td>
              <td data-label="DPCO">{r.firm}</td>
              <td data-label="Status">{r.e ? STATE_LABEL[subState(r.e, today)] : <span className="meta">No subscription</span>}</td>
              <td data-label="Ends">
                <form action={renewClient} className="row">
                  <Hidden values={{ client_id: r.id }} />
                  <input type="date" name="ends" defaultValue={r.e ?? ""} aria-label={`Subscription end for ${r.name}`} style={{ width: "auto" }} />
                  <Submit className="btn secondary">Save</Submit>
                </form>
              </td>
              <td data-label="Renew">
                <form action={renewClient}><Hidden values={{ client_id: r.id, op: "renew" }} /><Submit className="btn secondary">Renew 1 year</Submit></form>
              </td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </>
  );
}
