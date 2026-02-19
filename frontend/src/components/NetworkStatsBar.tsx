import { Blocks, Bitcoin } from "lucide-react";
import type { NetworkStats } from "../types";

interface Props {
  stats: NetworkStats;
}

export function NetworkStatsBar({ stats }: Props) {
  return (
    <div className="stats-bar">
      <div className="stats-bar__logo">
        <span className="stats-bar__logo-text">BitAgent</span>
        <span className="stats-bar__logo-sub">GOAT Network</span>
      </div>

      <div className="stat-item">
        <span className="stat-item__label">Agents</span>
        <span className="stat-item__value">{stats.totalAgents}</span>
      </div>

      <div className="stat-item">
        <span className="stat-item__label">BTC Staked</span>
        <span className="stat-item__value stat-item__value--btc">
          <Bitcoin size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />
          {stats.totalBtcStaked.toFixed(3)}
        </span>
      </div>

      <div className="stat-item">
        <span className="stat-item__label">Transactions</span>
        <span className="stat-item__value">{stats.totalTransactions}</span>
      </div>

      <div className="stat-item">
        <span className="stat-item__label">Block Height</span>
        <span className="stat-item__value">
          <Blocks size={12} style={{ verticalAlign: "middle", marginRight: 4 }} />
          {stats.blockHeight.toLocaleString()}
        </span>
      </div>

      <div className="stat-item">
        <span className="stat-item__label">Network</span>
        <span className="stat-item__value stat-item__value--green">
          <span className={`status-dot status-dot--${stats.networkStatus}`} />
          {stats.networkStatus.toUpperCase()}
        </span>
      </div>

      <div className="stat-item">
        <span className="stat-item__label">Chain ID</span>
        <span className="stat-item__value">{stats.chainId}</span>
      </div>
    </div>
  );
}
