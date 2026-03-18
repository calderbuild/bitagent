import { Blocks, Coins } from "lucide-react";
import type { NetworkStats } from "../types";

interface Props {
  stats: NetworkStats;
  connected: boolean;
}

export function NetworkStatsBar({ stats, connected }: Props) {
  return (
    <div className="stats-bar">
      <div className="stats-bar__logo">
        <span className="stats-bar__logo-text">BitAgent</span>
        <span className="stats-bar__logo-sub">Base Sepolia</span>
      </div>

      <div className="stat-item">
        <span className={`connection-badge connection-badge--${connected ? "live" : "demo"}`}>
          <span className={`status-dot status-dot--${connected ? "live" : "demo"}`} />
          {connected ? "LIVE" : "DEMO MODE"}
        </span>
      </div>

      <div className="stat-item">
        <span className="stat-item__label">Agents</span>
        <span className="stat-item__value">{stats.totalAgents}</span>
      </div>

      <div className="stat-item">
        <span className="stat-item__label">ETH Staked</span>
        <span className="stat-item__value stat-item__value--btc">
          <Coins size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />
          {stats.totalBtcStaked.toFixed(6)}
        </span>
      </div>

      <div className="stat-item">
        <span className="stat-item__label">Transactions</span>
        <span className="stat-item__value">{stats.totalTransactions}</span>
      </div>

      <div className="stat-item">
        <span className="stat-item__label">Block Height</span>
        <a
          className="stat-item__value stat-item__link"
          href={`https://sepolia.basescan.org/block/${stats.blockHeight}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Blocks size={12} style={{ verticalAlign: "middle", marginRight: 4 }} />
          {stats.blockHeight.toLocaleString()}
        </a>
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
