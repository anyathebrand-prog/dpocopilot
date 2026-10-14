import { q } from "@/lib/db";
import { INSTALL } from "@/lib/install";
import { SITE_URL } from "@/lib/site-url";

export const dynamic = "force-dynamic";

/** llms.txt (llmstxt.org): a plain summary of the product for AI assistants. */
export async function GET() {
  if (INSTALL.singleFirm) return new Response("Not found", { status: 404 });
  const posts = await q("select slug, title, summary from blog_posts where status = 'published' order by published_at desc");
  const body = `# DPO Copilot

> DPO Copilot is a compliance workspace for Data Protection Compliance Organisations (DPCOs) in Nigeria. It helps DPCOs run their clients' compliance with the Nigeria Data Protection Act (NDPA) 2023 and the General Application and Implementation Directive (GAID) 2025.

Features: client onboarding, data inventory (RoPA), DPIAs, LIAs and transfer risk assessments, Data Subject Access Request tracking (30-day default response period), breach register with the 72-hour NDPC notification clock, Compliance Audit Return (CAR) readiness and audit work plans, policy and framework generation, capacity building plans, proposals, invoicing, and a client portal. Data is hosted in Nigeria.

## Pages
- [Home](${SITE_URL}/): product overview
- [Pricing](${SITE_URL}/pricing): Solo and Firm plans
- [Pilot](${SITE_URL}/pilot): join the pilot
- [Blog](${SITE_URL}/blog): practical notes on NDPA 2023 compliance

## Blog posts
${posts.map((p) => `- [${p.title}](${SITE_URL}/blog/${p.slug})${p.summary ? `: ${p.summary}` : ""}`).join("\n")}
`;
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
