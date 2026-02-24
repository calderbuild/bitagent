export type TrustTier = "diamond" | "gold" | "silver" | "bronze" | "unverified";

export interface Agent {
  agentId: number;
  name: string;
  description: string;
  service: string;
  serviceType: "audit" | "translate" | "analyze" | "orchestrate";
  wallet: string;
  btcStake: number;
  reputationScore: number;
  trustScore: number;
  trustBreakdown?: TrustBreakdown;
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
  type: "payment" | "stake" | "slash" | "feedback" | "register";
  agentName: string;
  agentId: number;
  amount: string;
  currency: string;
  clientAddress: string;
  status: "confirmed" | "pending";
  txHash?: string;
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
