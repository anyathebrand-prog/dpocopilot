import { redirect } from "next/navigation";
import { requireClient, audit, canApprove } from "@/lib/auth";
import { one } from "@/lib/db";
import { str, flash } from "@/lib/form";
import { money } from "@/lib/country";
import { fmtDate, todayWAT } from "@/lib/rules";
import { startCheckout, confirmPayment, renewalFee, sizeLabel } from "@/lib/checkout";
import { subState, nextEnd } from "@/lib/subscription-math";
import { Flash, Hidden, Banner } from "@/components/ui";
import { Submit } from "@/components/client";

async function renew(fd: FormData) {
  "use server";
  const { user, client } = await requireClient(str(fd, "client_id"));
  const back = `/app/clients/${client.id}/subscription`;
  if (!canApprove(user) || user.plan === "solo") redirect(flash(back, "Only a Firm Admin or Lead Consultant can renew a client's subscription.", "error"));
  const fee = await renewalFee(client);
  if (!fee) redirect(flash(back, "No renewal fee is set for this client's size. Ask DPO Copilot to renew it.", "error"));
  let url: string;
  try { url = await startCheckout({ ...client, checkout_amount: fee } as any, { id: user.id, email: user.email, name: user.name }, "subscription"); }
  catch (e) { console.error("[paystack]", e); redirect(flash(back, "Payment could not be started. Try again shortly.", "error")); }
  await audit(user, "create", "client_payment", client.id, { client_id: client.id, details: { renewal: true } });
  redirect(url);
}

/** A client's annual subscription: when it ends, and renewal through Paystack (Firm Admin or Lead Consultant). Paystack returns here with ?reference=…. */
export default async function ClientSubscription({ params, searchParams }: { params: Promise<{ clientId: string }>; searchParams: Promise<Record<string, string>> }) {
  const { clientId } = await params;
  const sp = await searchParams;
  const { user, client } = await requireClient(clientId);
  const ref = /^DPOC-[0-9a-f-]{36}$/.test(sp.reference ?? "") ? sp.reference : null;
  const result = ref && (await one("select 1 from client_payments where reference = $1 and client_id = $2", [ref, clientId])) ? await confirmPayment(ref) : null;
  const ends = (await one<{ e: string | null }>("select subscription_ends::text as e from clients where id = $1", [clientId]))?.e ?? null;
  if (!ends) redirect(`/app/clients/${clientId}`);
  const today = todayWAT(), state = subState(ends, today), fee = await renewalFee(client);
  const can = canApprove(user) && user.plan !== "solo";
  return (
    <>
      <h2 style={{ marginTop: 0 }}>Subscription</h2>
      <Flash sp={sp} />
      {result === "paid" && <Banner kind="ok">Payment received. {client.name}&apos;s subscription now runs to <b>{fmtDate(ends)}</b>.</Banner>}
      {result === "failed" && <Banner kind="error">The payment failed. You can try again.</Banner>}
      {result === "pending" && <Banner kind="warn">Paystack hasn&apos;t confirmed the payment yet. Refresh this page in a minute.</Banner>}
      <div className="panel" style={{ maxWidth: 560 }}>
        <table className="register">
          <tbody>
            <tr><td>Client</td><td><b>{client.name}</b></td></tr>
            <tr><td>Size</td><td>{sizeLabel(client.size)}</td></tr>
            <tr><td>{state === "active" ? "Ends on" : "Ended on"}</td><td><b>{fmtDate(ends)}</b>{state === "grace" ? " · portal read-only" : state === "locked" ? " · portal paused" : ""}</td></tr>
            {fee > 0 && <tr><td>Renewal for a year</td><td className="num"><b>{money(fee)}</b> <span className="meta">· runs to {fmtDate(nextEnd(ends, today))}</span></td></tr>}
          </tbody>
        </table>
        {fee > 0 && can ? <form action={renew} style={{ marginTop: 12 }}><Hidden values={{ client_id: clientId }} /><Submit>Renew for {money(fee)} with Paystack</Submit></form>
          : <p className="meta" style={{ marginTop: 12 }}>{!fee ? "No renewal fee is set for this size; DPO Copilot renews it." : "A Firm Admin or Lead Consultant can renew this subscription."}</p>}
      </div>
    </>
  );
}
