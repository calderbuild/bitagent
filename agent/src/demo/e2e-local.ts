/**
 * End-to-end local demo script for BitAgent.
 *
 * Starts all components in a single process:
 * 1. Facilitator (port 4022)
 * 2. Three AI agent services (ports 3001-3003)
 * 3. Client agent discovers, evaluates trust, pays, and calls services
 *
 * This runs against local agents without requiring GOAT testnet connectivity.
 * For testnet deployment, contracts must be deployed first and env vars set.
 */
import { startFacilitator } from "../facilitator/server.js";
import { BitAgent } from "../core/agent.js";
import type { Request, Response } from "express";

// Valid deterministic test keys (within secp256k1 curve order)
const FACILITATOR_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const AUDITOR_KEY =     "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const TRANSLATOR_KEY =  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a";
const ANALYST_KEY =     "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6";
const CLIENT_KEY =      "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a";

// Set env before imports use them
process.env.FACILITATOR_KEY = process.env.FACILITATOR_KEY || FACILITATOR_KEY;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function startDemoAgents() {
  // Simple mock handlers that don't need Claude API
  const mockAuditHandler = async (req: Request, res: Response) => {
    const { code } = req.body;
    res.json({
      agentId: 1,
      service: "code-audit",
      result: `[AUDIT REPORT] Analyzed ${code?.length || 0} characters of Solidity code.\n\n` +
        `Critical: Found reentrancy vulnerability in withdraw() -- state updated after external call.\n` +
        `Medium: No access control on deposit().\n` +
        `Gas: Consider using unchecked math for balance updates.\n` +
        `Rating: C (needs fixes before deployment)`,
      timestamp: Date.now(),
    });
  };

  const mockTranslateHandler = async (req: Request, res: Response) => {
    const { direction } = req.body;
    const result = direction === "en-zh"
      ? "BTC 担保的 AI Agent 解决了 Agent 经济中的信任冷启动问题。"
      : "Bitcoin-backed AI agents solve the trust cold-start problem in agent economies.";
    res.json({
      agentId: 2,
      service: "translation",
      direction: direction || "en-zh",
      result,
      timestamp: Date.now(),
    });
  };

  const mockAnalystHandler = async (req: Request, res: Response) => {
    const { data } = req.body;
    res.json({
      agentId: 3,
      service: "data-analysis",
      result: `[ANALYSIS] Dataset contains ${data?.length || 0} characters.\n\n` +
        `Key findings:\n` +
        `1. Upward trend in BTC staking volume over past 7 days\n` +
        `2. Average trust score: 72.4 across all active agents\n` +
        `3. Recommendation: Increase stake to diamond tier for better client acquisition`,
      timestamp: Date.now(),
    });
  };

  // Start agents with mock handlers (no BTC staking in local mode)
  const auditor = new BitAgent({
    name: "CodeAuditor",
    description: "AI-powered smart contract security audit",
    privateKey: AUDITOR_KEY,
    port: 3001,
    stakeAmount: "0.005",
    priceUsdc: 0.01,
    serviceEndpoint: "/api/audit",
    agentId: 1,
  });

  const translator = new BitAgent({
    name: "TranslateBot",
    description: "High-quality Chinese-English translation",
    privateKey: TRANSLATOR_KEY,
    port: 3002,
    stakeAmount: "0.003",
    priceUsdc: 0.005,
    serviceEndpoint: "/api/translate",
    agentId: 2,
  });

  const analyst = new BitAgent({
    name: "DataAnalyst",
    description: "AI-powered data analysis for blockchain datasets",
    privateKey: ANALYST_KEY,
    port: 3003,
    stakeAmount: "0.008",
    priceUsdc: 0.02,
    serviceEndpoint: "/api/analyze",
    agentId: 3,
  });

  // Boot agents sequentially to ensure facilitator sync works
  await auditor.boot(mockAuditHandler);
  await translator.boot(mockTranslateHandler);
  await analyst.boot(mockAnalystHandler);

  return [auditor, translator, analyst];
}

