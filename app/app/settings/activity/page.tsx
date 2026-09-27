import { requireFirmRole } from "@/lib/auth";
import { q } from "@/lib/db";
import { fmtWAT } from "@/lib/rules";
import { PageHead, Empty } from "@/components/ui";

const ACTIONS = ["create", "update", "archive", "submit_for_review", "approve", "sign", "export", "import", "login", "login_failed", "logout", "ai_generate", "classify", "role_change", "deactivate", "invite"];

/** FR14.5: read-only, filterable. The table itself rejects updates and deletes. */
export default async function Activity({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const u = await requireFirmRole("firm_admin");
  const sp = await searchParams;
  const users = await q("select distinct u.id, u.name from audit_events a join users u on u.id = a.actor_user_id where a.firm_id = $1 order by u.name", [u.firm_id]);
  const clients = await q("select id, name from clients where firm_id = $1 order by name", [u.firm_id]);
  const rows = await q(`select a.*, us.name as user_name, c.name as client_name from audit_events a left join users us on us.id = a.actor_user_id left join clients c on c.id = a.client_id
    where a.firm_id = $1 and ($2 = '' or a.actor_user_id::text = $2) and ($3 = '' or a.client_id::text = $3) and ($4 = '' or a.action = $4)
      and ($5 = '' or a.occurred_at >= ($5 || 'T00:00:00+01:00')::timestamptz) and ($6 = '' or a.occurred_at <= ($6 || 'T23:59:59+01:00')::timestamptz)
    order by a.occurred_at desc limit 500`, [u.firm_id, sp.user ?? "", sp.client ?? "", sp.action ?? "", sp.from ?? "", sp.to ?? ""]);
  return (
    <>
      <PageHead title="Activity log" sub="Every create, edit, approval, signature, export, import, sign-in and AI generation. Showing the latest 500 matching entries." />
      <form className="row" style={{ alignItems: "flex-end", marginBottom: 16 }} aria-label="Filters">
        <label className="small">User <select name="user" defaultValue={sp.user ?? ""} style={{ display: "block" }}><option value="">Everyone</option>{users.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label className="small">Client <select name="client" defaultValue={sp.client ?? ""} style={{ display: "block" }}><option value="">All</option>{clients.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label className="small">Action <select name="action" defaultValue={sp.action ?? ""} style={{ display: "block" }}><option value="">All</option>{ACTIONS.map((a) => <option key={a} value={a}>{a.replace(/_/g, " ")}</option>)}</select></label>
        <label className="small">From <input type="date" name="from" defaultValue={sp.from ?? ""} style={{ display: "block" }} /></label>
        <label className="small">To <input type="date" name="to" defaultValue={sp.to ?? ""} style={{ display: "block" }} /></label>
        <button className="btn secondary">Apply filters</button>
      </form>
      {rows.length === 0 ? <Empty><p>No matching activity.</p></Empty> : (
        <div className="scroll">
          <table className="register">
            <thead><tr><th>Time (WAT)</th><th>User</th><th>Action</th><th>Record</th><th>Client</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id}>
                <td className="num small">{fmtWAT(r.occurred_at)}</td>
                <td data-label="User">{r.user_name ?? "System"} <span className="meta">{r.actor_role?.replace(/_/g, " ")}</span></td>
                <td data-label="Action">{r.action.replace(/_/g, " ")}</td>
                <td data-label="Record" className="small">{r.entity_type.replace(/_/g, " ")}{Object.keys(r.details).length > 0 && <span className="meta"> · {Object.entries(r.details).map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`).join(", ")}</span>}</td>
                <td data-label="Client">{r.client_name ?? "—"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </>
  );
}
