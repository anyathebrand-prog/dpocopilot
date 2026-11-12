import { one } from "@/lib/db";
import { saveDsarDays, saveClientFees, saveAnnualFee } from "@/lib/secretary";
import { q } from "@/lib/db";
import { SIZES, paymentsOn } from "@/lib/checkout";
import { Flash, Field, PageHead } from "@/components/ui";
import { Submit } from "@/components/client";
import { TIERS, TIER_LABEL, DEFAULT_TIER_FEES, seatText } from "@/lib/firm-tiers";

export default async function PlatformSettings({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const s = await one("select * from platform_settings where key = 'dsar_response_days'");
  const plan = Object.fromEntries((await q("select key, published_value from platform_settings where key like 'dpco_fee_%'")).map((r) => [r.key, r.published_value]));
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
      <form action={saveAnnualFee} className="panel" style={{ maxWidth: 640, marginTop: 16 }}>
        <h3>DPCO plans (yearly fees)</h3>
        <p className="meta">What a DPCO firm pays each year (in naira, through Paystack) for its plan. The team size a firm enters picks the plan: up to 3 people Starter, up to 10 Growth, more than 10 Firm. Moving up part-way through a year costs the difference for the days left. Renewal reminders go out 30, 7 and 1 days before the end date, with 7 days&apos; read-only grace before the workspace locks. 0 on every plan means no subscription.</p>
        {TIERS.map((t) => (
          <Field key={t} label={`${TIER_LABEL[t]} (${seatText(t).toLowerCase()})`}><input name={`fee_${t}`} inputMode="decimal" defaultValue={plan[`dpco_fee_${t}`] ?? String(DEFAULT_TIER_FEES[t])} style={{ width: 180 }} /></Field>
        ))}
        <Submit>Save fees</Submit>
      </form>
    </>
  );
}
