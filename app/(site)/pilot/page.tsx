import { redirect } from "next/navigation";
import { q } from "@/lib/db";
import { str, opt, flash } from "@/lib/form";
import { PilotView } from "@/components/pilot-view";
import { DarkHeader } from "@/components/dark-header";
import { HomeFX } from "@/components/home-motion";
import "@/components/home.css";
import "@/components/pricing-dark.css";
import "@/components/pilot-dark.css";

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
    <div className="hm pd">
      <HomeFX />
      <div className="pd-top"><DarkHeader /></div>
      <section className="hm-sec">
        <PilotView action={request} ok={sp.ok} error={sp.error} />
      </section>
    </div>
  );
}
