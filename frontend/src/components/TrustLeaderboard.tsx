import { Trophy } from "lucide-react";
import type { Agent } from "../types";

interface Props {
  agents: Agent[];
}

export function TrustLeaderboard({ agents }: Props) {
  const sorted = [...agents].sort((a, b) => b.trustScore - a.trustScore);
  const maxStake = Math.max(...sorted.map((a) => a.btcStake), 0.001);

  return (
    <div className="panel">
      <div className="panel__header">
        <span className="panel__title">
          <Trophy size={15} className="panel__title-icon" />
          Trust Leaderboard
        </span>
        <span className="panel__badge">by trust score</span>
      </div>
      <div className="leaderboard">
        <div className="leaderboard__row leaderboard__row--header">
          <span>#</span>
          <span>Agent</span>
          <span>BTC Stake</span>
          <span style={{ textAlign: "center" }}>Trust</span>
          <span style={{ textAlign: "center" }}>Requests</span>
        </div>
        {sorted.map((agent, i) => (
          <div key={agent.agentId} className="leaderboard__row">
            <span className={`leaderboard__rank leaderboard__rank--${i + 1}`}>
              {i + 1}
            </span>
            <div className="leaderboard__agent">
              <span className="leaderboard__agent-name">{agent.name}</span>
              <span className="leaderboard__agent-wallet">{agent.wallet.slice(0, 6)}...{agent.wallet.slice(-4)}</span>
            </div>
            <div>
              <div className="stake-bar">
                <div
                  className="stake-bar__fill"
                  style={{ width: `${(agent.btcStake / maxStake) * 100}%` }}
                />
              </div>
              <div className="stake-bar__label">{agent.btcStake.toFixed(6)} BTC</div>
            </div>
            <span className="leaderboard__score" style={{ color: tierColor(agent.tier) }}>
              {agent.trustScore.toFixed(1)}
            </span>
            <span className="leaderboard__requests">{agent.requestCount}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function tierColor(tier: string): string {
  const map: Record<string, string> = {
    diamond: "var(--tier-diamond)",
    gold: "var(--tier-gold)",
    silver: "var(--tier-silver)",
    bronze: "var(--tier-bronze)",
    unverified: "var(--tier-unverified)",
  };
  return map[tier] || "var(--text-primary)";
}
