export type TrustTier = "diamond" | "gold" | "silver" | "bronze" | "unverified";

export interface Agent {
  agentId: number;
  name: string;
  description: string;
  service: string;
  serviceType: "audit" | "translate" | "analyze";
  wallet: string;
  btcStake: number;
  trustScore: number;
  tier: TrustTier;
  pricePerCall: number;
  online: boolean;
  requestCount: number;
  earnings: number;
  slashCount: number;
}

export interface Transaction {
  id: string;
  timestamp: number;
  type: "payment" | "stake" | "slash" | "feedback";
  agentName: string;
  agentId: number;
  amount: string;
  currency: string;
  clientAddress: string;
  status: "confirmed" | "pending";
}

export interface NetworkStats {
  totalAgents: number;
  totalBtcStaked: number;
  totalTransactions: number;
  networkStatus: "live" | "degraded" | "offline";
  blockHeight: number;
  chainId: number;
}

export interface TrustBreakdown {
  stakeScore: number;
  reputationScore: number;
  feedbackScore: number;
  stabilityScore: number;
}
