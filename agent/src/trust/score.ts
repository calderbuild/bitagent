export interface TrustInput {
  btcStake: bigint;
  reputationScore: number;
  feedbackCount: number;
  slashHistory: number;
  uptimeDays: number;
}

export interface TrustResult {
  total: number;
  breakdown: {
    stakeScore: number;
    reputationScore: number;
    feedbackScore: number;
    stabilityScore: number;
  };
  tier: "diamond" | "gold" | "silver" | "bronze" | "unverified";
}

/**
 * Calculate agent trust score.
 * BTC stake is weighted highest (40%) -- core differentiator.
 */
export function calculateTrustScore(input: TrustInput): TrustResult {
  // BTC stake (40%): normalized to 0-40, 0.01 BTC = max score
  const stakeNormalized = Math.min(Number(input.btcStake) / 1e16, 100);
  const stakeScore = stakeNormalized * 0.4;

  // Reputation (30%): direct from ERC-8004 summary
  const repScore = Math.min(Math.max(input.reputationScore, 0), 100) * 0.3;

  // Feedback density (15%): 50+ feedbacks = max
  const feedbackScore = Math.min(input.feedbackCount / 50, 1) * 15;

  // Stability (15%): no slash history + uptime
  const noSlashBonus = input.slashHistory === 0 ? 10 : Math.max(0, 10 - input.slashHistory * 3);
  const uptimeBonus = Math.min(input.uptimeDays / 30, 1) * 5;
  const stabilityScore = noSlashBonus + uptimeBonus;

  const total = stakeScore + repScore + feedbackScore + stabilityScore;

  let tier: TrustResult["tier"];
  if (total >= 80) tier = "diamond";
  else if (total >= 60) tier = "gold";
  else if (total >= 40) tier = "silver";
  else if (total >= 20) tier = "bronze";
  else tier = "unverified";

  return {
    total: Math.round(total * 100) / 100,
    breakdown: {
      stakeScore: Math.round(stakeScore * 100) / 100,
      reputationScore: Math.round(repScore * 100) / 100,
      feedbackScore: Math.round(feedbackScore * 100) / 100,
      stabilityScore: Math.round(stabilityScore * 100) / 100,
    },
    tier,
  };
}
