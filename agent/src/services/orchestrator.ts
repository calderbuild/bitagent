import { ethers } from "ethers";
import { webcrypto } from "node:crypto";
import { privateKeyToAccount } from "viem/accounts";
import { x402Client } from "@x402/core/client";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { wrapFetchWithPayment } from "@x402/fetch";
import { toClientEvmSigner } from "@x402/evm";
import { BitAgent } from "../core/agent.js";
import { chatCompletion } from "../core/llm.js";
import {
  GOAT_CHAIN_ID,
  MOCK_USDC_ADDRESS,
  MOCK_USDC_ABI,
  getWallet,
} from "../core/config.js";

const GOAT_NETWORK_CAIP = `eip155:${GOAT_CHAIN_ID}` as `${string}:${string}`;
const FACILITATOR_BASE = "http://localhost:4022";
const ONE_USDC = 1_000_000n; // 6 decimals

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto,
    configurable: true,
  });
}

type RoutedAgent = "audit" | "translate" | "analyze";

interface RoutingDecision {
  agents: RoutedAgent[];
  payload: Record<string, unknown>;
}

interface ServiceInfo {
  agentId: number;
  name: string;
  price: string;
  service: string;
}

interface ServiceMapItem {
  infoUrl: string;
  endpoint: string;
}

interface SubCallResult {
  agent: RoutedAgent;
  endpoint: string;
  response: unknown;
}

const SERVICE_MAP: Record<RoutedAgent, ServiceMapItem> = {
  audit: {
    infoUrl: "http://localhost:3001/info",
    endpoint: "http://localhost:3001/api/audit",
  },
  translate: {
    infoUrl: "http://localhost:3002/info",
    endpoint: "http://localhost:3002/api/translate",
  },
  analyze: {
    infoUrl: "http://localhost:3003/info",
    endpoint: "http://localhost:3003/api/analyze",
  },
};

const ROUTER_SYSTEM_PROMPT = `You route tasks to specialized AI agents. Output JSON with keys: agents (array of 'audit'|'translate'|'analyze'), payload (object to send to each). Only include agents relevant to the task.`;

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function extractJsonObject(text: string): string {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }
  return text.trim();
}

function normalizeAgent(agent: string): RoutedAgent | null {
  if (agent === "audit" || agent === "translate" || agent === "analyze") return agent;
  return null;
}

function parseRoutingDecision(raw: string): RoutingDecision {
  const parsed = JSON.parse(extractJsonObject(raw)) as {
    agents?: unknown;
    payload?: unknown;
  };

  const agents = Array.isArray(parsed.agents)
    ? parsed.agents
      .map((item) => (typeof item === "string" ? normalizeAgent(item.toLowerCase()) : null))
      .filter((item): item is RoutedAgent => item !== null)
    : [];

  const payload = parsed.payload && typeof parsed.payload === "object"
    ? parsed.payload as Record<string, unknown>
    : {};

  return {
    agents,
    payload,
  };
}

class OrchestratorCaller {
  private wallet: ethers.Wallet;
  private paidFetch: typeof globalThis.fetch;

  constructor(privateKey: string) {
    this.wallet = getWallet(privateKey);
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const signer = toClientEvmSigner(account);
    const evmScheme = new ExactEvmScheme(signer);
    const client = new x402Client().register(GOAT_NETWORK_CAIP, evmScheme);
    this.paidFetch = wrapFetchWithPayment(globalThis.fetch, client);
  }

  get address(): string {
    return this.wallet.address;
  }

  async ensureUsdcAndAllowance(): Promise<void> {
    if (!MOCK_USDC_ADDRESS) {
      throw new Error("MOCK_USDC_ADDRESS is required");
    }

    const usdc = new ethers.Contract(MOCK_USDC_ADDRESS, MOCK_USDC_ABI, this.wallet);
    const balance = await usdc.balanceOf(this.wallet.address) as bigint;
    if (balance < ONE_USDC) {
      const mintTx = await usdc.mint(this.wallet.address, 10_000_000n);
      await mintTx.wait();
    }

    const healthResp = await fetch(`${FACILITATOR_BASE}/health`);
    if (!healthResp.ok) return;
    const health = await healthResp.json() as { facilitator?: string };
    if (!health.facilitator) return;

    const allowance = await usdc.allowance(this.wallet.address, health.facilitator) as bigint;
    if (allowance >= ONE_USDC) return;

    const approveTx = await usdc.approve(health.facilitator, 1_000_000_000n);
    await approveTx.wait();
  }

