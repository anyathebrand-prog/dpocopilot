import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DarkHeader } from "@/components/dark-header";
import { Reveal } from "@/components/reveal";
import { AnimatedHeading, HomeFX } from "@/components/home-motion";
import { Tiers, ReadinessMock, Faq, CheckMark } from "@/components/pricing-dark";
import { PricingScene } from "@/components/pricing-scene";
import "@/components/home.css";
import "@/components/pricing-dark.css";

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

export default function Pricing() {
  return (
    <div className="hm pd">
      <HomeFX />
      <div className="pd-top"><DarkHeader /></div>

      <section className="hm-sec pd-hero">
        <div>
          <Reveal><span className="hm-pill">Pricing</span></Reveal>
          <AnimatedHeading as="h1" className="hm-h2 big pd-h1" text="Simple pricing" />
          <Reveal delay={0.2}><p className="hm-lead">Per-seat pricing for your NDPA compliance practice. We&apos;re agreeing pilot terms with a small group of DPCO firms first.</p></Reveal>
        </div>
        <PricingScene />
      </section>

      <section className="hm-sec" aria-label="Plans">
        <Tiers tiers={TIERS} />
      </section>

      <section className="hm-sec">
        <Reveal className="hm-head">
          <span className="hm-pill">Compare plans</span>
          <AnimatedHeading className="hm-h2" text="Key features" />
        </Reveal>
        <Reveal className="pd-table-wrap">
          <table className="pd-table">
            <thead><tr><th scope="col"><span className="sr-only">Feature</span></th>{TIERS.map((t) => <th key={t.key} scope="col" className={t.key === "firm" ? "main" : undefined}>{t.name}</th>)}</tr></thead>
            <tbody>
              {FEATURES.map(([f, ...on]) => (
                <tr key={f}><th scope="row">{f}</th>{on.map((x, i) => <td key={i} className={i === 1 ? "main" : undefined}>{x ? <CheckMark /> : <span className="pd-dash" aria-label="Not included">–</span>}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </Reveal>
        <p className="pd-foot">DPCO Firm is the V1 plan. The Solo DPO and Enterprise feature split is provisional.</p>
      </section>

      <section className="hm-sec hm-split">
        <Reveal>
          <span className="hm-pill">Add-on</span>
          <AnimatedHeading className="hm-h2" text="CAR preparation package" />
          <p className="hm-lead">Hands-on help getting a client&apos;s Compliance Audit Return file ready, priced per audit. DPO Copilot prepares the evidence and readiness checklist; filing with the NDPC stays with you.</p>
          <ul className="pd-list">{ADDON.map((x) => <li key={x}><CheckMark />{x}</li>)}</ul>
          <Link href="/pilot" className="hm-btn">Ask about the package <ArrowRight aria-hidden /></Link>
        </Reveal>
        <Reveal delay={0.15}><ReadinessMock /></Reveal>
      </section>

      <section className="hm-sec">
        <Reveal className="hm-head">
          <span className="hm-pill">Questions</span>
          <AnimatedHeading className="hm-h2" text="Before you ask" />
        </Reveal>
        <Faq items={FAQ} />
      </section>

      <section className="hm-sec hm-cta">
        <Reveal>
          <AnimatedHeading className="hm-h2 big" text="Join the pilot" />
          <p className="hm-lead">Bring your existing client registers and we&apos;ll help you get your first client to an audit-ready file.</p>
          <div className="hm-actions">
            <Link href="/pilot" className="hm-btn">Get Started <ArrowRight aria-hidden /></Link>
            <Link href="/" className="hm-btn dark">Back to home</Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
