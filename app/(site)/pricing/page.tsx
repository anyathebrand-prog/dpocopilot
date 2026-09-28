import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DarkHeader } from "@/components/dark-header";
import { Reveal } from "@/components/reveal";
import { HomeFX, SplitHeading } from "@/components/home-motion";
import { Tiers, ReadinessMock, Faq, CheckMark } from "@/components/pricing-parts";
import "@/components/site-base.css";
import "@/components/homepage.css";
import "@/components/site-pages.css";

export const metadata = { title: "Pricing · DPO Copilot" };

const TIERS = [
  { key: "solo", name: "Solo DPO", who: "Independent DPOs managing a few clients", price: "Contact us", cta: "Register interest", note: "Coming later" },
  { key: "firm", name: "DPCO Firm", who: "Licensed compliance firms serving many clients", price: "On request", cta: "Request pilot access", note: "Pilot open now" },
  { key: "ent", name: "Enterprise", who: "Large firms and in-house teams at banks, fintechs and hospitals", price: "Contact us", cta: "Register interest", note: "Coming later" },
] as const;

// [feature, solo, firm, enterprise]
const FEATURES: [string, boolean, boolean, boolean][] = [
  ["Multi-client dashboard and review queue", true, true, true],
  ["Onboarding questionnaire and data mapping", true, true, true],
  ["RoPA, DPIA workflow and policy generator", true, true, true],
  ["Breach management with 72-hour countdown", true, true, true],
  ["DSAR tracker with 30-day deadlines", true, true, true],
  ["Evidence vault and CAR readiness score", true, true, true],
  ["Client portal with verified sign-off", true, true, true],
  ["Copilot drafting, gap analysis and cited Q&A", true, true, true],
  ["Team seats with Admin, Lead and Associate roles", false, true, true],
  ["Import from your existing spreadsheets", false, true, true],
  ["Custom onboarding", false, false, true],
  ["Priority support", false, false, true],
];

const FAQ: [string, string][] = [
  ["Is my clients' data used to train AI?", "No. Client data is never used to train AI models."],
  ["Does DPO Copilot file with the NDPC?", "No. It drafts notifications and prepares your CAR file; you review, approve and submit them."],
  ["Can I bring my existing records?", "Yes. Import clients, contacts and RoPA registers from spreadsheets, with every row checked before anything is saved."],
  ["How are AI drafts controlled?", "Every AI draft stays marked as a draft until a Lead Consultant or Firm Admin approves it. Nothing AI-generated reaches a client or an export without that approval, and every generation is logged."],
  ["Can my clients use it too?", "Yes. Each client gets a portal where their contacts answer onboarding questions, upload evidence, sign documents, report breaches and log data subject requests. They only ever see their own organisation."],
  ["Is this legal advice?", "No. DPO Copilot supports professional judgement. Regulatory answers cite their sources and carry a 'guidance, not legal advice' notice."],
];

const ADDON = ["Evidence requests tracked against every checklist item", "Readiness score across all five CAR categories", "Gap check before audit season", "Checklist export to PDF and Word"];

function Head({ kicker, line1, line2, sub, h1 }: { kicker: string; line1: string; line2: string; sub?: string; h1?: boolean }) {
  return (
    <div className="hp-head">
      <Reveal><span className="hp-kicker">{kicker}</span></Reveal>
      <SplitHeading as={h1 ? "h1" : "h2"} className={`hp-h2 ${h1 ? "big" : ""}`} line1={line1} line2={line2} />
      {sub && <Reveal delay={0.3}><p className="hp-sub">{sub}</p></Reveal>}
    </div>
  );
}

export default function Pricing() {
  return (
    <div className="bh">
      <HomeFX />
      <div className="bh-top"><DarkHeader /></div>

      <section className="hp-card hp-bare hp-grid-bg">
        <div className="hp-inner">
          <Head h1 kicker="Pricing" line1="Simple" line2="pricing" sub="Per-seat pricing for your NDPA compliance practice. We're agreeing pilot terms with a small group of DPCO firms first." />
          <Tiers tiers={TIERS} />
        </div>
      </section>

      <section className="hp-card hp-bare">
        <div className="hp-inner">
          <Head kicker="Compare plans" line1="Key" line2="features" />
          <Reveal className="sp-card sp-table-wrap">
            <table className="sp-table">
              <thead><tr><th scope="col"><span className="sr-only">Feature</span></th>{TIERS.map((t) => <th key={t.key} scope="col" className={t.key === "firm" ? "main" : undefined}>{t.name}</th>)}</tr></thead>
              <tbody>
                {FEATURES.map(([f, ...on]) => (
                  <tr key={f}><th scope="row">{f}</th>{on.map((x, i) => <td key={i} className={i === 1 ? "main" : undefined}>{x ? <CheckMark /> : <span className="sp-dash" aria-label="Not included">–</span>}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </Reveal>
          <p className="sp-foot">DPCO Firm is the V1 plan. The Solo DPO and Enterprise feature split is provisional.</p>
        </div>
      </section>

      <section className="hp-card hp-bare">
        <div className="hp-inner sp-split">
          <div className="sp-left">
            <Reveal><span className="hp-kicker">Add-on</span></Reveal>
            <SplitHeading className="hp-h2" line1="CAR preparation" line2="package" />
            <Reveal delay={0.2}>
              <p className="hp-sub">Hands-on help getting a client&apos;s Compliance Audit Return file ready, priced per audit. DPO Copilot prepares the evidence and readiness checklist; filing with the NDPC stays with you.</p>
              <ul className="sp-list">{ADDON.map((x) => <li key={x}><CheckMark />{x}</li>)}</ul>
              <Link href="/pilot" className="btn-cta">Ask about the package <ArrowRight aria-hidden /></Link>
            </Reveal>
          </div>
          <Reveal delay={0.15}><ReadinessMock /></Reveal>
        </div>
      </section>

      <section className="hp-card hp-bare">
        <div className="hp-inner">
          <Head kicker="Questions" line1="Before" line2="you ask" />
          <Faq items={FAQ} />
        </div>
      </section>

      <section className="hp-card hp-cta">
        <div className="hp-cta-grid" aria-hidden="true" />
        <div className="hp-inner">
          <Reveal>
            <span className="hp-kicker">Pilot</span>
            <SplitHeading className="hp-h2 big" line1="Join" line2="the pilot" />
            <p className="hp-sub">Bring your existing client registers and we&apos;ll help you get your first client to an audit-ready file.</p>
            <div className="hp-actions">
              <Link href="/pilot" className="btn-cta">Get Started</Link>
              <Link href="/" className="hp-ghost">Back to home <ArrowRight aria-hidden /></Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
