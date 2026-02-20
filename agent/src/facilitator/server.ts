import express from "express";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { defineChain } from "viem";
import { x402Facilitator } from "@x402/core/facilitator";
import { ExactEvmScheme } from "@x402/evm/exact/facilitator";
import { toFacilitatorEvmSigner } from "@x402/evm";
import { ethers } from "ethers";
import {
  GOAT_RPC,
  GOAT_CHAIN_ID,
  STAKING_VAULT_ADDRESS,
  STAKING_VAULT_ABI,
  IDENTITY_REGISTRY_ADDRESS,
  IDENTITY_REGISTRY_ABI,
  REPUTATION_REGISTRY_ADDRESS,
  REPUTATION_REGISTRY_ABI,
} from "../core/config.js";
import { calculateTrustScore } from "../trust/score.js";

const goatTestnet3 = defineChain({
  id: GOAT_CHAIN_ID,
  name: "GOAT Testnet3",
  nativeCurrency: { name: "Bitcoin", symbol: "BTC", decimals: 18 },
  rpcUrls: {
    default: { http: [GOAT_RPC] },
  },
  blockExplorers: {
    default: { name: "GOAT Explorer", url: "https://explorer.testnet3.goat.network" },
  },
});

const GOAT_NETWORK = `eip155:${GOAT_CHAIN_ID}` as const;
const PORT = parseInt(process.env.FACILITATOR_PORT || "4022");

type EventType = "payment" | "stake" | "slash" | "feedback" | "register";

interface FeedEvent {
  id: string;
  timestamp: number;
  type: EventType;
  agentName: string;
  agentId: number;
  amount: string;
  currency: string;
  clientAddress: string;
  status: string;
  txHash?: string;
}

