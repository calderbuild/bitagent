import { useState, useCallback } from "react";
import { Zap, AlertTriangle } from "lucide-react";
import type { Agent } from "../types";

interface Props {
  agents: Agent[];
  onSlash: (agentId: number, amount: number) => void;
}

interface SlashLogEntry {
  id: string;
  timestamp: number;
  message: string;
  type: "slash" | "info";
}

export function SlashDemo({ agents, onSlash }: Props) {
  const [targetId, setTargetId] = useState(agents[0]?.agentId || 1);
  const [amount, setAmount] = useState("0.000001");
  const [log, setLog] = useState<SlashLogEntry[]>([]);
  const [showFlash, setShowFlash] = useState(false);
  const [slashing, setSlashing] = useState(false);

  const target = agents.find((a) => a.agentId === targetId);

  const handleSlash = useCallback(() => {
    if (!target || slashing) return;
    const slashAmt = parseFloat(amount);
    if (isNaN(slashAmt) || slashAmt <= 0) return;

    setSlashing(true);
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 600);

    const newEntry: SlashLogEntry = {
      id: `slash-${Date.now()}`,
      timestamp: Date.now(),
      message: `SLASHED ${target.name} (Agent #${target.agentId}) -- ${slashAmt.toFixed(4)} BTC -- Reason: "poor service quality"`,
      type: "slash",
    };

    const infoEntry: SlashLogEntry = {
      id: `info-${Date.now()}`,
      timestamp: Date.now(),
      message: `Trust score: ${target.trustScore.toFixed(1)} -> ${Math.max(0, target.trustScore - slashAmt * 4000).toFixed(1)} | Effective stake reduced`,
      type: "info",
    };

    setLog((prev) => [newEntry, infoEntry, ...prev]);
    onSlash(target.agentId, slashAmt);

    setTimeout(() => setSlashing(false), 800);
  }, [target, amount, slashing, onSlash]);

  return (
    <div className="panel">
      <div className="panel__header">
        <span className="panel__title">
          <Zap size={15} className="panel__title-icon" />
          Slash Demo
        </span>
        <span className="panel__badge">interactive</span>
      </div>
      <div className="panel__body">
        <div className="slash-demo">
          <div className="slash-demo__target">
            <AlertTriangle size={20} style={{ color: "var(--red)", flexShrink: 0 }} />
            <div className="slash-demo__target-info">
              <div className="slash-demo__target-name">
                {target?.name || "No agent selected"}
              </div>
              <div className="slash-demo__target-id">
                Agent #{targetId} &middot; Stake: {target?.btcStake.toFixed(6) || "0"} BTC &middot; Trust: {target?.trustScore.toFixed(1) || "0"}
              </div>
            </div>
            <div className="slash-demo__controls">
              <select
                className="select-agent"
                value={targetId}
                onChange={(e) => setTargetId(Number(e.target.value))}
              >
                {agents.map((a) => (
                  <option key={a.agentId} value={a.agentId}>
                    {a.name}
                  </option>
                ))}
              </select>
              <input
                className="slash-demo__amount"
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="BTC amount"
              />
              <button
                className="slash-btn"
                onClick={handleSlash}
                disabled={slashing}
              >
                <Zap size={14} />
                Slash
              </button>
            </div>
          </div>

          <div className="slash-log">
            {log.map((entry) => (
              <div
                key={entry.id}
                className={`slash-log__entry slash-log__entry--${entry.type}`}
              >
                [{new Date(entry.timestamp).toLocaleTimeString("en-US", { hour12: false })}] {entry.message}
              </div>
            ))}
            {log.length === 0 && (
              <div className="slash-log__entry slash-log__entry--info">
                Select an agent and click "Slash" to simulate a slashing event.
              </div>
            )}
          </div>
        </div>
      </div>

      {showFlash && <div className="slash-flash" />}
    </div>
  );
}
