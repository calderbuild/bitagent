import { ethers } from "ethers";
import { privateKeyToAccount } from "viem/accounts";
import { x402Client } from "@x402/core/client";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { wrapFetchWithPayment } from "@x402/fetch";
import { toClientEvmSigner } from "@x402/evm";
import {
  getProvider,
  getWallet,
  STAKING_VAULT_ADDRESS,
  STAKING_VAULT_ABI,
  MOCK_USDC_ADDRESS,
  MOCK_USDC_ABI,
  REPUTATION_REGISTRY_ADDRESS,
  REPUTATION_REGISTRY_ABI,
  GOAT_CHAIN_ID,
  GOAT_NETWORK,
} from "../core/config.js";
import { calculateTrustScore, TrustInput } from "../trust/score.js";

const GOAT_NETWORK_CAIP = `eip155:${GOAT_CHAIN_ID}` as `${string}:${string}`;

interface AgentInfo {
  agentId: number;
  name: string;
  description: string;
  wallet: string;
  service: string;
  price: string;
  network: string;
  stakeAmount: string;
  endpoint: string;
  trustScore?: number;
  tier?: string;
}

// Known agent endpoints (in production, discovered via ERC-8004)
const AGENT_ENDPOINTS = [
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:3003",
];

/**
 * Client Agent: discovers agents, evaluates trust, pays for services via x402.
 */
export class ClientAgent {
  private wallet: ethers.Wallet;
  private paidFetch: typeof globalThis.fetch;

  constructor(privateKey: string) {
    this.wallet = getWallet(privateKey);

    // Set up x402 client with EVM signer for automatic payment handling
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const signer = toClientEvmSigner(account);
    const evmScheme = new ExactEvmScheme(signer);

    const client = new x402Client()
      .register(GOAT_NETWORK_CAIP, evmScheme);

    this.paidFetch = wrapFetchWithPayment(globalThis.fetch, client);
  }

  /**
   * Discover all available agents and their trust scores.
   */
  async discoverAgents(): Promise<AgentInfo[]> {
    const agents: AgentInfo[] = [];

    for (const endpoint of AGENT_ENDPOINTS) {
      try {
        const resp = await fetch(`${endpoint}/info`);
        if (!resp.ok) continue;
        const info = await resp.json() as any;
        info.endpoint = endpoint;

        // Query on-chain stake
        let btcStake = 0n;
        if (STAKING_VAULT_ADDRESS) {
          const vault = new ethers.Contract(
            STAKING_VAULT_ADDRESS, STAKING_VAULT_ABI, getProvider()
          );
          try {
            btcStake = await vault.effectiveStake(info.agentId);
          } catch { /* not staked */ }
        }

        // Calculate trust score
        const trustInput: TrustInput = {
          btcStake,
          reputationScore: 50, // default for new agents
          feedbackCount: 0,
          slashHistory: 0,
          uptimeDays: 1,
        };

        const trust = calculateTrustScore(trustInput);
        info.trustScore = trust.total;
        info.tier = trust.tier;

        agents.push(info);
      } catch {
        // Agent not reachable
      }
    }

    // Sort by trust score (highest first)
    agents.sort((a, b) => (b.trustScore || 0) - (a.trustScore || 0));
    return agents;
  }

  /**
   * Call an agent's service with x402 automatic payment.
   * The paidFetch wrapper handles 402 -> sign -> retry automatically.
   */
  async callService(agent: AgentInfo, body: Record<string, any>): Promise<any> {
    const url = `${agent.endpoint}${agent.service}`;
    console.log(`[Client] Calling ${agent.name} at ${url} via x402...`);

    const resp = await this.paidFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      throw new Error(`Service returned ${resp.status}: ${await resp.text()}`);
    }

    return resp.json();
  }

  /**
   * Ensure client has Mock USDC balance for payments.
   */
  async ensureUSDCBalance(minAmount: bigint = 1000000n): Promise<void> {
    if (!MOCK_USDC_ADDRESS) {
      console.log("[Client] Mock USDC not configured");
      return;
    }

    const usdc = new ethers.Contract(MOCK_USDC_ADDRESS, MOCK_USDC_ABI, this.wallet);
    const balance = await usdc.balanceOf(this.wallet.address);
    console.log(`[Client] USDC balance: ${balance.toString()}`);

    if (balance < minAmount) {
      console.log(`[Client] Minting USDC...`);
      const tx = await usdc.mint(this.wallet.address, 1000000000n); // 1000 USDC
      await tx.wait();
      console.log(`[Client] Minted 1000 USDC`);
    }
  }

  /**
   * Submit feedback for an agent to ERC-8004 Reputation Registry.
   */
  async submitFeedback(agentId: number, score: number): Promise<string | null> {
    if (!REPUTATION_REGISTRY_ADDRESS) {
      console.log(`[Client] Reputation Registry not configured, skipping feedback`);
      return null;
    }

    const rep = new ethers.Contract(
      REPUTATION_REGISTRY_ADDRESS, REPUTATION_REGISTRY_ABI, this.wallet
    );

    const tx = await rep.giveFeedback(
      agentId,
      score, // int128 value
      0,     // valueDecimals
      "successRate", // tag1
      "",            // tag2
      "",            // endpoint
      "",            // feedbackURI
      ethers.ZeroHash // feedbackHash
    );
    await tx.wait();
    console.log(`[Client] Feedback submitted for agent ${agentId}: ${score}/100`);
    return tx.hash;
  }
}

/**
 * Demo flow: discover agents, select best, call service, submit feedback.
 */
async function runDemo() {
  const client = new ClientAgent(process.env.CLIENT_AGENT_KEY || "0x" + "d".repeat(64));

  console.log("=== BitAgent Client Demo ===\n");

  // Ensure client has USDC for payments
  await client.ensureUSDCBalance();

  // 1. Discover agents
  console.log("Step 1: Discovering agents...");
  const agents = await client.discoverAgents();
  if (agents.length === 0) {
    console.log("No agents found. Start agent services first.");
    return;
  }

  console.log(`Found ${agents.length} agents:`);
  for (const a of agents) {
    console.log(`  - ${a.name} (ID: ${a.agentId}, Trust: ${a.trustScore}, Tier: ${a.tier}, Stake: ${a.stakeAmount} BTC)`);
  }

  // 2. Select highest trust agent that does auditing
  const auditor = agents.find(a => a.service === "/api/audit");
  if (auditor) {
    console.log(`\nStep 2: Selected ${auditor.name} (Trust: ${auditor.trustScore})`);
    console.log("Step 3: Calling audit service via x402...");

    const result = await client.callService(auditor, {
      code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
contract Simple {
    mapping(address => uint256) public balances;
    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }
    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount);
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok);
        balances[msg.sender] -= amount;
    }
}`,
    });

    console.log("\nAudit Result:");
    console.log(result.result?.substring(0, 500) + "...");
  }

  // 3. Call translator
  const translator = agents.find(a => a.service === "/api/translate");
  if (translator) {
    console.log(`\nStep 4: Calling ${translator.name} via x402...`);
    const result = await client.callService(translator, {
      text: "Bitcoin-backed AI agents solve the trust cold-start problem in agent economies.",
      direction: "en-zh",
    });
    console.log("Translation:", result.result);
  }

  console.log("\n=== Demo Complete ===");
}

runDemo().catch(console.error);
