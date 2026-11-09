import Link from "next/link";
import {
  ClipboardList, ListTree, FileSearch, FileText, ShieldAlert, UserSearch, FolderCheck, CalendarClock,
  LayoutDashboard, Users, Smartphone, Copy, AlarmClock, MessageSquareWarning, Pencil, UserCheck, Stamp, Signature, ArrowRight,
  UserPlus, Building2, Send, ListChecks, Wallet, PackageCheck, Award,
} from "lucide-react";
import { getUser, home } from "@/lib/auth";
import { VideoHero } from "@/components/video-hero";
import { Reveal } from "@/components/reveal";
import { HomeFX, SplitHeading, Flicker, CountUp } from "@/components/home-motion";
import "@/components/site-base.css";
import "@/components/homepage.css";

export const metadata = { title: "DPO Copilot · NDPA compliance workspace for DPCOs" };

type Icon = typeof ClipboardList;

const PROBLEMS: [Icon, string, string][] = [
  [Copy, "Rebuilt for every client", "The same data map, RoPA, DPIA and policies are recreated from scratch each time, and drift out of sync."],
  [AlarmClock, "Deadlines tracked by hand", "The 72-hour breach window, DSAR deadlines and the annual CAR are followed up across dozens of clients by memory."],
  [MessageSquareWarning, "Generic AI isn't defensible", "Chat tools don't know your client's processing activities or evidence, or Nigerian regulatory specifics."],
];

const MODULES: [Icon, string, string][] = [
  [ClipboardList, "Onboarding and data mapping", "A questionnaire your client fills on their phone builds the data inventory and flags likely major-importance status."],
  [ListTree, "RoPA builder", "Processing activities proposed from the data map, kept current in one living register."],
  [FileSearch, "DPIA workflow", "Seven guided steps with likelihood × impact scoring, review, approval and locked versions."],
  [FileText, "Policies and notices", "Privacy Notice, Data Retention Policy and Consent Form, pre-filled from the client's own data."],
  [ShieldAlert, "Breach management", "A 72-hour countdown from awareness, with draft notices to the NDPC and to affected people."],
  [UserSearch, "Data subject requests", "Every request logged with its 30-day deadline, a drafted response and a record of what was sent."],
  [FolderCheck, "Evidence and CAR readiness", "Request evidence from clients, accept or reject it, and watch a readiness score across five categories."],
  [CalendarClock, "Compliance calendar", "Breach, DSAR, DPIA review, evidence and filing deadlines for every client in one list."],
];

const FLOW: [Icon, string, string][] = [
  [Pencil, "AI draft", "Copilot drafts from the client's data"],
  [UserCheck, "Lead review", "A qualified person edits and checks"],
  [Stamp, "Approved", "Locked as a version, with who and when"],
  [Signature, "Client sign-off", "Signed with a one-time code"],
];

const FIT: [Icon, string, string][] = [
  [LayoutDashboard, "Many clients, one dashboard", "Status, open gaps, overdue work, active breaches and readiness for every client, plus one queue of everything waiting for your review."],
  [Users, "Your team, the right access", "Firm Admins, Lead Consultants and Associates. Associates see only the clients they're assigned to, and only leads can approve."],
  [Smartphone, "A portal for your clients", "Client contacts answer questions, upload evidence, sign documents, report breaches and log requests from their phones."],
];

const SOLO_STEPS: [Icon, string, string][] = [
  [UserPlus, "Sign in", "Create your DPO profile and show your credentials."],
  [Building2, "Pick a DPCO", "Choose the firm you want to work with."],
  [Send, "Send a proposal", "Set out what you'll take on and your fee."],
  [ListChecks, "Get tasks", "Work on assigned client tasks inside the same guided workflows, reviewed and logged."],
];

const SOLO_BENEFITS: [Icon, string, string][] = [
  [Wallet, "Paid directly by the firm", "You agree your terms with the DPCO, and they pay you straight."],
  [PackageCheck, "No tools to buy", "RoPA, DPIA, breach and DSAR workflows are ready the moment you're assigned."],
  [Award, "Build a track record", "Every task you complete is logged, so your work speaks for you."],
];

// Real product figures only.
const STATS: [string, string, string][] = [
  ["72", "h", "Breach notice window (NDPA s.40)"],
  ["30", "days", "Default DSAR response period"],
  ["100", "%", "AI drafts approved by a person"],
  ["5", "", "CAR readiness categories"],
];

const Node = ({ Icon }: { Icon: Icon }) => <span className="hp-node"><Icon aria-hidden /></span>;

function Head({ kicker, line1, line2, sub }: { kicker: string; line1: string; line2: string; sub?: string }) {
  return (
    <div className="hp-head">
      <Reveal><span className="hp-kicker">{kicker}</span></Reveal>
      <SplitHeading className="hp-h2" line1={line1} line2={line2} />
      {sub && <Reveal delay={0.3}><p className="hp-sub">{sub}</p></Reveal>}
    </div>
  );
}

