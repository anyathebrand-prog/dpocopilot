import { DarkHeader } from "@/components/dark-header";
import { HomeFX, SplitHeading } from "@/components/home-motion";
import { Reveal } from "@/components/reveal";
import { TeamSection, TeamContact } from "@/components/team-section";
import "@/components/site-base.css";
import "@/components/homepage.css";
import "@/components/site-pages.css";

export const metadata = {
  title: "About · DPO Copilot",
  description: "DPO Copilot is built by data protection practitioners for data protection practitioners. Meet the team behind the NDPA 2023 compliance workspace for Nigerian DPCOs.",
};

export default function About() {
  return (
    <div className="bh">
      <HomeFX />
      <div className="bh-top"><DarkHeader /></div>
      <section className="hp-card hp-bare hp-grid-bg">
        <div className="hp-inner">
          <div className="hp-head">
            <Reveal><span className="hp-kicker">About</span></Reveal>
            <SplitHeading as="h1" className="hp-h2 big" line1="About" line2="DPO Copilot" />
            <Reveal delay={0.3}><p className="hp-sub">A compliance workspace for Nigerian Data Protection Compliance Organisations: NDPA 2023 and GAID 2025 DPIAs, data subject requests, breach management, CAR readiness, policies and a client portal, in one place.</p></Reveal>
          </div>
        </div>
      </section>
      <div className="tm-page" id="team">
        <TeamSection />
        <TeamContact />
      </div>
    </div>
  );
}
