import { one } from "@/lib/db";
import { saveDsarDays } from "@/lib/secretary";
import { Flash, Field, PageHead } from "@/components/ui";
import { Submit } from "@/components/client";

export default async function PlatformSettings({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const s = await one("select * from platform_settings where key = 'dsar_response_days'");
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
    </>
  );
}
