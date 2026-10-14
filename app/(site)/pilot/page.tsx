import { redirect } from "next/navigation";
import { q } from "@/lib/db";
import { str, opt, flash } from "@/lib/form";
import { PilotView } from "@/components/pilot-view";
import { DarkHeader } from "@/components/dark-header";
import { HomeFX, SplitHeading } from "@/components/home-motion";
import { Reveal } from "@/components/reveal";
import "@/components/site-base.css";
import "@/components/homepage.css";
import "@/components/site-pages.css";

export const metadata = { title: "Request pilot access · DPO Copilot" };

async function request(fd: FormData) {
  "use server";
  if (str(fd, "website")) redirect(flash("/pilot", "Thank you. We'll be in touch.")); // honeypot: bots fill hidden fields
  const name = str(fd, "name").slice(0, 200), email = str(fd, "email").toLowerCase().slice(0, 200), firm = str(fd, "firm").slice(0, 200);
  if (!name || !firm || !/^\S+@\S+\.\S+$/.test(email)) redirect(flash("/pilot", "Enter your name, work email and firm name.", "error"));
  await q("insert into pilot_requests (name, email, firm, client_count, phone, message) values ($1,$2,$3,$4,$5,$6)",
    [name, email, firm, opt(fd, "client_count"), opt(fd, "phone")?.slice(0, 40) ?? null, opt(fd, "message")?.slice(0, 2000) ?? null]);
  redirect(flash("/pilot", "We've got your details and will be in touch soon to set up your workspace."));
}

export default async function Pilot({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  return (
    <div className="bh">
      <HomeFX />
      <div className="bh-top"><DarkHeader /></div>
      <section className="hp-card hp-bare hp-grid-bg">
        <div className="hp-inner">
          <div className="hp-head">
            <Reveal><span className="hp-kicker">Pilot</span></Reveal>
            <SplitHeading as="h1" className="hp-h2 big" line1="Join" line2="the pilot" />
            <Reveal delay={0.3}><p className="hp-sub">We&apos;re onboarding a small group of DPCO firms and setting each one up personally.</p></Reveal>
          </div>
          <PilotView action={request} ok={sp.ok} error={sp.error} />
        </div>
      </section>
    </div>
  );
}
