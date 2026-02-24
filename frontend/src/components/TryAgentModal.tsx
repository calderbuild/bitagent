import { useRef, useEffect, useState, useCallback } from "react";
import { Send, X, Loader2 } from "lucide-react";
import type { Agent } from "../types";

interface Props {
  agent: Agent | null;
  onClose: () => void;
}

type AsyncState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: string; elapsed: number }
  | { status: "error"; error: string };

const DEFAULT_INPUTS: Record<string, string> = {
  audit: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
contract Vault {
  mapping(address => uint256) public balances;
  function withdraw(uint256 amount) external {
    require(balances[msg.sender] >= amount);
    (bool ok, ) = msg.sender.call{value: amount}("");
    require(ok);
    balances[msg.sender] -= amount;
  }
}`,
  translate: "Bitcoin-backed AI agents provide crypto-economic trust from day one.",
  analyze: JSON.stringify([
    { day: "Mon", calls: 42, successRate: 0.97 },
    { day: "Tue", calls: 57, successRate: 0.95 },
    { day: "Wed", calls: 61, successRate: 0.98 },
  ], null, 2),
  orchestrate: "Audit this Solidity withdraw function for reentrancy, then translate the summary to Chinese.",
};

function buildPayload(serviceType: string, input: string): Record<string, unknown> {
  switch (serviceType) {
    case "audit":
      return { code: input };
    case "translate":
      return { text: input, from: "en", to: "zh", direction: "en-zh" };
    case "analyze":
      try { return { data: JSON.parse(input), question: "Provide insights on this data." }; }
      catch { return { data: input, question: "Provide insights on this data." }; }
    case "orchestrate":
      return { task: input };
    default:
      return { input };
  }
}

export function TryAgentModal({ agent, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [input, setInput] = useState("");
  const [state, setState] = useState<AsyncState>({ status: "idle" });

  useEffect(() => {
    if (agent) {
      dialogRef.current?.showModal();
      setInput(DEFAULT_INPUTS[agent.serviceType] || "");
      setState({ status: "idle" });
    } else {
      dialogRef.current?.close();
    }
  }, [agent]);

  const handleCall = useCallback(async () => {
    if (!agent || !input.trim()) return;

    setState({ status: "loading" });
    const start = Date.now();

    try {
      const port = agent.service?.includes("audit") ? 3001
        : agent.service?.includes("translate") ? 3002
        : agent.service?.includes("analyze") ? 3003
        : agent.service?.includes("orchestrate") ? 3004
        : 3001;

      const resp = await fetch(`http://localhost:${port}${agent.service}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(agent.serviceType, input)),
      });

      const text = await resp.text();
      const elapsed = Date.now() - start;

      if (!resp.ok) {
        setState({ status: "error", error: `HTTP ${resp.status}: ${text.slice(0, 200)}` });
        return;
      }

      let display: string;
      try {
        const json = JSON.parse(text);
        display = json.result || json.translation || JSON.stringify(json, null, 2);
      } catch {
        display = text;
      }

      setState({ status: "success", data: display, elapsed });
    } catch (err) {
      setState({ status: "error", error: err instanceof Error ? err.message : String(err) });
    }
  }, [agent, input]);

  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) onClose();
  }, [onClose]);

  if (!agent) return null;

  return (
    <dialog
      ref={dialogRef}
      className="try-modal"
      onClick={handleBackdropClick}
      onClose={onClose}
    >
      <div className="try-modal__content">
        <div className="try-modal__header">
          <div>
            <h3 className="try-modal__title">Try {agent.name}</h3>
            <span className="try-modal__subtitle">{agent.description}</span>
          </div>
          <button className="try-modal__close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="try-modal__body">
          <label className="try-modal__label">Input</label>
          <textarea
            className="try-modal__input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={6}
            maxLength={500}
            placeholder="Enter your request..."
          />
          <div className="try-modal__char-count">{input.length}/500</div>

          <button
            className="try-modal__submit"
            onClick={handleCall}
            disabled={state.status === "loading" || !input.trim()}
          >
            {state.status === "loading" ? (
              <><Loader2 size={14} className="try-modal__spinner" /> Calling...</>
            ) : (
              <><Send size={14} /> Call Agent</>
            )}
          </button>

          {state.status === "success" && (
            <div className="try-modal__result">
              <div className="try-modal__result-header">
                <span>Agent #{agent.agentId} responded</span>
                <span className="try-modal__elapsed">{state.elapsed}ms</span>
              </div>
              <pre className="try-modal__result-body">{state.data}</pre>
            </div>
          )}

          {state.status === "error" && (
            <div className="try-modal__error">{state.error}</div>
          )}
        </div>
      </div>
    </dialog>
  );
}
