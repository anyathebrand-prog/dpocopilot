// DPCO firm plans (pricing page): Starter, Growth and Firm, each with a yearly fee and a team-seat limit.
// Pure rules (no database), shared by sign-up, the subscription page, team invitations and the Secretary.

export type Tier = "starter" | "growth" | "firm";
export const TIERS: Tier[] = ["starter", "growth", "firm"];
export const TIER_LABEL: Record<Tier, string> = { starter: "Starter", growth: "Growth", firm: "Firm" };
/** Team seats per plan (every active member, the Firm Admin included, plus pending invitations); null = unlimited. */
export const TIER_SEATS: Record<Tier, number | null> = { starter: 3, growth: 10, firm: null };
/** Default yearly fees in naira; the Secretary can change them (platform settings dpco_fee_<tier>). */
export const DEFAULT_TIER_FEES: Record<Tier, number> = { starter: 500_000, growth: 1_500_000, firm: 3_000_000 };

export const isTier = (t: unknown): t is Tier => TIERS.includes(t as Tier);

/** The smallest plan that seats a team of `n` people: up to 3 Starter, up to 10 Growth, more than 10 Firm. */
export function tierForTeam(n: number): Tier {
  if (!Number.isFinite(n) || n <= 3) return "starter";
  return n <= 10 ? "growth" : "firm";
}

/** Whether a plan has room for one more seat when `used` seats are taken. */
export const seatFree = (tier: Tier, used: number) => TIER_SEATS[tier] === null || used < TIER_SEATS[tier]!;

export const seatText = (tier: Tier) => (TIER_SEATS[tier] === null ? "Unlimited team seats" : `Up to ${TIER_SEATS[tier]} team seats`);

const rank = (t: Tier) => TIERS.indexOf(t);
export const isUpgrade = (from: Tier, to: Tier) => rank(to) > rank(from);

/**
 * What moving up a plan costs part-way through a paid year: the difference in yearly fees for the days left, in whole naira.
 * The end date stays the same. `daysLeft` counts the days up to and including the end date.
 */
export function upgradeCost(fromFee: number, toFee: number, daysLeft: number) {
  if (toFee <= fromFee || daysLeft <= 0) return 0;
  return Math.ceil(((toFee - fromFee) * Math.min(daysLeft, 365)) / 365);
}
