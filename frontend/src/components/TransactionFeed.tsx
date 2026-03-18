import { useState } from "react";
import { ArrowRightLeft, ExternalLink } from "lucide-react";
import type { Transaction } from "../types";

interface Props {
  transactions: Transaction[];
}

const EXPLORER = "https://sepolia.basescan.org";

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function TransactionFeed({ transactions }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
            <div key={tx.id}>
              <div
                className="tx-item"
                style={{ cursor: "pointer" }}
                onClick={() => setExpandedId(expandedId === tx.id ? null : tx.id)}
              >
                <span className="tx-item__time">{formatTime(tx.timestamp)}</span>
                <span className={`tx-item__type tx-item__type--${tx.type}`}>
                  {tx.type}
                </span>
                <span className="tx-item__detail">
                  {tx.agentName} &middot; {tx.clientAddress}
                </span>
                <span className="tx-item__amount">{tx.amount}</span>
              </div>
              {expandedId === tx.id && (
                <div className="tx-detail">
                  <div className="tx-detail__row">
                    <span className="tx-detail__label">Agent ID</span>
                    <span className="tx-detail__value">#{tx.agentId}</span>
                  </div>
                  <div className="tx-detail__row">
                    <span className="tx-detail__label">Status</span>
                    <span className="tx-detail__value">{tx.status}</span>
                  </div>
                  <div className="tx-detail__row">
                    <span className="tx-detail__label">Currency</span>
                    <span className="tx-detail__value">{tx.currency}</span>
                  </div>
                  <div className="tx-detail__row">
                    <span className="tx-detail__label">Client</span>
                    <a
                      className="tx-detail__link"
                      href={`${EXPLORER}/address/${tx.clientAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {tx.clientAddress.startsWith("0x")
                        ? `${tx.clientAddress.slice(0, 10)}...${tx.clientAddress.slice(-6)}`
                        : tx.clientAddress}
                      <ExternalLink size={10} style={{ marginLeft: 4 }} />
                    </a>
                  </div>
                  {tx.txHash && (
                    <div className="tx-detail__row">
                      <span className="tx-detail__label">Tx Hash</span>
                      <a
                        className="tx-detail__link"
                        href={`${EXPLORER}/tx/${tx.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {tx.txHash.slice(0, 10)}...{tx.txHash.slice(-6)}
                        <ExternalLink size={10} style={{ marginLeft: 4 }} />
                      </a>
                    </div>
                  )}
                </div>
              )}
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
