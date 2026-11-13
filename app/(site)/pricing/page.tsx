import Link from "next/link";
import { Check, ArrowRight, Mail } from "lucide-react";
import { DarkHeader } from "@/components/dark-header";
import "@/components/site-base.css";
import "@/components/pricing.css";

export const metadata = {
  title: "Pricing · DPO Copilot",
  description: "Yearly pricing in Naira: one platform fee for your DPCO firm, and one client fee for each organisation you manage, based on its size. NDPA compliance with all data kept in Nigeria.",
};

const SIGN_UP = "/sign-up";
const SALES = "mailto:info@dpocopilot.ng";

type Plan = { key: string; name: string; price: string; who: string; cta: string; lead?: string; features: string[]; popular?: boolean };
const PLANS: Plan[] = [
  { key: "starter", name: "Starter", price: "₦500,000", who: "For small DPCOs getting organised.", cta: "Start with Starter",
    features: ["Up to 3 team seats", "Client register with Excel/CSV import", "CAR readiness checklist", "DSAR tracker with 30-day deadline alerts", "Client portal (view, upload evidence, approve)", "AI regulatory Q&A and NDPA library", "Email support"] },
  { key: "growth", name: "Growth", price: "₦1,500,000", who: "For established firms with a growing client book.", cta: "Start with Growth", popular: true, lead: "Everything in Starter, plus:",
    features: ["Up to 10 team seats", "Roles: Firm Admin, Lead Consultant, Associate", "AI drafting for policies, notices and DPIAs", "AI gap analysis for every client", "Third-party (data processor) risk assessments", "E-signature for client sign-off", "Multi-year CAR performance metrics and graphs", "Priority support"] },
  { key: "firm", name: "Firm", price: "₦3,000,000", who: "For large DPCOs with big teams.", cta: "Start with Firm", lead: "Everything in Growth, plus:",
    features: ["Unlimited team seats", "Unlimited AI usage (fair use)", "Solo DPO marketplace (hire and assign tasks)", "Client portal with your firm's branding", "Firm-wide reports across all clients", "Team onboarding session", "Dedicated account contact"] },
];

const SIZES = [
  { name: "Small", price: "₦600,000", subjects: "Up to 500", depts: "1 to 10" },
  { name: "Medium", price: "₦1,000,000", subjects: "501 to 1,000", depts: "11 to 20" },
  { name: "Large", price: "₦2,000,000", subjects: "Over 1,000", depts: "21 and above", note: "A client meeting either condition is classed as Large." },
];

const STEPS: [string, string][] = [
  ["Add the client", "Create the workspace and confirm its size from data subjects and departments."],
  ["Collect the fee", "Your DPCO collects the client fee and pays it to DPO Copilot."],
  ["Workspace goes live", "Once payment is confirmed, the workspace activates for a full year."],
  ["Renew yearly", "Reminders go out 30 days before renewal so there's no break in service."],
];

// [feature, starter, growth, firm]; true = included, false = not included, string = shown as text
const COMPARE: [string, string | boolean, string | boolean, string | boolean][] = [
  ["Team seats", "3", "10", "Unlimited"],
  ["CAR checklist and DSAR tracker", true, true, true],
  ["Client portal", true, true, "Branded"],
  ["AI regulatory Q&A", true, true, true],
  ["AI drafting and gap analysis", false, true, true],
  ["Third-party risk assessments", false, true, true],
  ["Multi-year CAR metrics", false, true, true],
  ["Solo DPO marketplace", false, false, true],
  ["Firm-wide reports", false, false, true],
  ["Support", "Email", "Priority", "Dedicated contact"],
];

const FAQ: [string, string][] = [
  ["Who pays the client fee?", "Your DPCO collects the fee from each client organisation and pays DPO Copilot. The firm plan fee is paid separately by the DPCO."],
  ["How is a client's size decided?", "By its number of data subjects and departments, confirmed by the consultant when the workspace is created. If a client grows into a bigger tier, the difference is billed for the rest of the year."],
  ["Where is our data stored?", "In Nigeria, including AI processing. Each firm has its own private account, and no other firm can see its data."],
  ["What happens if a renewal is missed?", "After a 14-day grace period, the workspace becomes read-only until payment is made. Your records are never deleted."],
  ["Who qualifies for the launch offer?", "The first 15 DPCOs to sign up get DPO Copilot free for their first year."],
];

const Yes = () => <span className="pr-yes"><Check aria-hidden strokeWidth={3} /><span className="sr-only">Included</span></span>;
const No = () => <span className="pr-no" aria-label="Not included">—</span>;
const cell = (v: string | boolean) => (v === true ? <Yes /> : v === false ? <No /> : v);