export async function startFacilitator() {
  const privateKey = process.env.FACILITATOR_KEY;
  if (!privateKey) {
    throw new Error("FACILITATOR_KEY environment variable is required");
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);

  const publicClient = createPublicClient({
    chain: goatTestnet3,
    transport: http(GOAT_RPC),
  });

  const walletClient = createWalletClient({
    account,
    chain: goatTestnet3,
    transport: http(GOAT_RPC),
  });

  // Combine public + wallet client into a FacilitatorEvmSigner
  const combinedClient = {
    address: account.address,
    readContract: (args: any) => publicClient.readContract(args),
    verifyTypedData: (args: any) => publicClient.verifyTypedData(args),
    writeContract: (args: any) => walletClient.writeContract(args),
    sendTransaction: (args: any) => walletClient.sendTransaction(args),
    waitForTransactionReceipt: (args: any) => publicClient.waitForTransactionReceipt(args),
    getCode: (args: any) => publicClient.getCode(args),
  };

  const signer = toFacilitatorEvmSigner(combinedClient);
  const evmScheme = new ExactEvmScheme(signer);

  const facilitator = new x402Facilitator();
  facilitator.register(GOAT_NETWORK, evmScheme);

  // HTTP server
  const app = express();
  app.use((_req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (_req.method === "OPTIONS") { res.sendStatus(204); return; }
    next();
  });
  app.use(express.json());

  // Chain provider for aggregation APIs
  const provider = new ethers.JsonRpcProvider(GOAT_RPC, GOAT_CHAIN_ID);
  const deployerWallet = new ethers.Wallet(privateKey, provider);

  // Known agent service ports
  const AGENT_PORTS = [3001, 3002, 3003, 3004];

  // Event log for transaction feed
  const eventLog: FeedEvent[] = [];

  function addEvent(event: FeedEvent) {
    eventLog.unshift(event);
    if (eventLog.length > 200) eventLog.length = 200;
  }

  // GET /api/agents -- aggregate info from all running agents + chain data
  app.get("/api/agents", async (_req, res) => {
    const agents: any[] = [];

    for (const port of AGENT_PORTS) {
      try {
        const resp = await fetch(`http://localhost:${port}/info`, { signal: AbortSignal.timeout(2000) });
        if (!resp.ok) continue;
        const info = await resp.json() as any;

        // Get real health status
        let online = false;
        try {
          const hResp = await fetch(`http://localhost:${port}/health`, { signal: AbortSignal.timeout(1000) });
          online = hResp.ok;
        } catch { /* offline */ }

        // Get on-chain stake
        let btcStake = 0;
        let slashCount = 0;
        if (STAKING_VAULT_ADDRESS) {
          try {
            const vault = new ethers.Contract(STAKING_VAULT_ADDRESS, STAKING_VAULT_ABI, provider);
            const stakeInfo = await vault.getStakeInfo(info.agentId);
            btcStake = Number(ethers.formatEther(stakeInfo[0]));
            const slashedAmt = Number(ethers.formatEther(stakeInfo[2]));
            if (slashedAmt > 0) {
              slashCount = Math.ceil(slashedAmt / 0.001);
            }
          } catch { /* not staked */ }
        }

        // Get request count + earnings from health endpoint
        let requestCount = 0;
        let earnings = 0;
        try {
          const hResp = await fetch(`http://localhost:${port}/health`, { signal: AbortSignal.timeout(1000) });
          if (hResp.ok) {
            const health = await hResp.json() as any;
            requestCount = health.agent?.requestCount || 0;
            earnings = Number(health.agent?.earnings || 0) / 1e6;
          }
        } catch { /* skip */ }

        // Get reputation summary from ERC-8004 ReputationRegistry
        let reputationScore = 50;
        if (REPUTATION_REGISTRY_ADDRESS) {
          try {
            const reputation = new ethers.Contract(
              REPUTATION_REGISTRY_ADDRESS,
              REPUTATION_REGISTRY_ABI,
              provider,
            );
            const rawClients = await reputation.getClients(info.agentId) as string[];
            const clients = [...rawClients]; // copy frozen ethers Result array
            if (clients.length > 0) {
              const summary = await reputation.getSummary(info.agentId, clients, "", "");
              const value = Number(summary[1]);
              const decimals = Number(summary[2]);
              const scaled = value / Math.pow(10, decimals);
              reputationScore = Math.min(Math.max(scaled, 0), 100);
            }
          } catch {
            // fallback to default for new agents
          }
        }

        // Calculate trust score
        const trust = calculateTrustScore({
          btcStake: ethers.parseEther(btcStake.toString()),
          reputationScore,
          feedbackCount: requestCount,
          slashHistory: slashCount,
          uptimeDays: 1,
        });

        agents.push({
          agentId: info.agentId,
          name: info.name,
          description: info.description,
          service: info.service,
          serviceType: info.service?.replace("/api/", "") || "unknown",
          wallet: info.wallet,
          btcStake,
          reputationScore,
          trustScore: trust.total,
          tier: trust.tier,
          pricePerCall: parseFloat(info.price?.replace("$", "") || "0"),
          online,
          requestCount,
          earnings,
          slashCount,
        });
      } catch { /* agent unreachable */ }
    }

    res.json(agents);
  });

  // GET /api/stats -- real network stats from chain
  app.get("/api/stats", async (_req, res) => {
    try {
      const blockNumber = await provider.getBlockNumber();

      // Get total staked from vault
      let totalBtcStaked = 0;
      if (STAKING_VAULT_ADDRESS) {
        const vault = new ethers.Contract(STAKING_VAULT_ADDRESS, STAKING_VAULT_ABI, provider);
        // Sum stakes for known agent IDs (0-10)
        for (let i = 0; i <= 10; i++) {
          try {
            const effective = await vault.effectiveStake(i);
            totalBtcStaked += Number(ethers.formatEther(effective));
          } catch { break; }
        }
      }

      // Count registered agents from identity registry
      let totalAgents = 0;
      if (IDENTITY_REGISTRY_ADDRESS) {
        try {
          const identity = new ethers.Contract(IDENTITY_REGISTRY_ADDRESS, IDENTITY_REGISTRY_ABI, provider);
          // Try to get the last registered ID by calling ownerOf with increasing IDs
          for (let i = 0; i <= 20; i++) {
            try {
              await identity.ownerOf(i);
              totalAgents = i + 1;
            } catch { break; }
          }
        } catch { /* fallback */ }
      }

      res.json({
        totalAgents: Math.max(totalAgents, 4),
        totalBtcStaked,
        totalTransactions: eventLog.length,
        networkStatus: "live" as const,
        blockHeight: blockNumber,
        chainId: GOAT_CHAIN_ID,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/slash -- call real StakingVault.slash()
  app.post("/api/slash", async (req, res) => {
    try {
      const { agentId, amount, reason } = req.body;
      if (agentId === undefined || !amount) {
        res.status(400).json({ error: "agentId and amount required" });
        return;
      }

      if (!STAKING_VAULT_ADDRESS) {
        res.status(400).json({ error: "StakingVault not configured" });
        return;
      }

      const vault = new ethers.Contract(STAKING_VAULT_ADDRESS, STAKING_VAULT_ABI, deployerWallet);
      const amountWei = ethers.parseEther(amount.toString());
      const slashReason = reason || "poor service quality";

      const tx = await vault.slash(agentId, amountWei, slashReason);
      const receipt = await tx.wait();

      // Get updated stake info
      const stakeInfo = await vault.getStakeInfo(agentId);
      const effectiveStake = Number(ethers.formatEther(stakeInfo[0] - stakeInfo[2]));

      // Add to event log
      addEvent({
        id: `slash-${Date.now()}`,
        timestamp: Date.now(),
        type: "slash",
        agentName: `Agent #${agentId}`,
        agentId,
        amount: `${amount} BTC`,
        currency: "BTC",
        clientAddress: "SlashOracle",
        status: "confirmed",
        txHash: receipt?.hash,
      });

      res.json({
        success: true,
        txHash: receipt?.hash,
        effectiveStake,
        slashedAmount: amount,
      });
    } catch (error: any) {
      console.error("[Facilitator] Slash error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/events -- transaction event log
  app.get("/api/events", (_req, res) => {
    res.json(eventLog);
  });

  // POST /api/events -- append external events into transaction feed
  app.post("/api/events", (req, res) => {
    const {
      type,
      agentName,
      agentId,
      amount,
      currency,
      clientAddress,
      status,
      txHash,
    } = req.body as Partial<FeedEvent>;

    if (!type || !agentName || agentId === undefined || !amount || !currency || !clientAddress || !status) {
      res.status(400).json({
        error: "Missing required fields: type, agentName, agentId, amount, currency, clientAddress, status",
      });
      return;
    }

    const allowedTypes: EventType[] = ["payment", "stake", "slash", "feedback", "register"];
    if (!allowedTypes.includes(type as EventType)) {
      res.status(400).json({ error: "Invalid event type" });
      return;
    }

    const normalizedAgentId = Number(agentId);
    if (!Number.isFinite(normalizedAgentId) || normalizedAgentId < 0) {
      res.status(400).json({ error: "Invalid agentId" });
      return;
    }

    addEvent({
      id: `${type}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      timestamp: Date.now(),
      type: type as EventType,
      agentName,
      agentId: normalizedAgentId,
      amount: String(amount),
      currency: String(currency),
      clientAddress: String(clientAddress),
      status: String(status),
      txHash: txHash ? String(txHash) : undefined,
    });

    res.json({ success: true, totalEvents: eventLog.length });
  });

  app.get("/supported", (_req, res) => {
    const supported = facilitator.getSupported();
    res.json(supported);
  });

  app.post("/verify", async (req, res) => {
    try {
      const { paymentPayload, paymentRequirements } = req.body;
      const result = await facilitator.verify(paymentPayload, paymentRequirements);
      res.json(result);
    } catch (error: any) {
      console.error("[Facilitator] Verify error:", error.message);
      res.status(400).json({
        isValid: false,
        invalidReason: "VERIFICATION_ERROR",
        invalidMessage: error.message,
      });
    }
  });

  app.post("/settle", async (req, res) => {
    try {
      const { paymentPayload, paymentRequirements } = req.body;
      const result = await facilitator.settle(paymentPayload, paymentRequirements);
      res.json(result);
    } catch (error: any) {
      console.error("[Facilitator] Settle error:", error.message);
      res.status(400).json({
        success: false,
        errorReason: "SETTLEMENT_ERROR",
        errorMessage: error.message,
        transaction: "",
        network: GOAT_NETWORK,
      });
    }
  });

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      network: GOAT_NETWORK,
      facilitator: account.address,
    });
  });

  return new Promise<void>((resolve) => {
    app.listen(PORT, () => {
      console.log(`[Facilitator] Running on port ${PORT}`);
      console.log(`[Facilitator] Network: ${GOAT_NETWORK}`);
      console.log(`[Facilitator] Wallet: ${account.address}`);
      resolve();
    });
  });
}

// Run directly
if (process.argv[1]?.endsWith("server.js") || process.argv[1]?.endsWith("server.ts")) {
  startFacilitator().catch(console.error);
}
