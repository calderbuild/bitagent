import type { Agent, Transaction, NetworkStats } from "../types";

export const MOCK_AGENTS: Agent[] = [
  {
    agentId: 1,
    name: "CodeAuditor",
    description: "AI-powered smart contract security audit",
    service: "/api/audit",
    serviceType: "audit",
    wallet: "0x7a23...f1c8",
    btcStake: 0.005,
    trustScore: 72.5,
    tier: "gold",
    pricePerCall: 0.01,
    online: true,
    requestCount: 47,
    earnings: 0.47,
    slashCount: 0,
  },
  {
    agentId: 2,
    name: "TranslateBot",
    description: "Chinese-English blockchain translation",
    service: "/api/translate",
    serviceType: "translate",
    wallet: "0x3b91...e4a2",
    btcStake: 0.003,
    trustScore: 58.3,
    tier: "silver",
    pricePerCall: 0.005,
    online: true,
    requestCount: 123,
    earnings: 0.615,
    slashCount: 0,
  },
  {
    agentId: 3,
    name: "DataAnalyst",
    description: "DeFi data analysis and insights",
    service: "/api/analyze",
    serviceType: "analyze",
    wallet: "0x9d44...b7e3",
    btcStake: 0.008,
    trustScore: 81.2,
    tier: "diamond",
    pricePerCall: 0.02,
    online: true,
    requestCount: 31,
    earnings: 0.62,
    slashCount: 0,
  },
];

let txCounter = 0;

export function generateTransaction(agents: Agent[]): Transaction {
  txCounter++;
  const types: Transaction["type"][] = ["payment", "payment", "payment", "feedback", "stake"];
  const type = types[Math.floor(Math.random() * types.length)];
  const agent = agents[Math.floor(Math.random() * agents.length)];

  const amounts: Record<Transaction["type"], string> = {
    payment: `${agent.pricePerCall} USDC`,
    stake: `${(Math.random() * 0.005 + 0.001).toFixed(4)} BTC`,
    slash: `${(Math.random() * 0.002 + 0.001).toFixed(4)} BTC`,
    feedback: `${Math.floor(Math.random() * 30 + 70)}/100`,
  };

  return {
    id: `tx-${txCounter}-${Date.now()}`,
    timestamp: Date.now(),
    type,
    agentName: agent.name,
    agentId: agent.agentId,
    amount: amounts[type],
    currency: type === "payment" ? "USDC" : type === "feedback" ? "score" : "BTC",
    clientAddress: `0x${Math.random().toString(16).slice(2, 6)}...${Math.random().toString(16).slice(2, 6)}`,
    status: "confirmed",
  };
}

export const MOCK_NETWORK_STATS: NetworkStats = {
  totalAgents: 3,
  totalBtcStaked: 0.016,
  totalTransactions: 201,
  networkStatus: "live",
  blockHeight: 1847293,
  chainId: 48816,
};
