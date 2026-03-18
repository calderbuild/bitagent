import { Shield, Code, Languages, BarChart3, Network, Zap } from "lucide-react";
import type { Agent } from "../types";
import { tierColor } from "../utils/tier";

interface Props {
  agent: Agent;
  onTry?: (agent: Agent) => void;
}

const serviceIcons: Record<string, typeof Code> = {
  audit: Code,
  translate: Languages,
  analyze: BarChart3,
  orchestrate: Network,
};

export function AgentCard({ agent, onTry }: Props) {
  const color = tierColor(agent.tier);
  const ServiceIcon = serviceIcons[agent.serviceType] || Shield;

  return (
    <div className="agent-card">
      <div className="agent-card__header">
        <div>
          <div className="agent-card__name">
            <ServiceIcon size={14} style={{ marginRight: 6, color, verticalAlign: "middle" }} />
            {agent.name}
          </div>
          <div className="agent-card__service">{agent.description}</div>
          {agent.wallet && (
            <a
              className="agent-card__wallet"
              href={`https://sepolia.basescan.org/address/${agent.wallet}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {agent.wallet.slice(0, 6)}...{agent.wallet.slice(-4)}
            </a>
          )}
        </div>
        <div className={`agent-card__status agent-card__status--${agent.online ? "online" : "offline"}`}>
          <span className={`status-dot status-dot--${agent.online ? "live" : "offline"}`} />
          {agent.online ? "Online" : "Offline"}
        </div>
      </div>

      <div className="trust-gauge">
        <div className="trust-gauge__bar">
          <div
            className="trust-gauge__fill"
            style={{
              width: `${agent.trustScore}%`,
              background: `linear-gradient(90deg, ${color}88, ${color})`,
              color,
            }}
          />
        </div>
        <div className="trust-gauge__labels">
          <span className="trust-gauge__score" style={{ color }}>
            {agent.trustScore.toFixed(1)}
          </span>
          <span className={`tier-badge tier-badge--${agent.tier}`}>
            {agent.tier}
          </span>
        </div>
        <div className="trust-gauge__rep">Rep: {agent.reputationScore.toFixed(0)}/100</div>
        {agent.trustBreakdown && (
          <div className="trust-breakdown">
            <TrustBar label="ETH Stake" value={agent.trustBreakdown.stakeScore} max={40} color="var(--btc-orange)" />
            <TrustBar label="Reputation" value={agent.trustBreakdown.reputationScore} max={30} color="var(--blue)" />
            <TrustBar label="Feedback" value={agent.trustBreakdown.feedbackScore} max={15} color="var(--green)" />
            <TrustBar label="Stability" value={agent.trustBreakdown.stabilityScore} max={15} color="var(--tier-silver)" />
          </div>
        )}
      </div>

      <div className="agent-card__stats">
        <div className="agent-card__stat">
          <span className="agent-card__stat-label">ETH Stake</span>
          <span className="agent-card__stat-value agent-card__stat-value--btc">
            {agent.btcStake.toFixed(6)}
          </span>
        </div>
        <div className="agent-card__stat">
          <span className="agent-card__stat-label">Price</span>
          <span className="agent-card__stat-value">{agent.pricePerCall} USDC</span>
        </div>
        <div className="agent-card__stat">
          <span className="agent-card__stat-label">Requests</span>
          <span className="agent-card__stat-value">{agent.requestCount}</span>
        </div>
        <div className="agent-card__stat">
          <span className="agent-card__stat-label">Earnings</span>
          <span className="agent-card__stat-value">{agent.earnings.toFixed(2)} USDC</span>
        </div>
      </div>

      {onTry && agent.online && (
        <button className="try-btn" onClick={() => onTry(agent)}>
          <Zap size={12} /> Try
        </button>
      )}
    </div>
  );
}

function TrustBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="trust-breakdown__row">
      <span className="trust-breakdown__label">{label}</span>
      <div className="trust-breakdown__bar">
        <div className="trust-breakdown__fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="trust-breakdown__value" style={{ color }}>{value.toFixed(1)}/{max}</span>
    </div>
  );
}