export default async function Home() {
  const u = await getUser();
  return (
    <div className="bh bh-home">
      <HomeFX />
      <VideoHero dashboard={u ? home(u) : undefined} />

      <section className="hp-card hp-bare">
        <div className="hp-inner">
          <Head kicker="The problem" line1="Compliance work shouldn't live" line2="in Word, Excel and WhatsApp" />
          <div className="hp-cols">
            {PROBLEMS.map(([I, t, d], i) => (
              <Reveal key={t} delay={i * 0.08} className="hp-prob-wrap">
                <div className="hp-prob hp-float" data-spot>
                  <div className="hp-prob-top"><Node Icon={I} /><Flicker className="hp-num" delay={0.3 + i * 0.25}>{`0${i + 1}`}</Flicker></div>
                  <h3>{t}</h3><p>{d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="hp-card hp-bare hp-grid-bg" id="product">
        <div className="hp-inner">
          <Head kicker="What's inside" line1="One workflow" line2="for every NDPA obligation" sub="Each obligation is a guided workflow with structured data underneath, so every record feeds the next." />
          <div className="hp-mods">
            {MODULES.map(([I, t, d], i) => (
              <Reveal key={t} delay={(i % 4) * 0.06} className="hp-mod-wrap">
                <div className="hp-mod" data-spot><Node Icon={I} /><h3>{t}</h3><p>{d}</p></div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="hp-card hp-bare">
        <div className="hp-inner">
          <Head kicker="The copilot" line1="Pencil until" line2="it's ink"
            sub="The copilot drafts DPIA sections, policies, breach notices and DSAR responses from the client's structured data. Every draft stays marked until a Lead Consultant approves it, and every step is logged." />
          <Reveal className="hp-flow" delay={0.1}>
            <ol aria-label="How a document is approved">
              {FLOW.map(([I, t, d], i) => (
                <li key={t} className="hp-step" style={{ ["--i" as string]: i }}>
                  <span className="hp-step-node"><I aria-hidden /></span>
                  <b>{t}</b>
                  <span>{d}</span>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </section>

      <section className="hp-card hp-bare">
        <div className="hp-inner">
          <Head kicker="Built for DPCOs" line1="Made for how" line2="DPCOs actually work" />
          <div className="hp-cols">
            {FIT.map(([I, t, d], i) => (
              <Reveal key={t} delay={i * 0.08} className="hp-feature hp-float">
                <Node Icon={I} /><h3>{t}</h3><p>{d}</p>
              </Reveal>
            ))}
          </div>
          <div className="hp-stats">
            {STATS.map(([v, unit, label], i) => (
              <Reveal key={label} delay={i * 0.06} className="hp-stat">
                <span className="hp-stat-v"><CountUp value={Number(v)} duration={1300 + i * 120} /><small>{unit}</small></span>
                <span className="hp-stat-l">{label}</span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="hp-card hp-bare" id="solo-dpos">
        <div className="hp-inner">
          <Head kicker="For independent DPOs" line1="Certified DPO?" line2="Get paid work through DPO Copilot"
            sub="Work on real NDPA engagements with DPCO firms, without building a firm of your own." />
          <Reveal className="hp-flow" delay={0.1}>
            <ol aria-label="How Solo DPOs get work">
              {SOLO_STEPS.map(([I, t, d], i) => (
                <li key={t} className="hp-step" style={{ ["--i" as string]: i }}>
                  <span className="hp-step-node"><I aria-hidden /></span>
                  <b>{t}</b>
                  <span>{d}</span>
                </li>
              ))}
            </ol>
          </Reveal>
          <div className="hp-cols">
            {SOLO_BENEFITS.map(([I, t, d], i) => (
              <Reveal key={t} delay={i * 0.08} className="hp-feature hp-float">
                <Node Icon={I} /><h3>{t}</h3><p>{d}</p>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.2}>
            <div className="hp-actions">
              <Link href="/sign-up?plan=solo" className="btn-cta btn-dark">Join as a Solo DPO</Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="hp-card hp-cta">
        <div className="hp-cta-grid" aria-hidden="true" />
        <div className="hp-inner">
          <Reveal>
            <span className="hp-kicker">Pilot</span>
            <SplitHeading className="hp-h2 big" line1="Join" line2="the pilot" />
            <p className="hp-sub">We&apos;re starting with a small group of DPCO firms. Bring your existing client registers and we&apos;ll help you get your first client to an audit-ready file.</p>
            <div className="hp-actions">
              <Link href="/pilot" className="btn-cta">Get Started</Link>
              <Link href="/pricing" className="hp-ghost">See pricing <ArrowRight aria-hidden /></Link>
              <a href="/downloads/dpo-copilot-brochure.pdf" className="hp-ghost" download>Download brochure <ArrowRight aria-hidden /></a>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
