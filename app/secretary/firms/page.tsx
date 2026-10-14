import { redirect } from "next/navigation";
import { requireSecretary, audit, PLAN_LABEL, type Plan } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { str, flash } from "@/lib/form";
import { fmtWAT } from "@/lib/rules";
import { Flash, Hidden, PageHead } from "@/components/ui";
import { Submit } from "@/components/client";

async function setPlan(fd: FormData) {
  "use server";
  const u = await requireSecretary();
  const plan = str(fd, "plan") as Plan;
  const f = await one("select id, name, plan from firms where id = $1", [/^[0-9a-f-]{36}$/.test(str(fd, "firm_id")) ? str(fd, "firm_id") : null]);
  if (!f || !PLAN_LABEL[plan]) redirect("/secretary/firms");
  await q("update firms set plan = $2 where id = $1", [f.id, plan]);
  await audit(u, "update", "firm", f.id, { firm_id: f.id, details: { plan, was: f.plan } });
  redirect(flash("/secretary/firms", `${f.name} is now on the ${PLAN_LABEL[plan]} plan`));
}

/** Every firm on the platform and its plan. Solo DPO: one seat, no spreadsheet import. DPCO Firm: everything. */
export default async function Firms({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireSecretary();
  const sp = await searchParams;
  const firms = await q(`select f.id, f.name, f.plan, f.created_at,
      (select count(*)::int from memberships m where m.firm_id = f.id and m.status = 'active') as seats,
      (select count(*)::int from clients c where c.firm_id = f.id and c.archived_at is null) as clients
    from firms f order by f.name`);
  return (
    <>
      <PageHead title="Firms and plans" sub="Solo DPO: one seat, no team invitations or spreadsheet import. DPCO Firm: every feature." />
      <Flash sp={sp} />
      <table className="register">
        <thead><tr><th>Firm</th><th className="num">Active seats</th><th className="num">Clients</th><th>Joined</th><th>Plan</th></tr></thead>
        <tbody>{firms.map((f) => (
          <tr key={f.id}>
            <td>{f.name}</td>
            <td data-label="Active seats" className="num">{f.seats}</td>
            <td data-label="Clients" className="num">{f.clients}</td>
            <td data-label="Joined" className="small">{fmtWAT(f.created_at)}</td>
            <td data-label="Plan">
              <form action={setPlan} className="row">
                <Hidden values={{ firm_id: f.id }} />
                <select name="plan" defaultValue={f.plan} aria-label={`Plan for ${f.name}`} style={{ width: "auto" }}>{Object.entries(PLAN_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                <Submit className="btn secondary">Save</Submit>
              </form>
              {f.plan === "solo" && f.seats > 1 && <div className="meta">Has {f.seats} seats from before; existing members keep access.</div>}
            </td>
          </tr>
        ))}</tbody>
      </table>
    </>
  );
}
