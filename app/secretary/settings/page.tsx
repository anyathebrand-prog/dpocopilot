import { one } from "@/lib/db";
import { saveDsarDays, saveClientFees } from "@/lib/secretary";
import { q } from "@/lib/db";
import { SIZES, paymentsOn } from "@/lib/checkout";
import { Flash, Field, PageHead } from "@/components/ui";
import { Submit } from "@/components/client";

export default async function PlatformSettings({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const s = await one("select * from platform_settings where key = 'dsar_response_days'");
  const fees = Object.fromEntries((await q("select key, published_value from platform_settings where key like 'client_fee_%'")).map((r) => [r.key, r.published_value]));
  return (
    <>
      <PageHead title="Platform settings" />
      <Flash sp={sp} />
      <form action={saveDsarDays} className="panel" style={{ maxWidth: 640 }}>
        <h3>DSAR response period</h3>
        <p>Published: <b>{s!.published_value} days</b>{s!.draft_value && <> · Draft: <b>{s!.draft_value} days</b> (not yet published)</>}</p>
        <Field label="Days to respond after a request is received" help="Applies to new requests only. Existing requests keep the period they were logged with.">
          <input type="number" name="days" min={1} max={365} defaultValue={s!.draft_value ?? s!.published_value} required />
        </Field>
        <Submit>Save as draft</Submit>
      </form>
      <form action={saveClientFees} className="panel" style={{ maxWidth: 640, marginTop: 16 }}>
        <h3>Client onboarding fees</h3>
        <p className="meta">What a DPCO pays (in naira, through Paystack) when it adds a client. The client&apos;s portal invitation is sent after payment. 0 means no checkout for that size.
          {!paymentsOn() && <> <b>Paystack is not configured (PAYSTACK_SECRET_KEY), so checkout is off.</b></>}</p>
        {SIZES.map(([k, l]) => (
          <Field key={k} label={l}><input name={k} inputMode="decimal" defaultValue={fees[`client_fee_${k}`] ?? "0"} style={{ width: 180 }} /></Field>
        ))}
        <Submit>Save fees</Submit>
      </form>
    </>
  );
}
