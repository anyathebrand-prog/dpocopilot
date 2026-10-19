import { redirect } from "next/navigation";
import { requireClient, audit } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { str, flash } from "@/lib/form";
import { money } from "@/lib/country";
import { startCheckout, confirmPayment, sizeLabel } from "@/lib/checkout";
import { Flash, Hidden, Banner } from "@/components/ui";
import { Submit } from "@/components/client";

async function pay(fd: FormData) {
  "use server";
  const { user, client } = await requireClient(str(fd, "client_id"), { write: true, unpaid: true });
  const back = `/app/clients/${client.id}/checkout`;
  if (client.checkout_amount == null) redirect(back);
  let url: string;
  try { url = await startCheckout(client as any, { id: user.id, email: user.email, name: user.name }); }
  catch (e) { console.error("[paystack]", e); redirect(flash(back, "Payment could not be started. Try again shortly.", "error")); }
  await audit(user, "create", "client_payment", client.id, { client_id: client.id });
  redirect(url);
}

/** Checkout for a newly added client. Paystack sends the payer back here with ?reference=…, which is verified with Paystack server-side. */
export default async function Checkout({ params, searchParams }: { params: Promise<{ clientId: string }>; searchParams: Promise<Record<string, string>> }) {
  const { clientId } = await params;
  const sp = await searchParams;
  const { client } = await requireClient(clientId, { unpaid: true });
  const ref = /^DPOC-[0-9a-f-]{36}$/.test(sp.reference ?? "") ? sp.reference : null;
  const result = ref && (await one("select 1 from client_payments where reference = $1 and client_id = $2", [ref, clientId])) ? await confirmPayment(ref) : null;
  const paid = await one("select amount, paid_at from client_payments where client_id = $1 and status = 'paid' order by paid_at desc limit 1", [clientId]);
  const contacts = await q("select name, email from client_contacts where client_id = $1 and status = 'invited'", [clientId]);
  if (client.checkout_amount == null && !paid) redirect(`/app/clients/${clientId}`);
  return (
    <>
      <h2 style={{ marginTop: 0 }}>Checkout</h2>
      <Flash sp={sp} />
      {paid ? (
        <Banner kind="ok">Payment of <b>{money(Number(paid.amount))}</b> received. {contacts.length ? `Portal invitations have been sent to ${contacts.map((c) => c.email).join(", ")}.` : "Add a client contact under Settings to invite them to the portal."}</Banner>
      ) : (
        <>
          {result === "failed" && <Banner kind="error">The payment failed. You can try again.</Banner>}
          {result === "pending" && <Banner kind="warn">Paystack hasn&apos;t confirmed the payment yet. Refresh this page in a minute; the invitation is sent as soon as it&apos;s confirmed.</Banner>}
          <div className="panel" style={{ maxWidth: 560 }}>
            <table className="register">
              <tbody>
                <tr><td>Client</td><td><b>{client.name}</b></td></tr>
                <tr><td>Size</td><td>{sizeLabel(client.size)}</td></tr>
                <tr><td>Client onboarding fee</td><td className="num"><b>{money(Number(client.checkout_amount))}</b></td></tr>
              </tbody>
            </table>
            <p className="meta" style={{ marginTop: 12 }}>
              {contacts.length ? <>The portal invitation to <b>{contacts.map((c) => c.email).join(", ")}</b> is sent once payment is confirmed.</> : "Portal invitations for this client are sent once payment is confirmed."}
            </p>
            <form action={pay}><Hidden values={{ client_id: clientId }} /><Submit>Pay {money(Number(client.checkout_amount))} with Paystack</Submit></form>
          </div>
        </>
      )}
    </>
  );
}
