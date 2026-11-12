import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser, home, mfaRequired, audit } from "@/lib/auth";
import { one } from "@/lib/db";
import { flash } from "@/lib/form";
import { money } from "@/lib/country";
import { fmtDate } from "@/lib/rules";
import { tierFees, subscriptionOf, startSubscription, confirmSubscription, seatsUsed, firmTier } from "@/lib/subscription";
import { tierForTeam, isUpgrade, upgradeCost, TIER_LABEL, TIER_SEATS } from "@/lib/firm-tiers";
import { q } from "@/lib/db";
import { str } from "@/lib/form";
import { todayWAT } from "@/lib/rules";
import { PlanPicker } from "@/components/plan-picker";
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

const daysLeft = (ends: string, today: string) => Math.round((Date.parse(ends) - Date.parse(today)) / 86_400_000) + 1;

/**
 * Pay for the plan that fits the team size entered: up to 3 Starter, up to 10 Growth, more than 10 Firm. Part-way through a
 * paid year, a bigger plan costs the fee difference for the days left (same end date); otherwise a year at that plan's fee.
 */
async function pay(fd: FormData) {
  "use server";
  const u = await firmUser();
  if (u.plan === "solo" || u.role !== "firm_admin") redirect("/subscription");
  const team = Number(str(fd, "team_size"));
  if (!Number.isInteger(team) || team < 1 || team > 10_000) redirect(flash("/subscription", "Enter how many people in your firm will use DPO Copilot, including you.", "error"));
  const used = await seatsUsed(u.firm_id);
  if (team < used) redirect(flash("/subscription", `You have ${used} seats in use (members and pending invitations). Enter a team size of at least ${used}, or free some seats on the Team page first.`, "error"));
  const tier = tierForTeam(team), current = await firmTier(u.firm_id), fees = await tierFees(), s = await subscriptionOf(u);
  const upgrade = s.state === "active" && !!s.ends && isUpgrade(current, tier);
  const amount = upgrade ? upgradeCost(fees[current], fees[tier], daysLeft(s.ends!, todayWAT())) : fees[tier];
  if (amount <= 0) { // no fee applies (Paystack off, or a free plan): the plan changes straight away
    await q("update firms set tier = $2 where id = $1", [u.firm_id, tier]);
    await audit(u, "update", "firm", u.firm_id, { details: { tier, was: current } });
    redirect(flash("/subscription", `You're on the ${TIER_LABEL[tier]} plan.`));
  }
  let url: string;
  try { url = await startSubscription(u.firm_id, { id: u.id, email: u.email }, { tier, kind: upgrade ? "upgrade" : "year", amount }); }
  catch (e) { console.error("[paystack]", e); redirect(flash("/subscription", "Payment could not be started. Try again shortly.", "error")); }
  await audit(u, "create", "subscription_payment", u.firm_id, { details: { tier, kind: upgrade ? "upgrade" : "year", amount } });
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
  await audit(u, "update", "firm", u.firm_id, { firm_id: u.firm_id, details: { left_dpco: u.dpco_firm_id, tasks_cleared: r.tasks, clients_returned: r.clients } });
  redirect("/choose-dpco");
}

/** The DPCO's annual subscription: first payment after sign-up, renewals, and where a lapsed workspace is sent. Paystack returns here with ?reference=…, verified server-side. */
export default async function Subscription({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const u = await firmUser();
  const sp = await searchParams;
  const ref = /^DPOS-[0-9a-f-]{36}$/.test(sp.reference ?? "") ? sp.reference : null;
  const result = ref && (await one("select 1 from firm_subscription_payments where reference = $1 and firm_id = $2", [ref, u.firm_id])) ? await confirmSubscription(ref) : null;
  const s = await subscriptionOf(u), fees = await tierFees(), fee = Math.max(...Object.values(fees));
  const tier = u.plan === "solo" ? null : await firmTier(u.firm_id), used = u.plan === "solo" ? 0 : await seatsUsed(u.firm_id);
  const active = u.plan === "solo" ? 0 : Number((await q<{ n: number }>("select count(*) as n from memberships where firm_id = $1 and status = 'active'", [u.firm_id]))[0].n);
  const admin = u.role === "firm_admin" && u.plan !== "solo";
  const open = s.state === "active" || s.state === "grace";
  return (
    <div className="cx" style={{ maxWidth: 760, margin: "48px auto", padding: "0 16px" }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- small static PNG */}
      <img src={INSTALL.logo} alt={INSTALL.name} style={{ height: 36, marginBottom: 24 }} />
      <h1 style={{ marginTop: 0 }}>{s.state === "unpaid" ? "Complete your subscription" : "Subscription"}</h1>
      <Flash sp={sp} />
      {result === "paid" && <Banner kind="ok">Payment received. Your subscription runs to <b>{fmtDate(s.ends!)}</b>.</Banner>}
      {result === "failed" && <Banner kind="error">The payment failed. You can try again.</Banner>}
      {result === "pending" && <Banner kind="warn">Paystack hasn&apos;t confirmed the payment yet. Refresh this page in a minute.</Banner>}

      <div className="panel">
        <p style={{ marginTop: 0 }}><b>{u.firm_name}</b>{u.plan === "solo" && u.dpco_name ? <> · with {u.dpco_name}</> : null}
          {tier && <> · <b>{TIER_LABEL[tier]}</b> plan, {TIER_SEATS[tier] === null ? `${used} seats in use (unlimited)` : `${used} of ${TIER_SEATS[tier]} team seats in use`}</>}</p>
        {s.state === "unpaid" && <p>{u.plan === "solo" ? `${u.dpco_name ?? "Your DPCO"} hasn't started its subscription yet.` : "Your workspace opens once the annual subscription is paid."}</p>}
        {s.state === "active" && s.ends && <p>Active until <b>{fmtDate(s.ends)}</b>. {admin && "Renewing now adds a year to that date."}</p>}
        {s.state === "active" && !s.ends && <p>No subscription is needed.</p>}
        {s.state === "grace" && <p>Ended on <b>{fmtDate(s.ends!)}</b>. The workspace is read-only until <b>{fmtDate(s.graceEnds!)}</b>, then it locks. Clients&apos; portals stay open.</p>}
        {s.state === "locked" && <p>Ended on <b>{fmtDate(s.ends!)}</b>, and the workspace is locked. Nothing has been deleted: renewing unlocks it straight away. Clients&apos; portals stay open.</p>}

        {fee > 0 && (admin ? (
          <form action={pay} style={{ marginTop: 16 }}>
            <PlanPicker fees={fees} current={s.state === "unpaid" ? null : tier} initial={Math.max(active, used, 1, s.state === "unpaid" && tier ? TIER_SEATS[tier] ?? 11 : 1)} used={used}
              daysLeft={s.state === "active" && s.ends ? daysLeft(s.ends, todayWAT()) : null} paidUp={s.state === "active" && !!s.ends} />
            <p className="meta" style={{ marginTop: 10 }}>Paid through Paystack. Seats count active members and pending invitations.</p>
          </form>
        ) : !open && (
          u.plan === "solo" ? (
            <form action={chooseNew} style={{ marginTop: 12 }}>
              <p className="meta">Your workspace opens again when {u.dpco_name ?? "your DPCO"} renews. Or choose a new DPCO: your tasks are cleared, clients {u.dpco_name ?? "this DPCO"} added go back to them, and your proposals go to the new DPCO for review. Clients from your own proposals, and your wallet, stay.</p>
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
