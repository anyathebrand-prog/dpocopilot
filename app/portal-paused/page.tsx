import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser, home } from "@/lib/auth";
import { one } from "@/lib/db";
import { fmtDate, todayWAT } from "@/lib/rules";
import { subState, GRACE_DAYS } from "@/lib/subscription-math";
import { signOut } from "@/lib/auth-actions";
import { Banner } from "@/components/ui";
import "@/components/console.css";
import { INSTALL } from "@/lib/install";

const addDays = (d: string, n: number) => { const x = new Date(d + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };

/** Where a client contact lands when their organisation's subscription has lapsed (read-only in grace, paused after). */
export default async function PortalPaused() {
  const u = await getUser();
  if (!u) redirect("/sign-in");
  if (u.kind !== "contact") redirect(home(u));
  const c = (await one<{ e: string | null; name: string }>("select subscription_ends::text as e, name from clients where id = $1", [u.client_id]))!;
  const s = c.e ? subState(c.e, todayWAT()) : "active";
  if (s === "active") redirect("/portal");
  return (
    <div className="cx" style={{ maxWidth: 640, margin: "48px auto", padding: "0 16px" }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- small static PNG */}
      <img src={INSTALL.logo} alt={INSTALL.name} style={{ height: 36, marginBottom: 24 }} />
      <h1 style={{ marginTop: 0 }}>{s === "grace" ? "Portal is read-only" : "Portal access is paused"}</h1>
      <Banner kind="warn">
        {c.name}&apos;s DPO Copilot subscription ended on <b>{fmtDate(c.e!)}</b>.{" "}
        {s === "grace" ? <>You can view everything until <b>{fmtDate(addDays(c.e!, GRACE_DAYS))}</b>, but can&apos;t make changes.</> : "Nothing has been deleted."}{" "}
        Ask <b>{u.firm_name}</b> to renew it. If you need to report a data breach now, contact {u.firm_name} directly.
      </Banner>
      <div className="row" style={{ marginTop: 16, gap: 16 }}>
        {s === "grace" && <Link href="/portal">Back to the portal</Link>}
        <form action={signOut}><button className="btn secondary" type="submit">Sign out</button></form>
      </div>
    </div>
  );
}