export default function Pricing() {
  return (
    <div className="bh pr">
      <div className="bh-top"><DarkHeader /></div>

      <section className="pr-hero" aria-labelledby="pr-title">
        <div className="pr-wrap">
          <span className="pr-label">Pricing</span>
          <h1 id="pr-title">Simple pricing for every DPCO and every client</h1>
          <p className="pr-lede">One platform fee for your firm. One client fee for each organisation you manage, based on its size. Built for NDPA compliance, with all data kept in Nigeria.</p>
          <p className="pr-offer"><span className="pr-pill">Launch offer</span><span>The first 15 DPCOs to sign up get DPO Copilot free for their first year.</span></p>
        </div>
      </section>

      <section className="pr-plans" aria-labelledby="pr-plans-h">
        <h2 id="pr-plans-h" className="sr-only">Firm plans</h2>
        <div className="pr-wrap">
          <div className="pr-plan-grid">
            {PLANS.map((p) => (
              <article key={p.key} className={`pr-plan${p.popular ? " pop" : ""}`} aria-labelledby={`plan-${p.key}`}>
                {p.popular && <span className="pr-badge">Most popular</span>}
                <h3 id={`plan-${p.key}`}>{p.name}</h3>
                <p className="pr-price"><b>{p.price}</b><span>/year</span></p>
                <p className="pr-who">{p.who}</p>
                <Link href={`${SIGN_UP}?plan=${p.key}`} className={`pr-btn ${p.popular ? "mint" : "navy"}`}>{p.cta}</Link>
                {p.lead && <p className="pr-lead">{p.lead}</p>}
                <ul className="pr-feats">{p.features.map((f) => <li key={f}><Check aria-hidden strokeWidth={2.5} />{f}</li>)}</ul>
              </article>
            ))}
          </div>
          <div className="pr-enterprise">
            <div><h3>Enterprise</h3><p>For firms managing 150+ clients or needing custom integrations, extra security reviews or bulk data migration.</p></div>
            <a href={SALES} className="pr-btn outline-dark"><Mail aria-hidden />Talk to us</a>
          </div>
        </div>
      </section>

      <section className="pr-section" aria-labelledby="pr-fees-h">
        <div className="pr-wrap">
          <div className="pr-head">
            <span className="pr-label light">Client fees</span>
            <h2 id="pr-fees-h">Each client workspace is priced by size</h2>
            <p>Every organisation you manage gets its own private workspace. The fee depends on how many data subjects and departments it has. Your DPCO collects the fee from the client and pays DPO Copilot.</p>
          </div>
          <div className="pr-size-grid">
            {SIZES.map((s) => (
              <article key={s.name} className="pr-size" aria-labelledby={`size-${s.name}`}>
                <h3 id={`size-${s.name}`}>{s.name}</h3>
                <p className="pr-price"><b>{s.price}</b><span>/year per client</span></p>
                <dl>
                  <div><dt>Data subjects</dt><dd>{s.subjects}</dd></div>
                  <div><dt>Departments</dt><dd>{s.depts}</dd></div>
                </dl>
                {s.note && <p className="pr-note">{s.note}</p>}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="pr-section alt" aria-labelledby="pr-billing-h">
        <div className="pr-wrap">
          <div className="pr-head">
            <span className="pr-label light">Billing</span>
            <h2 id="pr-billing-h">How client billing works</h2>
          </div>
          <ol className="pr-steps">
            {STEPS.map(([t, d], i) => (
              <li key={t}><span className="pr-num" aria-hidden>{i + 1}</span><h3>{t}</h3><p>{d}</p></li>
            ))}
          </ol>
        </div>
      </section>

      <section className="pr-section" aria-labelledby="pr-compare-h">
        <div className="pr-wrap">
          <div className="pr-head">
            <span className="pr-label light">Compare</span>
            <h2 id="pr-compare-h">Compare firm plans</h2>
          </div>
          <div className="pr-table-wrap" role="region" aria-labelledby="pr-compare-h" tabIndex={0}>
            <table className="pr-table">
              <thead><tr><th scope="col">Feature</th><th scope="col">Starter</th><th scope="col" className="pop">Growth</th><th scope="col">Firm</th></tr></thead>
              <tbody>
                {COMPARE.map(([f, a, b, c]) => (
                  <tr key={f}><th scope="row">{f}</th><td>{cell(a)}</td><td className="pop">{cell(b)}</td><td>{cell(c)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="pr-section alt" aria-labelledby="pr-faq-h">
        <div className="pr-wrap narrow">
          <div className="pr-head">
            <span className="pr-label light">FAQ</span>
            <h2 id="pr-faq-h">Questions about pricing</h2>
          </div>
          <div className="pr-faq">
            {FAQ.map(([q, a], i) => (
              <details key={q} open={i === 0}>
                <summary><span>{q}</span><span className="pr-plus" aria-hidden /></summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="pr-section" aria-labelledby="pr-cta-h">
        <div className="pr-wrap">
          <div className="pr-cta">
            <h2 id="pr-cta-h">Run every client&apos;s compliance from one place</h2>
            <p>Join as one of the first 15 DPCOs and use DPO Copilot free for your first year.</p>
            <div className="pr-cta-actions">
              <Link href={SIGN_UP} className="pr-btn mint">Claim your free year <ArrowRight aria-hidden /></Link>
              <a href={SALES} className="pr-btn outline-light"><Mail aria-hidden />Contact sales</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