  async fetchServiceInfo(agent: RoutedAgent): Promise<ServiceInfo> {
    const infoUrl = SERVICE_MAP[agent].infoUrl;
    const resp = await fetch(infoUrl);
    if (!resp.ok) {
      throw new Error(`Failed to fetch service info ${infoUrl}: ${resp.status}`);
    }
    return await resp.json() as ServiceInfo;
  }

  async callAgent(agent: RoutedAgent, payload: Record<string, unknown>, task: string): Promise<SubCallResult> {
    const endpoint = SERVICE_MAP[agent].endpoint;
    const requestBody = this.toServicePayload(agent, payload, task);

    const resp = await this.paidFetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const text = await resp.text();
    if (!resp.ok) {
      throw new Error(`Sub-call ${agent} failed ${resp.status}: ${text}`);
    }

    let parsed: unknown = text;
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      // keep text as-is
    }

    return {
      agent,
      endpoint,
      response: parsed,
    };
  }

  async pushPaymentEvent(info: ServiceInfo, amount: string, txHash?: string): Promise<void> {
    await fetch(`${FACILITATOR_BASE}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "payment",
        agentName: info.name,
        agentId: info.agentId,
        amount,
        currency: "USDC",
        clientAddress: this.wallet.address,
        status: "confirmed",
        txHash,
      }),
    });
  }

  private toServicePayload(
    agent: RoutedAgent,
    payload: Record<string, unknown>,
    task: string,
  ): Record<string, unknown> {
    if (agent === "audit") {
      return {
        code: typeof payload.code === "string"
          ? payload.code
          : `// task: ${task}\npragma solidity ^0.8.24;\ncontract Sample { function ping() external pure returns (uint256) { return 1; } }`,
      };
    }

    if (agent === "translate") {
      const from = typeof payload.from === "string" ? payload.from : "en";
      const to = typeof payload.to === "string" ? payload.to : "zh";
      return {
        text: typeof payload.text === "string" ? payload.text : task,
        from,
        to,
        direction: `${from}-${to}`,
      };
    }

    return {
      data: Array.isArray(payload.data) ? payload.data : [{ task, calls: 1 }],
      question: typeof payload.question === "string" ? payload.question : task,
    };
  }
}

export async function startOrchestrator(): Promise<void> {
  const orchestratorKey = process.env.AGENT_ORCHESTRATOR_KEY || "0x" + "e".repeat(64);
  const caller = new OrchestratorCaller(orchestratorKey);

  const agent = new BitAgent({
    name: "Orchestrator",
    description: "Meta-agent that routes tasks to audit/translate/analyze services",
    privateKey: orchestratorKey,
    port: parseInt(process.env.ORCHESTRATOR_PORT || "3004"),
    stakeAmount: process.env.ORCHESTRATOR_STAKE || "0.00001",
    priceUsdc: 0.03,
    serviceEndpoint: "/api/orchestrate",
    agentId: 4,
  });

  await agent.boot(async (req, res) => {
    const { task } = req.body as { task?: string };
    if (!task || task.trim().length === 0) {
      res.status(400).json({ error: "Missing 'task' in request body" });
      return;
    }

    try {
      await caller.ensureUsdcAndAllowance();

      const plannerOutput = await chatCompletion(
        ROUTER_SYSTEM_PROMPT,
        `Task:\n${task}\n\nReturn strictly valid JSON.`,
        400,
      );
      const decision = parseRoutingDecision(plannerOutput);

      const selected: RoutedAgent[] = decision.agents.length > 0 ? decision.agents : ["analyze"];
      const results: SubCallResult[] = [];

      for (const routedAgent of selected) {
        const info = await caller.fetchServiceInfo(routedAgent);
        const result = await caller.callAgent(routedAgent, decision.payload, task);
        results.push(result);

        await caller.pushPaymentEvent(
          info,
          `${info.price.replace("$", "")} USDC`,
        );
      }

      res.json({
        agentId: agent.id,
        service: "orchestrate",
        task,
        routing: selected,
        payload: decision.payload,
        results,
        timestamp: Date.now(),
      });
    } catch (error) {
      res.status(500).json({
        error: "Orchestration failed",
        detail: toErrorMessage(error),
      });
    }
  });
}

startOrchestrator().catch((error) => {
  console.error("[Orchestrator] Failed to start:", toErrorMessage(error));
  process.exitCode = 1;
});
