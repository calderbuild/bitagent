import { useState, useEffect, useCallback, useRef } from "react";
import { NetworkStatsBar } from "./components/NetworkStatsBar";
import { AgentCard } from "./components/AgentCard";
import { TransactionFeed } from "./components/TransactionFeed";
import { TrustLeaderboard } from "./components/TrustLeaderboard";
import { SlashDemo } from "./components/SlashDemo";
import { MOCK_AGENTS, MOCK_NETWORK_STATS, generateTransaction } from "./data/mock";
import { Users } from "lucide-react";
import type { Agent, Transaction, NetworkStats } from "./types";

const API_BASE = "http://localhost:4022";

function App() {
  const [agents, setAgents] = useState<Agent[]>(MOCK_AGENTS);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<NetworkStats>(MOCK_NETWORK_STATS);
  const [connected, setConnected] = useState(false);
  const simulateRef = useRef(true);

  // Fetch real agent data from facilitator API
  useEffect(() => {
    let active = true;

    async function fetchAgents() {
      try {
        const resp = await fetch(`${API_BASE}/api/agents`);
        if (!resp.ok) return;
        const data = await resp.json();
        if (!active || data.length === 0) return;
        setAgents(data);
        setConnected(true);
        simulateRef.current = false;
      } catch {
        // API unavailable, keep mock data
      }
    }

    fetchAgents();
    const interval = setInterval(fetchAgents, 5000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  // Fetch real network stats
  useEffect(() => {
    let active = true;

    async function fetchStats() {
      try {
        const resp = await fetch(`${API_BASE}/api/stats`);
        if (!resp.ok) return;
        const data = await resp.json();
        if (!active) return;
        setStats(data);
      } catch {
        // keep mock stats
      }
    }

    fetchStats();
    const interval = setInterval(fetchStats, 8000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  // Fetch real events
  useEffect(() => {
    let active = true;

    async function fetchEvents() {
      try {
        const resp = await fetch(`${API_BASE}/api/events`);
        if (!resp.ok) return;
        const data = await resp.json();
        if (!active || data.length === 0) return;
        setTransactions(data);
      } catch {
        // no events yet
      }
    }

    fetchEvents();
    const interval = setInterval(fetchEvents, 3000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  // Simulate live transactions (only when not connected to real API)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!simulateRef.current) return;
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

  // Handle slash -- call real contract via API
  const handleSlash = useCallback(async (agentId: number, amount: number) => {
    const agent = agents.find((a) => a.agentId === agentId);

    if (connected) {
      try {
        const resp = await fetch(`${API_BASE}/api/slash`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId, amount, reason: "poor service quality" }),
        });
        const result = await resp.json();

        if (result.success) {
          // Add real slash event to transaction feed
          const slashTx: Transaction = {
            id: `slash-${Date.now()}`,
            timestamp: Date.now(),
            type: "slash",
            agentName: agent?.name || `Agent #${agentId}`,
            agentId,
            amount: `${amount.toFixed(4)} BTC`,
            currency: "BTC",
            clientAddress: "SlashOracle",
            status: "confirmed",
          };
          setTransactions((prev) => [slashTx, ...prev].slice(0, 100));

          // Refresh agents to get updated stake from chain
          const agentResp = await fetch(`${API_BASE}/api/agents`);
          if (agentResp.ok) {
            setAgents(await agentResp.json());
          }
          return;
        }
      } catch (e) {
        console.error("Slash API error:", e);
      }
    }

    // Fallback: local simulation
    setAgents((prev) =>
      prev.map((a) => {
        if (a.agentId !== agentId) return a;
        const newStake = Math.max(0, a.btcStake - amount);
        const stakeRatio = a.btcStake > 0 ? newStake / a.btcStake : 0;
        const newScore = Math.max(0, a.trustScore * stakeRatio * 0.85);
        const newTier = newScore >= 80 ? "diamond" : newScore >= 60 ? "gold" : newScore >= 40 ? "silver" : newScore >= 20 ? "bronze" : "unverified";
        return { ...a, btcStake: newStake, trustScore: Math.round(newScore * 10) / 10, tier: newTier, slashCount: a.slashCount + 1 };
      })
    );

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
  }, [agents, connected]);

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
              <span className="panel__badge">
                {connected ? `${agents.length} live` : `${agents.length} registered`}
              </span>
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
