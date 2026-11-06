import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser, home, mfaRequired, audit } from "@/lib/auth";
import { one } from "@/lib/db";
import { flash } from "@/lib/form";
import { money } from "@/lib/country";
import { fmtDate } from "@/lib/rules";
import { annualFee, subscriptionOf, startSubscription, confirmSubscription } from "@/lib/subscription";
import { signOut } from "@/lib/auth-actions";
import { leaveDpco } from "@/lib/solo";
import { Flash, Banner } from "@/components/ui";
import { Submit } from "@/components/client";
import "@/components/console.css";
import { INSTALL } from "@/lib/install";

/** Signed-in firm user, without the subscription gate (this page is where the gate sends them). */
async function firmUser() {
  const u = await getUser();
  if (!u) redirect("/sign-in");
  if (u.kind !== "firm") redirect(home(u));
  if (mfaRequired(u)) redirect("/setup/mfa");
  return u;
}

async function pay() {
  "use server";
  const u = await firmUser();
  if (u.plan === "solo" || u.role !== "firm_admin") redirect("/subscription");
  let url: string;
  try { url = await startSubscription(u.firm_id, { id: u.id, email: u.email }); }
  catch (e) { console.error("[paystack]", e); redirect(flash("/subscription", "Payment could not be started. Try again shortly.", "error")); }
  await audit(u, "create", "subscription_payment", u.firm_id);
  redirect(url);
}

/** Solo DPO whose DPCO is no longer available: clear the work tied to it and choose a new DPCO. */
async function chooseNew() {
  "use server";
  const u = await firmUser();
  if (u.plan !== "solo") redirect("/subscription");
  const s = await subscriptionOf(u);
  if (s.state !== "locked" && s.state !== "unpaid") redirect("/subscription");
  const r = await leaveDpco(u.firm_id);
  await audit(u, "update", "firm", u.firm_id, { firm_id: u.firm_id, details: { left_dpco: u.dpco_firm_id, tasks_cleared: r.tasks } });
  redirect("/choose-dpco");
}

/** The DPCO's annual subscription: first payment after sign-up, renewals, and where a lapsed workspace is sent. Paystack returns here with ?reference=…, verified server-side. */
export default async function Subscription({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const u = await firmUser();
  const sp = await searchParams;
  const ref = /^DPOS-[0-9a-f-]{36}$/.test(sp.reference ?? "") ? sp.reference : null;
  const result = ref && (await one("select 1 from firm_subscription_payments where reference = $1 and firm_id = $2", [ref, u.firm_id])) ? await confirmSubscription(ref) : null;
  const s = await subscriptionOf(u), fee = await annualFee();
  const admin = u.role === "firm_admin" && u.plan !== "solo";
  const open = s.state === "active" || s.state === "grace";
  return (
    <div className="cx" style={{ maxWidth: 640, margin: "48px auto", padding: "0 16px" }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- small static PNG */}
      <img src={INSTALL.logo} alt={INSTALL.name} style={{ height: 36, marginBottom: 24 }} />
      <h1 style={{ marginTop: 0 }}>{s.state === "unpaid" ? "Complete your subscription" : "Subscription"}</h1>
      <Flash sp={sp} />
      {result === "paid" && <Banner kind="ok">Payment received. Your subscription runs to <b>{fmtDate(s.ends!)}</b>.</Banner>}
      {result === "failed" && <Banner kind="error">The payment failed. You can try again.</Banner>}
      {result === "pending" && <Banner kind="warn">Paystack hasn&apos;t confirmed the payment yet. Refresh this page in a minute.</Banner>}

      <div className="panel">
        <p style={{ marginTop: 0 }}><b>{u.firm_name}</b>{u.plan === "solo" && u.dpco_name ? <> · with {u.dpco_name}</> : null}</p>
        {s.state === "unpaid" && <p>{u.plan === "solo" ? `${u.dpco_name ?? "Your DPCO"} hasn't started its subscription yet.` : "Your workspace opens once the annual subscription is paid."}</p>}
        {s.state === "active" && s.ends && <p>Active until <b>{fmtDate(s.ends)}</b>. {admin && "Renewing now adds a year to that date."}</p>}
        {s.state === "active" && !s.ends && <p>No subscription is needed.</p>}
        {s.state === "grace" && <p>Ended on <b>{fmtDate(s.ends!)}</b>. The workspace is read-only until <b>{fmtDate(s.graceEnds!)}</b>, then it locks. Clients&apos; portals stay open.</p>}
        {s.state === "locked" && <p>Ended on <b>{fmtDate(s.ends!)}</b>, and the workspace is locked. Nothing has been deleted: renewing unlocks it straight away. Clients&apos; portals stay open.</p>}

        {fee > 0 && (admin ? (
          <form action={pay} style={{ marginTop: 16 }}>
            <p className="meta">Annual subscription: <b>{money(fee)}</b>, paid through Paystack.</p>
            <Submit>{s.state === "unpaid" ? "Pay" : "Renew for"} {money(fee)}</Submit>
          </form>
        ) : !open && (
          u.plan === "solo" ? (
            <form action={chooseNew} style={{ marginTop: 12 }}>
              <p className="meta">Your workspace opens again when {u.dpco_name ?? "your DPCO"} renews. Or choose a new DPCO: your tasks from {u.dpco_name ?? "this DPCO"} are cleared, and your proposals go to the new DPCO for review. Your clients, proposals and wallet stay.</p>
              <Submit className="btn secondary">Choose a new DPCO</Submit>
            </form>
          ) : <p className="meta">Ask your Firm Admin to pay the subscription.</p>
        ))}
      </div>
      <div className="row" style={{ marginTop: 16, gap: 16 }}>
        {open && <Link href="/app">Go to your workspace</Link>}
        <form action={signOut}><button className="btn secondary" type="submit">Sign out</button></form>
      </div>
    </div>
  );
}
