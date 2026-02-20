import { ethers } from "ethers";
import { webcrypto } from "node:crypto";
import { privateKeyToAccount } from "viem/accounts";
import { x402Client } from "@x402/core/client";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { wrapFetchWithPayment } from "@x402/fetch";
import { toClientEvmSigner } from "@x402/evm";
import {
  getWallet,
  GOAT_CHAIN_ID,
  MOCK_USDC_ADDRESS,
  MOCK_USDC_ABI,
  REPUTATION_REGISTRY_ADDRESS,
  REPUTATION_REGISTRY_ABI,
} from "../core/config.js";

const GOAT_NETWORK_CAIP = `eip155:${GOAT_CHAIN_ID}` as `${string}:${string}`;
const FACILITATOR_BASE = "http://localhost:4022";
const ONE_USDC = 1_000_000n; // 6 decimals
const FEEDBACK_SCORE = 80n;

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto,
    configurable: true,
  });
}

type ServiceType = "audit" | "translate" | "analyze";

interface AgentInfo {
  agentId: number;
  name: string;
  service: string;
  wallet: string;
  price: string;
}

interface ServiceConfig {
  label: string;
  serviceType: ServiceType;
  infoUrl: string;
  endpoint: string;
  buildBody: () => Record<string, unknown>;
}

interface EventPayload {
  type: "feedback";
  agentName: string;
  agentId: number;
  amount: string;
  currency: string;
  clientAddress: string;
  status: "confirmed" | "pending";
  txHash?: string;
}

const SERVICE_CONFIGS: ServiceConfig[] = [
  {
    label: "CodeAuditor",
    serviceType: "audit",
    infoUrl: "http://localhost:3001/info",
    endpoint: "http://localhost:3001/api/audit",
    buildBody: () => ({
      code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Vault {
    mapping(address => uint256) public balances;

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "insufficient");
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "send failed");
        balances[msg.sender] -= amount;
    }
}`,
    }),
  },
  {
    label: "TranslateBot",
    serviceType: "translate",
    infoUrl: "http://localhost:3002/info",
    endpoint: "http://localhost:3002/api/translate",
    buildBody: () => ({
      text: "Bitcoin-backed AI agents provide crypto-economic trust from day one.",
      from: "en",
      to: "zh",
      direction: "en-zh",
    }),
  },
  {
    label: "DataAnalyst",
    serviceType: "analyze",
    infoUrl: "http://localhost:3003/info",
    endpoint: "http://localhost:3003/api/analyze",
    buildBody: () => ({
      data: [
        { day: "Mon", calls: 42, successRate: 0.97 },
        { day: "Tue", calls: 57, successRate: 0.95 },
        { day: "Wed", calls: 61, successRate: 0.98 },
      ],
      question: "Which day had the best performance and why?",
    }),
  },
];

function formatMs(ms: number): string {
  return `${ms}ms`;
}

function ensureStringError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

async function timedStep<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const startedAt = Date.now();
  console.log(`\n[Client] ▶ ${label}`);
  try {
    const result = await fn();
    console.log(`[Client] ✓ ${label} (${formatMs(Date.now() - startedAt)})`);
    return result;
  } catch (error) {
    console.error(`[Client] ✗ ${label} (${formatMs(Date.now() - startedAt)}): ${ensureStringError(error)}`);
    throw error;
  }
}

class DemoClient {
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

  get address() {
    return this.wallet.address;
  }

  async logBalances(): Promise<void> {
    if (!this.wallet.provider) {
      throw new Error("Wallet provider is not available");
    }
    const btc = await this.wallet.provider.getBalance(this.wallet.address);
    const btcFmt = ethers.formatEther(btc);
    console.log(`[Client] Wallet: ${this.wallet.address}`);
    console.log(`[Client] BTC Balance: ${btcFmt}`);
  }

  async ensureUsdc(minBalance: bigint = ONE_USDC): Promise<void> {
    if (!MOCK_USDC_ADDRESS) {
      throw new Error("MOCK_USDC_ADDRESS is required");
    }

    const usdc = new ethers.Contract(MOCK_USDC_ADDRESS, MOCK_USDC_ABI, this.wallet);
    const balance = await usdc.balanceOf(this.wallet.address) as bigint;
    console.log(`[Client] USDC Balance: ${balance} (${Number(balance) / 1e6} USDC)`);

    if (balance >= minBalance) return;

    const mintAmount = 10_000_000n; // 10 USDC
    console.log(`[Client] Minting ${Number(mintAmount) / 1e6} MockUSDC to self...`);
    const tx = await usdc.mint(this.wallet.address, mintAmount);
    const receipt = await tx.wait();
    console.log(`[Client] Mint tx: ${receipt?.hash || tx.hash}`);
  }

  async ensureFacilitatorAllowance(minAllowance: bigint = ONE_USDC): Promise<void> {
    if (!MOCK_USDC_ADDRESS) {
      throw new Error("MOCK_USDC_ADDRESS is required");
    }

    const healthResp = await fetch(`${FACILITATOR_BASE}/health`);
    if (!healthResp.ok) {
      throw new Error(`Facilitator health check failed: ${healthResp.status}`);
    }
    const health = await healthResp.json() as { facilitator?: string };
    const facilitatorAddress = health.facilitator;

    if (!facilitatorAddress) {
      console.log("[Client] Facilitator address missing in /health response, skipping approve");
      return;
    }

    const usdc = new ethers.Contract(MOCK_USDC_ADDRESS, MOCK_USDC_ABI, this.wallet);
    const allowance = await usdc.allowance(this.wallet.address, facilitatorAddress) as bigint;
    console.log(`[Client] Allowance to facilitator ${facilitatorAddress}: ${allowance}`);

    if (allowance >= minAllowance) return;

    const approveAmount = 1_000_000_000n; // 1000 USDC
    const tx = await usdc.approve(facilitatorAddress, approveAmount);
    const receipt = await tx.wait();
    console.log(`[Client] Approve tx: ${receipt?.hash || tx.hash}`);
  }

  async fetchAgentInfo(url: string): Promise<AgentInfo> {
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(`Failed to read ${url}: ${resp.status}`);
    }
    const data = await resp.json() as AgentInfo;
    return data;
  }

  async callPaidService(endpoint: string, payload: Record<string, unknown>): Promise<unknown> {
    const resp = await this.paidFetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const responseText = await resp.text();
    if (!resp.ok) {
      throw new Error(`Service returned ${resp.status}: ${responseText}`);
    }

    try {
      return JSON.parse(responseText) as unknown;
    } catch {
      return responseText;
    }
  }

  async submitFeedback(
    agentId: number,
    serviceType: ServiceType,
    endpoint: string,
  ): Promise<string> {
    if (!REPUTATION_REGISTRY_ADDRESS) {
      throw new Error("REPUTATION_REGISTRY_ADDRESS is required");
    }

    const rep = new ethers.Contract(
      REPUTATION_REGISTRY_ADDRESS,
      REPUTATION_REGISTRY_ABI,
      this.wallet,
    );

    const tx = await rep.giveFeedback(
      agentId,
      FEEDBACK_SCORE,
      0,
      serviceType,
      "quality",
      endpoint,
      "",
      ethers.ZeroHash,
    );
    const receipt = await tx.wait();
    return receipt?.hash || tx.hash;
  }

  async pushFeedbackEvent(event: EventPayload): Promise<void> {
    const resp = await fetch(`${FACILITATOR_BASE}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
    if (!resp.ok) {
      const message = await resp.text();
      throw new Error(`Failed to push feedback event: ${resp.status} ${message}`);
    }
  }
}

