"use client";
import { useState } from "react";
import { TIER_LABEL, tierForTeam, seatText, type Tier } from "@/lib/firm-tiers";

/** Sign-up: the firm's team size, with the plan it puts the firm on (up to 3 Starter, up to 10 Growth, more than 10 Firm). */
export function TeamSizeField({ initial, fees }: { initial: number; fees: Record<Tier, number> }) {
  const [team, setTeam] = useState(String(initial));
  const n = Number(team), t = tierForTeam(Number.isInteger(n) && n >= 1 ? n : initial);
  return (
    <label className="sp-field">
      <span>Team size, including you <em className="req" aria-hidden="true">*</em><span className="sr-only">(required)</span></span>
      <input type="number" name="team_size" min={1} max={10000} step={1} required value={team} onChange={(e) => setTeam(e.target.value)} aria-describedby="team-plan" />
      <small id="team-plan" className="sp-hint" aria-live="polite">
        {TIER_LABEL[t]} plan: {seatText(t).toLowerCase()}{fees[t] > 0 ? `, ₦${fees[t].toLocaleString("en-NG")} a year` : ""}. You can move up a plan later.
      </small>
    </label>
  );
}
