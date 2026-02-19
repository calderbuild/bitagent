import { ArrowRightLeft } from "lucide-react";
import type { Transaction } from "../types";

interface Props {
  transactions: Transaction[];
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function TransactionFeed({ transactions }: Props) {
  return (
    <div className="panel">
      <div className="panel__header">
        <span className="panel__title">
          <ArrowRightLeft size={15} className="panel__title-icon" />
          Live Transaction Feed
        </span>
        <span className="panel__badge">{transactions.length} txns</span>
      </div>
      <div className="panel__body" style={{ padding: "8px 12px" }}>
        <div className="tx-feed">
          {transactions.map((tx) => (
            <div key={tx.id} className="tx-item">
              <span className="tx-item__time">{formatTime(tx.timestamp)}</span>
              <span className={`tx-item__type tx-item__type--${tx.type}`}>
                {tx.type}
              </span>
              <span className="tx-item__detail">
                {tx.agentName} &middot; {tx.clientAddress}
              </span>
              <span className="tx-item__amount">{tx.amount}</span>
            </div>
          ))}
          {transactions.length === 0 && (
            <div style={{ textAlign: "center", padding: 24, color: "var(--text-dim)", fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>
              Waiting for transactions...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
