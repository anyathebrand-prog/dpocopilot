import { redirect } from "next/navigation";
import { getUser, audit } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { str, flash } from "@/lib/form";
import { Flash, Field } from "@/components/ui";
import { Submit } from "@/components/client";

/** The signed-in Solo DPO's firm, while it has no DPCO yet; anyone else is sent on. */
async function soloWithoutDpco() {
  const u = await getUser();
  if (!u) redirect("/sign-in");
  if (u.kind !== "firm" || u.plan !== "solo" || u.dpco_firm_id) redirect("/app");
  return u;
}

async function choose(fd: FormData) {
  "use server";
  const u = await soloWithoutDpco();
  const id = str(fd, "dpco_firm_id");
  const d = /^[0-9a-f-]{36}$/.test(id) ? await one("select id, name from firms where id = $1 and plan = 'firm' and id <> $2", [id, u.firm_id]) : null;
  if (!d) redirect(flash("/choose-dpco", "Choose a DPCO firm from the list.", "error"));
  await q("update firms set dpco_firm_id = $2 where id = $1 and dpco_firm_id is null", [u.firm_id, d.id]); // set once; the Secretary changes it
  await audit(u, "update", "firm", u.firm_id, { firm_id: u.firm_id, details: { dpco_firm_id: d.id } });
  redirect(flash("/app", `You're working with ${d.name}.`));
}

/** Shown once, after a Solo DPO signs in: pick the one DPCO firm registered on DPO Copilot that they work under. */
export default async function ChooseDpco({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const u = await soloWithoutDpco();
  const sp = await searchParams;
  const firms = await q("select id, name from firms where plan = 'firm' and id <> $1 order by name", [u.firm_id]);
  return (
    <main id="main" className="auth" style={{ maxWidth: 520 }}>
      <h1>Choose your DPCO</h1>
      <p>As a Solo DPO you work under one DPCO firm registered on DPO Copilot. Choose it to continue. You can only choose one; to change it later, contact us.</p>
      <Flash sp={sp} />
      <form action={choose} className="panel">
        <Field label="DPCO firm" required>
          <select name="dpco_firm_id" required defaultValue="">
            <option value="" disabled>Choose a DPCO firm…</option>
            {firms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </Field>
        <Submit>Continue</Submit>
      </form>
    </main>
  );
}
