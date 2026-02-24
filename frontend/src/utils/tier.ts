import type { TrustTier } from "../types";

const TIER_COLORS: Record<TrustTier, string> = {
  diamond: "var(--tier-diamond)",
  gold: "var(--tier-gold)",
  silver: "var(--tier-silver)",
  bronze: "var(--tier-bronze)",
  unverified: "var(--tier-unverified)",
};

export function tierColor(tier: string): string {
  return TIER_COLORS[tier as TrustTier] || "var(--text-primary)";
}
