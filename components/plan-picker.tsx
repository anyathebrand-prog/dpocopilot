"use client";
import { useState } from "react";
import { Submit } from "@/components/client";
import { TIERS, TIER_LABEL, tierForTeam, seatText, isUpgrade, upgradeCost, type Tier } from "@/lib/firm-tiers";

const naira = (n: number) => `₦${n.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;

/**
 * The DPCO's team size picks its plan: up to 3 Starter, up to 10 Growth, more than 10 Firm. Shows the three plans with the
 * matching one highlighted, and the amount to pay: a year, or the difference for the rest of a paid year when moving up.
 * The server works the amount out again from the same rules (app/subscription/page.tsx); this is only the preview.
 */
export function PlanPicker(p: { fees: Record<Tier, number>; current: Tier | null; initial: number; used: number; daysLeft: number | null; paidUp: boolean }) {
  const [team, setTeam] = useState(String(p.initial));
  const n = Number(team), valid = Number.isInteger(n) && n >= 1;
  const tier = tierForTeam(valid ? n : p.initial);
  const upgrade = p.paidUp && p.current !== null && isUpgrade(p.current, tier) && p.daysLeft !== null;
  const amount = upgrade ? upgradeCost(p.fees[p.current!], p.fees[tier], p.daysLeft!) : p.fees[tier];
  const tooSmall = valid && n < p.used;
  const same = p.paidUp && p.current === tier;
  const label = upgrade ? `Move up to ${TIER_LABEL[tier]} for ${naira(amount)}` : `${p.paidUp ? "Renew" : "Pay"} ${TIER_LABEL[tier]} for ${naira(amount)}`;
  return (
    <div className="pp">
      <label className="pp-team">
        <span>How many people in your firm will use DPO Copilot, including you?</span>
        <input type="number" name="team_size" min={1} max={10000} step={1} required value={team} onChange={(e) => setTeam(e.target.value)} aria-describedby="pp-note" />
      </label>
      <ul className="pp-plans" aria-label="Plans">
        {TIERS.map((t) => (
          <li key={t} className={t === tier ? "on" : undefined} aria-current={t === tier ? "true" : undefined}>
            <b>{TIER_LABEL[t]}</b>
            <span className="pp-price">{naira(p.fees[t])}<small>/year</small></span>
            <span className="pp-seats">{seatText(t)}</span>
            {t === p.current && <span className="pp-cur">Current plan</span>}
          </li>
        ))}
      </ul>
      <p id="pp-note" className="meta" aria-live="polite">
        {tooSmall ? <>You have <b>{p.used}</b> seats in use (members and pending invitations). Enter at least {p.used}, or free some seats on the Team page first.</>
          : upgrade ? <>A team of {n} needs the <b>{TIER_LABEL[tier]}</b> plan. You pay the difference for the {p.daysLeft} days left of your current year; your end date stays the same.</>
          : same ? <>A team of {n} fits your <b>{TIER_LABEL[tier]}</b> plan. Renewing adds a year.</>
          : p.paidUp && p.current && !isUpgrade(p.current, tier) ? <>A team of {n} fits the <b>{TIER_LABEL[tier]}</b> plan. Renewing on it adds a year and changes your seat limit as soon as it is paid.</>
          : <>A team of {n || "…"} needs the <b>{TIER_LABEL[tier]}</b> plan: {seatText(tier).toLowerCase()}, {naira(p.fees[tier])} a year.</>}
      </p>
      <Submit disabled={!valid || tooSmall || amount <= 0}>{label}</Submit>
    </div>
  );
}