export async function runDemoClient(): Promise<void> {
  const clientKey = process.env.CLIENT_KEY;
  if (!clientKey) {
    throw new Error("CLIENT_KEY environment variable is required");
  }

  console.log("=== BitAgent x402 Client Demo ===");
  const client = new DemoClient(clientKey);

  await timedStep("Load wallet and BTC balance", async () => {
    await client.logBalances();
  });

  await timedStep("Ensure MockUSDC balance (>= 1 USDC)", async () => {
    await client.ensureUsdc(ONE_USDC);
  });

  await timedStep("Ensure MockUSDC allowance for facilitator", async () => {
    await client.ensureFacilitatorAllowance(ONE_USDC);
  });

  for (const service of SERVICE_CONFIGS) {
    const payload = service.buildBody();

    const agentInfo = await timedStep(`Fetch ${service.label} info`, async () => {
      return client.fetchAgentInfo(service.infoUrl);
    });

    await timedStep(`Pay and call ${service.label} via x402`, async () => {
      const result = await client.callPaidService(service.endpoint, payload);
      const preview = typeof result === "string"
        ? result
        : JSON.stringify(result);
      console.log(`[Client] ${service.label} response preview: ${preview.slice(0, 220)}`);
    });

    const feedbackTxHash = await timedStep(`Submit on-chain feedback for ${service.label}`, async () => {
      return client.submitFeedback(agentInfo.agentId, service.serviceType, service.endpoint);
    });
    console.log(`[Client] Feedback tx hash: ${feedbackTxHash}`);

    await timedStep(`Push feedback event for ${service.label} to facilitator`, async () => {
      await client.pushFeedbackEvent({
        type: "feedback",
        agentName: agentInfo.name,
        agentId: agentInfo.agentId,
        amount: `${FEEDBACK_SCORE.toString()}/100`,
        currency: "score",
        clientAddress: client.address,
        status: "confirmed",
        txHash: feedbackTxHash,
      });
    });
  }

  console.log("\n=== Demo complete: all 3 paid calls + on-chain feedback submitted ===");
}

runDemoClient().catch((error) => {
  console.error("[Client] Demo failed:", ensureStringError(error));
  process.exitCode = 1;
});
