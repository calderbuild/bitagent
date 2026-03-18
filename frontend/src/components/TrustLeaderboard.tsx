import { Trophy } from "lucide-react";
import type { Agent } from "../types";
import { tierColor } from "../utils/tier";

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
          <span>ETH Stake</span>
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
              <a
                className="leaderboard__agent-wallet"
                href={`https://sepolia.basescan.org/address/${agent.wallet}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {agent.wallet.slice(0, 6)}...{agent.wallet.slice(-4)}
              </a>
            </div>
            <div>
              <div className="stake-bar">
                <div
                  className="stake-bar__fill"
                  style={{ width: `${(agent.btcStake / maxStake) * 100}%` }}
                />
              </div>
              <div className="stake-bar__label">{agent.btcStake.toFixed(6)} ETH</div>
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