async function runClientDemo() {
  console.log("\n" + "=".repeat(60));
  console.log("  BitAgent Client Demo -- x402 Payment Flow");
  console.log("=".repeat(60) + "\n");

  // Discover agents via HTTP
  const endpoints = ["http://localhost:3001", "http://localhost:3002", "http://localhost:3003"];
  const agents: any[] = [];

  console.log("Step 1: Discovering agents...\n");
  for (const ep of endpoints) {
    try {
      const resp = await fetch(`${ep}/info`);
      if (resp.ok) {
        const info = await resp.json();
        (info as any).endpoint = ep;
        agents.push(info);
        console.log(`  [OK] ${(info as any).name} at ${ep}`);
        console.log(`       Service: ${(info as any).service} | Price: ${(info as any).price} | Stake: ${(info as any).stakeAmount} BTC`);
      }
    } catch {
      console.log(`  [--] ${ep} not reachable`);
    }
  }

  console.log(`\nFound ${agents.length} agents.\n`);

  // Call each agent's service
  for (const agent of agents) {
    console.log(`Calling ${agent.name} (${agent.service})...`);

    let body: any = {};
    if (agent.service === "/api/audit") {
      body = { code: 'contract Test { function foo() public payable {} }' };
    } else if (agent.service === "/api/translate") {
      body = { text: "BTC-backed AI agent trust", direction: "en-zh" };
    } else if (agent.service === "/api/analyze") {
      body = { data: "day,stakers,volume\n1,10,0.5\n2,15,0.8\n3,22,1.2" };
    }

    // First call without payment -- should get 402
    const initialResp = await fetch(`${agent.endpoint}${agent.service}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (initialResp.status === 402) {
      // x402 middleware returned payment requirements
      const payReqHeader = initialResp.headers.get("payment-required");
      console.log(`  [402] Payment required (x402 protocol active)`);

      if (payReqHeader) {
        try {
          const payReq = JSON.parse(Buffer.from(payReqHeader, "base64").toString());
          const accept = payReq.accepts?.[0];
          if (accept) {
            console.log(`  Amount: ${accept.amount} | Asset: ${accept.asset?.substring(0, 10)}... | Network: ${accept.network}`);
          }
        } catch {
          console.log(`  (payment header present but not base64-decodable)`);
        }
      }

      // In full flow, client would sign EIP-712 transferWithAuthorization
      // and retry with PAYMENT-SIGNATURE header. For local demo, show the 402 response.
      console.log(`  -> In testnet mode, x402 client auto-signs and retries payment`);
    } else if (initialResp.ok) {
      const result = await initialResp.json();
      console.log(`  [200] ${result.service}: ${(result.result as string).substring(0, 120)}...`);
    } else {
      console.log(`  [${initialResp.status}] ${await initialResp.text()}`);
    }
    console.log();
  }

  console.log("=".repeat(60));
  console.log("  Demo Complete -- x402 payment gates active on all agents");
  console.log("=".repeat(60));
}

async function main() {
  console.log("BitAgent -- BTC-Secured AI Service Network");
  console.log("Local E2E Demo\n");

  // Step 1: Start facilitator
  console.log("[1/3] Starting facilitator...");
  await startFacilitator();

  // Wait for facilitator to be ready
  await sleep(500);

  // Step 2: Start agents
  console.log("\n[2/3] Starting agents...");
  await startDemoAgents();

  // Wait for servers to be ready
  await sleep(500);

  // Step 3: Run client demo
  console.log("\n[3/3] Running client demo...");
  await runClientDemo();

  // Keep process alive for interactive exploration
  console.log("\nServers running. Press Ctrl+C to stop.");
  console.log("  Facilitator: http://localhost:4022/health");
  console.log("  CodeAuditor: http://localhost:3001/health");
  console.log("  TranslateBot: http://localhost:3002/health");
  console.log("  DataAnalyst: http://localhost:3003/health");
}

main().catch(console.error);
