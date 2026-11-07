import { redirect } from "next/navigation";
import { getUser, audit } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { str, flash } from "@/lib/form";
import { notifyFirm, REVIEWERS, availableDpcos } from "@/lib/solo";
import { Flash, Field, Banner } from "@/components/ui";
import { Submit } from "@/components/client";

/** The signed-in Solo DPO while not yet approved by a DPCO; anyone else is sent on. */
async function soloNotApproved() {
  const u = await getUser();
  if (!u) redirect("/sign-in");
  if (u.kind !== "firm" || u.plan !== "solo" || u.dpco_status === "approved") redirect("/app");
  return u;
}

async function choose(fd: FormData) {
  "use server";
  const u = await soloNotApproved();
  if (u.dpco_status === "pending") redirect("/choose-dpco");
  const id = str(fd, "dpco_firm_id");
  const d = /^[0-9a-f-]{36}$/.test(id) ? (await availableDpcos(u.firm_id)).find((f) => f.id === id) ?? null : null;
  if (!d) redirect(flash("/choose-dpco", "Choose a DPCO firm from the list.", "error"));
  // One request at a time; a declined Solo DPO may choose again.
  const set = await q("update firms set dpco_firm_id = $2, dpco_status = 'pending' where id = $1 and (dpco_firm_id is null or dpco_status = 'declined') returning 1", [u.firm_id, d.id]);
  if (!set.length) redirect("/choose-dpco");
  await audit(u, "update", "firm", u.firm_id, { firm_id: u.firm_id, details: { dpco_firm_id: d.id, dpco_status: "pending" } });
  await notifyFirm(d.id, "solo_request", `${u.name} (${u.firm_name}), a Solo DPO, has asked to work under ${d.name}. Approve or decline the request.`, "/app/solo-dpos", REVIEWERS);
  redirect("/choose-dpco");
}

/** After a Solo DPO signs in: pick the one DPCO firm registered on DPO Copilot they work under, then wait for its approval. */
export default async function ChooseDpco({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const u = await soloNotApproved();
  const sp = await searchParams;
  if (u.dpco_status === "pending") return (
    <main id="main" className="auth" style={{ maxWidth: 520 }}>
      <h1>Waiting for approval</h1>
      <Banner kind="info">You asked to work under <b>{u.dpco_name}</b>. They have been notified and need to approve you before you can use your workspace. You&apos;ll get an email as soon as they do.</Banner>
    </main>
  );
  const firms = await availableDpcos(u.firm_id);
  return (
    <main id="main" className="auth" style={{ maxWidth: 520 }}>
      <h1>Choose your DPCO</h1>
      {u.dpco_status === "declined" && <Banner kind="warn">{u.dpco_name} declined your request. Choose another DPCO firm.</Banner>}
      <p>As a Solo DPO you work under one DPCO firm registered on DPO Copilot. Choose it to continue; they approve you before you can use your workspace.</p>
      <Flash sp={sp} />
      <form action={choose} className="panel">
        <Field label="DPCO firm" required>
          <select name="dpco_firm_id" required defaultValue="">
            <option value="" disabled>Choose a DPCO firm…</option>
            {firms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </Field>
        <Submit>Send request</Submit>
      </form>
    </main>
  );
}
