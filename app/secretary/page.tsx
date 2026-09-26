import Link from "next/link";
import { one } from "@/lib/db";
import { pendingSummary } from "@/lib/secretary";
import { PageHead, Banner } from "@/components/ui";

export default async function SecretaryHome() {
  const c = await one(`select
    (select count(*)::int from reg_documents where status = 'published') as docs,
    (select count(*)::int from mi_criteria where status = 'published') as criteria,
    (select published_value from platform_settings where key = 'dsar_response_days') as days,
    (select count(*)::int from car_template_items where status = 'published') as car`);
  const pending = await pendingSummary();
  const areas: [string, string, string][] = [
    ["/secretary/library", "Regulatory library", `${c!.docs} published source documents`],
    ["/secretary/criteria", "Major-importance criteria", `${c!.criteria} published criteria`],
    ["/secretary/settings", "Platform settings", `DSAR response period: ${c!.days} days`],
    ["/secretary/car-template", "CAR checklist template", `${c!.car} published items in 5 categories`],
  ];
  return (
    <>
      <PageHead title="Content home" sub="Changes here reach every firm once published." />
      {pending.length > 0 && <Banner kind="warn">{pending.length} unpublished change{pending.length > 1 ? "s" : ""}. <Link href="/secretary/publish">Review and publish</Link></Banner>}
      {areas.map(([href, title, sub]) => (
        <div key={href} className="rule-row info"><Link href={href}><b>{title}</b></Link><span className="meta">{sub}</span></div>
      ))}
      <p className="caption" style={{ marginTop: 24 }}>Policy templates are maintained in code for V1.</p>
    </>
  );
}
