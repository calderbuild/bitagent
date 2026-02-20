import { Shield, Code, Languages, BarChart3, Network } from "lucide-react";
import type { Agent, TrustTier } from "../types";

interface Props {
  agent: Agent;
}

const tierColors: Record<TrustTier, string> = {
  diamond: "var(--tier-diamond)",
  gold: "var(--tier-gold)",
  silver: "var(--tier-silver)",
  bronze: "var(--tier-bronze)",
  unverified: "var(--tier-unverified)",
};

const serviceIcons: Record<string, typeof Code> = {
  audit: Code,
  translate: Languages,
  analyze: BarChart3,
  orchestrate: Network,
};

export function AgentCard({ agent }: Props) {
  const color = tierColors[agent.tier];
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
      </div>

      <div className="agent-card__stats">
        <div className="agent-card__stat">
          <span className="agent-card__stat-label">BTC Stake</span>
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
    </div>
  );
}
