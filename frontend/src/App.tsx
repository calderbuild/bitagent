import { useState, useEffect, useCallback } from "react";
import { NetworkStatsBar } from "./components/NetworkStatsBar";
import { AgentCard } from "./components/AgentCard";
import { TransactionFeed } from "./components/TransactionFeed";
import { TrustLeaderboard } from "./components/TrustLeaderboard";
import { SlashDemo } from "./components/SlashDemo";
import { MOCK_AGENTS, MOCK_NETWORK_STATS, generateTransaction } from "./data/mock";
import { Users } from "lucide-react";
import type { Agent, Transaction, NetworkStats } from "./types";

function App() {
  const [agents, setAgents] = useState<Agent[]>(MOCK_AGENTS);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<NetworkStats>(MOCK_NETWORK_STATS);

  // Simulate live transactions
  useEffect(() => {
    const interval = setInterval(() => {
      const tx = generateTransaction(agents);
      setTransactions((prev) => [tx, ...prev].slice(0, 100));
      setStats((prev) => ({
        ...prev,
        totalTransactions: prev.totalTransactions + 1,
        blockHeight: prev.blockHeight + (Math.random() > 0.7 ? 1 : 0),
      }));
    }, 2500);
    return () => clearInterval(interval);
  }, [agents]);

  // Handle slash
  const handleSlash = useCallback((agentId: number, amount: number) => {
    setAgents((prev) =>
      prev.map((a) => {
        if (a.agentId !== agentId) return a;
        const newStake = Math.max(0, a.btcStake - amount);
        const stakeRatio = newStake / a.btcStake;
        const newScore = Math.max(0, a.trustScore * stakeRatio * 0.85);
        const newTier = newScore >= 80 ? "diamond" : newScore >= 60 ? "gold" : newScore >= 40 ? "silver" : newScore >= 20 ? "bronze" : "unverified";
        return {
          ...a,
          btcStake: newStake,
          trustScore: Math.round(newScore * 10) / 10,
          tier: newTier,
          slashCount: a.slashCount + 1,
        };
      })
    );

    // Add slash transaction
    const agent = agents.find((a) => a.agentId === agentId);
    if (agent) {
      const slashTx: Transaction = {
        id: `slash-${Date.now()}`,
        timestamp: Date.now(),
        type: "slash",
        agentName: agent.name,
        agentId,
        amount: `${amount.toFixed(4)} BTC`,
        currency: "BTC",
        clientAddress: "SlashOracle",
        status: "confirmed",
      };
      setTransactions((prev) => [slashTx, ...prev].slice(0, 100));
    }

    // Update total staked
    setStats((prev) => ({
      ...prev,
      totalBtcStaked: Math.max(0, prev.totalBtcStaked - amount),
    }));
  }, [agents]);

  return (
    <div className="app">
      <NetworkStatsBar stats={stats} />

      <div className="dashboard-grid">
        {/* Agent Registry */}
        <div className="full-width">
          <div className="panel">
            <div className="panel__header">
              <span className="panel__title">
                <Users size={15} className="panel__title-icon" />
                Agent Registry
              </span>
              <span className="panel__badge">{agents.length} registered</span>
            </div>
            <div className="panel__body">
              <div className="agent-grid">
                {agents.map((agent) => (
                  <AgentCard key={agent.agentId} agent={agent} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Feed */}
        <TransactionFeed transactions={transactions} />

        {/* Trust Leaderboard */}
        <TrustLeaderboard agents={agents} />

        {/* Slash Demo */}
        <div className="full-width">
          <SlashDemo agents={agents} onSlash={handleSlash} />
        </div>
      </div>
    </div>
  );
}

export default App;
