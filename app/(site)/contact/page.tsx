import { redirect } from "next/navigation";
import { q } from "@/lib/db";
import { send } from "@/lib/auth";
import { str, opt, flash } from "@/lib/form";
import { ContactView } from "@/components/contact-view";
import { TOPICS } from "@/lib/contact-topics";
import { DarkHeader } from "@/components/dark-header";
import { HomeFX, SplitHeading } from "@/components/home-motion";
import { Reveal } from "@/components/reveal";
import "@/components/site-base.css";
import "@/components/homepage.css";
import "@/components/site-pages.css";

export const metadata = {
  title: "Contact · DPO Copilot",
  description: "Contact the DPO Copilot team about plans and pricing, your account, partnerships or privacy. Email info@dpocopilot.ng or send us a message.",
};

const INBOX = "info@dpocopilot.ng";

async function sendMessage(fd: FormData) {
  "use server";
  if (str(fd, "website")) redirect(flash("/contact", "Thank you. We'll reply soon.")); // honeypot: bots fill hidden fields
  const name = str(fd, "name").slice(0, 200), email = str(fd, "email").toLowerCase().slice(0, 200), message = str(fd, "message").slice(0, 4000);
  const topic = TOPICS.some(([k]) => k === str(fd, "topic")) ? str(fd, "topic") : "other";
  if (!name || !message || !/^\S+@\S+\.\S+$/.test(email)) redirect(flash("/contact", "Enter your name, a valid email and your message.", "error"));
  const org = opt(fd, "organisation")?.slice(0, 200) ?? null, phone = opt(fd, "phone")?.slice(0, 40) ?? null;
  await q("insert into contact_messages (topic, name, email, organisation, phone, message) values ($1,$2,$3,$4,$5,$6)", [topic, name, email, org, phone, message]);
  const label = TOPICS.find(([k]) => k === topic)![1];
  await send("email", INBOX, "contact_message", `Website message (${label}) from ${name}`, {
    body: `Topic: ${label}\nFrom: ${name} <${email}>${org ? `\nOrganisation: ${org}` : ""}${phone ? `\nPhone: ${phone}` : ""}\n\n${message}`,
  });
  redirect(flash("/contact", "We've got your message and will reply by email within one working day."));
}

export default async function Contact({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  return (
    <div className="bh">
      <HomeFX />
      <div className="bh-top"><DarkHeader /></div>
      <section className="hp-card hp-bare hp-grid-bg">
        <div className="hp-inner">
          <div className="hp-head">
            <Reveal><span className="hp-kicker">Contact</span></Reveal>
            <SplitHeading as="h1" className="hp-h2 big" line1="Talk to" line2="our team" />
            <Reveal delay={0.3}><p className="hp-sub">Questions about plans, your account or how DPO Copilot fits your practice? Send us a message and a person will reply.</p></Reveal>
          </div>
          <ContactView action={sendMessage} ok={sp.ok} error={sp.error} />
        </div>
      </section>
    </div>
  );
}
