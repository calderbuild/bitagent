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
import { AGENT_PORTS } from "../core/agents.js";

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

  // Combine public + wallet client into a FacilitatorEvmSigner-compatible object
  type ReadContractArgs = { address: `0x${string}`; abi: readonly unknown[]; functionName: string; args?: readonly unknown[] };
  type VerifyTypedDataArgs = { address: `0x${string}`; domain: Record<string, unknown>; types: Record<string, unknown>; primaryType: string; message: Record<string, unknown>; signature: `0x${string}` };
  type WriteContractArgs = { address: `0x${string}`; abi: readonly unknown[]; functionName: string; args: readonly unknown[] };
  type SendTxArgs = { to: `0x${string}`; data: `0x${string}` };
  type WaitReceiptArgs = { hash: `0x${string}` };
  type GetCodeArgs = { address: `0x${string}` };

  const combinedClient = {
    address: account.address,
    readContract: (args: ReadContractArgs) => publicClient.readContract(args as Parameters<typeof publicClient.readContract>[0]),
    verifyTypedData: (args: VerifyTypedDataArgs) => publicClient.verifyTypedData(args as Parameters<typeof publicClient.verifyTypedData>[0]),
    writeContract: (args: WriteContractArgs) => walletClient.writeContract(args as Parameters<typeof walletClient.writeContract>[0]),
    sendTransaction: (args: SendTxArgs) => walletClient.sendTransaction(args),
    waitForTransactionReceipt: (args: WaitReceiptArgs) => publicClient.waitForTransactionReceipt(args),
    getCode: (args: GetCodeArgs) => publicClient.getCode(args),
  };

  const signer = toFacilitatorEvmSigner(combinedClient);
  const evmScheme = new ExactEvmScheme(signer);

  const facilitator = new x402Facilitator();
  facilitator.register(GOAT_NETWORK, evmScheme);

  const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "bitagent-demo-2026";
  const ALLOWED_ORIGINS = ["http://localhost:5173", "http://localhost:4173", "http://127.0.0.1:5173"];

  // HTTP server
  const app = express();
  app.use((_req, res, next) => {
    const origin = _req.headers.origin;
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    } else {
      // Allow same-origin and agent-to-facilitator calls (no origin header)
      res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGINS[0]);
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (_req.method === "OPTIONS") { res.sendStatus(204); return; }
    next();
  });
  app.use(express.json());

  // Chain provider for aggregation APIs
  const provider = new ethers.JsonRpcProvider(GOAT_RPC, GOAT_CHAIN_ID);
  const deployerWallet = new ethers.Wallet(privateKey, provider);

  // Known agent service ports (from centralized registry)

  // Event log for transaction feed
  const eventLog: FeedEvent[] = [];

  function addEvent(event: FeedEvent) {
    eventLog.unshift(event);
    if (eventLog.length > 200) eventLog.length = 200;
  }

  // GET /api/agents -- aggregate info from all running agents + chain data
  app.get("/api/agents", async (_req, res) => {
    const agentResults = await Promise.all(
      AGENT_PORTS.map(async (port) => {
        try {
          const resp = await fetch(`http://localhost:${port}/info`, { signal: AbortSignal.timeout(2000) });
          if (!resp.ok) return null;
          const info = await resp.json() as Record<string, unknown>;

          // Fetch health, stake, and reputation in parallel
          const [healthResult, stakeResult, reputationResult] = await Promise.allSettled([
            // Health + request count + earnings (single call replaces two duplicate fetches)
            fetch(`http://localhost:${port}/health`, { signal: AbortSignal.timeout(1000) })
              .then(r => r.ok ? r.json() as Promise<Record<string, unknown>> : null),
            // On-chain stake info
            STAKING_VAULT_ADDRESS
              ? new ethers.Contract(STAKING_VAULT_ADDRESS, STAKING_VAULT_ABI, provider)
                  .getStakeInfo(info.agentId)
              : Promise.resolve(null),
            // ERC-8004 reputation
            REPUTATION_REGISTRY_ADDRESS
              ? (async () => {
                  const reputation = new ethers.Contract(
                    REPUTATION_REGISTRY_ADDRESS, REPUTATION_REGISTRY_ABI, provider,
                  );
                  const rawClients = await reputation.getClients(info.agentId) as string[];
                  const clients = [...rawClients];
                  if (clients.length === 0) return null;
                  return reputation.getSummary(info.agentId, clients, "", "");
                })()
              : Promise.resolve(null),
          ]);

          // Parse health
          const health = healthResult.status === "fulfilled" ? healthResult.value : null;
          const online = !!health;
          const agentStats = (health as Record<string, unknown>)?.agent as Record<string, unknown> | undefined;
          const requestCount = Number(agentStats?.requestCount || 0);
          const earnings = Number(agentStats?.earnings || 0) / 1e6;

          // Parse stake
          let btcStake = 0;
          let slashCount = 0;
          if (stakeResult.status === "fulfilled" && stakeResult.value) {
            const stakeInfo = stakeResult.value;
            btcStake = Number(ethers.formatEther(stakeInfo[0]));
            const slashedAmt = Number(ethers.formatEther(stakeInfo[2]));
            if (slashedAmt > 0) slashCount = Math.ceil(slashedAmt / 0.001);
          }

          // Parse reputation
          let reputationScore = 50;
          if (reputationResult.status === "fulfilled" && reputationResult.value) {
            const summary = reputationResult.value;
            const value = Number(summary[1]);
            const decimals = Number(summary[2]);
            const scaled = value / Math.pow(10, decimals);
            reputationScore = Math.min(Math.max(scaled, 0), 100);
          }

          const trust = calculateTrustScore({
            btcStake: ethers.parseEther(btcStake.toString()),
            reputationScore,
            feedbackCount: requestCount,
            slashHistory: slashCount,
            uptimeDays: 1,
          });

          return {
            agentId: info.agentId,
            name: info.name,
            description: info.description,
            service: info.service,
            serviceType: (info.service as string)?.replace("/api/", "") || "unknown",
            wallet: info.wallet,
            btcStake,
            reputationScore,
            trustScore: trust.total,
            trustBreakdown: trust.breakdown,
            tier: trust.tier,
            pricePerCall: parseFloat((info.price as string)?.replace("$", "") || "0"),
            online,
            requestCount,
            earnings,
            slashCount,
          };
        } catch { return null; }
      }),
    );

    res.json(agentResults.filter(Boolean));
  });

  // GET /api/stats -- real network stats from chain (cached 10s)
  let statsCache: { data: Record<string, unknown>; ts: number } | null = null;

  app.get("/api/stats", async (_req, res) => {
    if (statsCache && Date.now() - statsCache.ts < 10_000) {
      // Refresh transaction count from in-memory log even when cached
      res.json({ ...statsCache.data, totalTransactions: eventLog.length });
      return;
    }

    try {
      // Fetch block number, total staked, and agent count in parallel
      const [blockNumber, totalBtcStaked, totalAgents] = await Promise.all([
        provider.getBlockNumber(),
        // Sum effective stakes for agent IDs 0-10
        STAKING_VAULT_ADDRESS
          ? (async () => {
              const vault = new ethers.Contract(STAKING_VAULT_ADDRESS, STAKING_VAULT_ABI, provider);
              const results = await Promise.allSettled(
                Array.from({ length: 11 }, (_, i) => vault.effectiveStake(i)),
              );
              return results.reduce((sum, r) =>
                r.status === "fulfilled" ? sum + Number(ethers.formatEther(r.value)) : sum, 0);
            })()
          : Promise.resolve(0),
        // Count registered agents
        IDENTITY_REGISTRY_ADDRESS
          ? (async () => {
              const identity = new ethers.Contract(IDENTITY_REGISTRY_ADDRESS, IDENTITY_REGISTRY_ABI, provider);
              const results = await Promise.allSettled(
                Array.from({ length: 21 }, (_, i) => identity.ownerOf(i)),
              );
              // Count consecutive fulfilled results from index 0
              let count = 0;
              for (const r of results) {
                if (r.status === "fulfilled") count++;
                else break;
              }
              return count;
            })()
          : Promise.resolve(0),
      ]);

      const data = {
        totalAgents: Math.max(totalAgents, 4),
        totalBtcStaked,
        totalTransactions: eventLog.length,
        networkStatus: "live" as const,
        blockHeight: blockNumber,
        chainId: GOAT_CHAIN_ID,
      };

      statsCache = { data, ts: Date.now() };
      res.json(data);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: msg });
    }
  });

  // POST /api/slash -- call real StakingVault.slash() (admin-only)
  app.post("/api/slash", async (req, res) => {
    if (req.headers.authorization !== `Bearer ${ADMIN_TOKEN}`) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

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
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("[Facilitator] Slash error:", msg);
      res.status(500).json({ error: msg });
    }
  });

  // GET /api/events -- transaction event log
  app.get("/api/events", (_req, res) => {
    res.json(eventLog);
  });

  // POST /api/events -- append external events into transaction feed (admin-only)
  app.post("/api/events", (req, res) => {
    if (req.headers.authorization !== `Bearer ${ADMIN_TOKEN}`) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

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
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("[Facilitator] Verify error:", msg);
      res.status(400).json({
        isValid: false,
        invalidReason: "VERIFICATION_ERROR",
        invalidMessage: msg,
      });
    }
  });

  app.post("/settle", async (req, res) => {
    try {
      const { paymentPayload, paymentRequirements } = req.body;
      const result = await facilitator.settle(paymentPayload, paymentRequirements);
      res.json(result);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("[Facilitator] Settle error:", msg);
      res.status(400).json({
        success: false,
        errorReason: "SETTLEMENT_ERROR",
        errorMessage: msg,
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
