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

/** A Solo DPO's DPCO firm (chosen at first sign-in); the Secretary can change or clear it. */
async function setDpco(fd: FormData) {
  "use server";
  const u = await requireSecretary();
  const f = await one("select id, name from firms where id = $1 and plan = 'solo'", [/^[0-9a-f-]{36}$/.test(str(fd, "firm_id")) ? str(fd, "firm_id") : null]);
  const d = str(fd, "dpco_firm_id") ? await one("select id, name from firms where id = $1 and plan = 'firm'", [/^[0-9a-f-]{36}$/.test(str(fd, "dpco_firm_id")) ? str(fd, "dpco_firm_id") : null]) : null;
  if (!f || (str(fd, "dpco_firm_id") && !d)) redirect("/secretary/firms");
  await q("update firms set dpco_firm_id = $2, dpco_status = $3 where id = $1", [f.id, d?.id ?? null, d ? "approved" : null]); // set by the Secretary: approved
  await audit(u, "update", "firm", f.id, { firm_id: f.id, details: { dpco_firm_id: d?.id ?? null } });
  redirect(flash("/secretary/firms", d ? `${f.name} now works with ${d.name}` : `${f.name} will choose its DPCO at next sign-in`));
}

/** Every firm on the platform and its plan. Solo DPO: one seat, no spreadsheet import. DPCO Firm: everything. */
export default async function Firms({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireSecretary();
  const sp = await searchParams;
  const firms = await q(`select f.id, f.name, f.plan, f.created_at, f.dpco_firm_id,
      (select count(*)::int from memberships m where m.firm_id = f.id and m.status = 'active') as seats,
      (select count(*)::int from clients c where c.firm_id = f.id and c.archived_at is null) as clients
    from firms f order by f.name`);
  return (
    <>
      <PageHead title="Firms and plans" sub="Solo DPO: one seat, no team invitations or spreadsheet import. DPCO Firm: every feature." />
      <Flash sp={sp} />
      <table className="register">
        <thead><tr><th>Firm</th><th className="num">Active seats</th><th className="num">Clients</th><th>Joined</th><th>Plan</th><th>Solo DPO works with</th></tr></thead>
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
            <td data-label="Works with">{f.plan !== "solo" ? <span className="meta">—</span> : (
              <form action={setDpco} className="row">
                <Hidden values={{ firm_id: f.id }} />
                <select name="dpco_firm_id" defaultValue={f.dpco_firm_id ?? ""} aria-label={`DPCO firm for ${f.name}`} style={{ width: "auto" }}>
                  <option value="">Not chosen yet</option>
                  {firms.filter((d) => d.plan === "firm").map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <Submit className="btn secondary">Save</Submit>
              </form>)}</td>
          </tr>
        ))}</tbody>
      </table>
    </>
  );
}
