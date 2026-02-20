import { ethers } from "ethers";
import express, { Express, Request, Response } from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import {
  getProvider,
  getWallet,
  STAKING_VAULT_ADDRESS,
  STAKING_VAULT_ABI,
  IDENTITY_REGISTRY_ADDRESS,
  IDENTITY_REGISTRY_ABI,
  MOCK_USDC_ADDRESS,
  GOAT_CHAIN_ID,
  GOAT_NETWORK,
} from "./config.js";

const FACILITATOR_URL = process.env.FACILITATOR_URL || "http://localhost:4022";

// Default Mock USDC address for local testing (overridden by env in testnet)
const USDC_ADDRESS = MOCK_USDC_ADDRESS || "0x0000000000000000000000000000000000000001";

export interface AgentConfig {
  name: string;
  description: string;
  privateKey: string;
  port: number;
  stakeAmount: string; // in ether (BTC) e.g. "0.01"
  priceUsdc: number;   // USDC amount e.g. 0.01
  serviceEndpoint: string; // e.g. "/api/audit"
  agentId?: number;
}

export interface ServiceHandler {
  (req: Request, res: Response): Promise<void>;
}

/**
 * BitAgent: autonomous AI service agent with BTC staking and x402 payments.
 */
export class BitAgent {
  private wallet: ethers.Wallet;
  private app: Express;
  private config: AgentConfig;
  private agentId: number = 0;
  private earnings: bigint = 0n;
  private requestCount: number = 0;

  constructor(config: AgentConfig) {
    this.config = config;
    this.wallet = getWallet(config.privateKey);
    this.app = express();
    this.app.use((_req, res, next) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Payment, X-Payment-Response");
      if (_req.method === "OPTIONS") { res.sendStatus(204); return; }
      next();
    });
    this.app.use(express.json({ limit: "1mb" }));
  }

  get address() {
    return this.wallet.address;
  }

  get id() {
    return this.agentId;
  }

  get stats() {
    return {
      agentId: this.agentId,
      name: this.config.name,
      address: this.wallet.address,
      port: this.config.port,
      stakeAmount: this.config.stakeAmount,
      priceUsdc: this.config.priceUsdc,
      earnings: this.earnings.toString(),
      requestCount: this.requestCount,
    };
  }

  /**
   * Boot sequence: stake BTC, then start HTTP server with x402 middleware.
   */
  async boot(handler: ServiceHandler): Promise<void> {
    console.log(`[${this.config.name}] Booting...`);
    console.log(`[${this.config.name}] Wallet: ${this.wallet.address}`);

    // Check BTC balance
    const balance = await getProvider().getBalance(this.wallet.address);
    console.log(`[${this.config.name}] BTC Balance: ${ethers.formatEther(balance)}`);

    // Register ERC-8004 identity
    if (IDENTITY_REGISTRY_ADDRESS) {
      await this.registerIdentity();
    } else {
      console.log(`[${this.config.name}] IdentityRegistry not configured, skipping registration`);
      this.agentId = this.config.agentId || parseInt(this.wallet.address.slice(-4), 16);
    }

    // Stake BTC if vault address is configured
    if (STAKING_VAULT_ADDRESS) {
      try {
        await this.stakeBTC();
      } catch (error: any) {
        console.log(`[${this.config.name}] Staking failed (non-fatal): ${error.message?.slice(0, 80)}`);
      }
    } else {
      console.log(`[${this.config.name}] StakingVault not configured, skipping staking`);
    }

    // Set up endpoints with x402 payment middleware
    this.setupEndpoints(handler);

    // Start server
    this.app.listen(this.config.port, () => {
      console.log(`[${this.config.name}] Listening on port ${this.config.port}`);
      console.log(`[${this.config.name}] Service: ${this.config.serviceEndpoint}`);
      console.log(`[${this.config.name}] Price: ${this.config.priceUsdc} USDC`);
      console.log(`[${this.config.name}] Facilitator: ${FACILITATOR_URL}`);
    });
  }

  private async registerIdentity(): Promise<void> {
    const identity = new ethers.Contract(IDENTITY_REGISTRY_ADDRESS, IDENTITY_REGISTRY_ABI, this.wallet);

    // Check if this specific agent name is already registered by scanning token URIs
    try {
      for (let i = 0; i <= 20; i++) {
        try {
          await identity.ownerOf(i); // will throw if token doesn't exist
          const uri = await identity.tokenURI(i);
          if (uri.includes(this.config.name)) {
            this.agentId = i;
            console.log(`[${this.config.name}] Already registered as Agent #${i}`);
            return;
          }
        } catch { break; } // no more tokens
      }
    } catch { /* scan failed, register fresh */ }

    // Register new identity
    const agentURI = JSON.stringify({
      name: this.config.name,
      description: this.config.description,
      service: this.config.serviceEndpoint,
      price: this.config.priceUsdc,
    });

    console.log(`[${this.config.name}] Registering ERC-8004 identity...`);
    const tx = await identity.getFunction("register(string)").send(agentURI);
    const receipt = await tx.wait();

    // Extract agentId from Transfer event
    const transferLog = receipt?.logs.find(
      (log: any) => log.topics[0] === ethers.id("Transfer(address,address,uint256)")
    );
    this.agentId = transferLog ? Number(BigInt(transferLog.topics[3])) : 0;
    console.log(`[${this.config.name}] Registered! Agent ID: ${this.agentId}, TX: ${tx.hash}`);
  }

  private async stakeBTC(): Promise<void> {
    const vault = new ethers.Contract(STAKING_VAULT_ADDRESS, STAKING_VAULT_ABI, this.wallet);
    const stakeWei = ethers.parseEther(this.config.stakeAmount);

    try {
      const info = await vault.getStakeInfo(this.agentId || 0);
      if (info[4]) { // active
        console.log(`[${this.config.name}] Already staked: ${ethers.formatEther(info[0])} BTC`);
        return;
      }
    } catch {
      // Not staked yet
    }

    console.log(`[${this.config.name}] Staking ${this.config.stakeAmount} BTC...`);
    const tx = await vault.stake(this.agentId || 0, { value: stakeWei });
    await tx.wait();
    console.log(`[${this.config.name}] Staked! TX: ${tx.hash}`);
  }

  private setupEndpoints(handler: ServiceHandler): void {
    // Health check (unprotected)
    this.app.get("/health", (_req, res) => {
      res.json({ status: "ok", agent: this.stats });
    });

    // Agent info for client discovery (unprotected)
    this.app.get("/info", (_req, res) => {
      res.json({
        agentId: this.agentId,
        name: this.config.name,
        description: this.config.description,
        wallet: this.wallet.address,
        service: this.config.serviceEndpoint,
        price: `$${this.config.priceUsdc}`,
        network: GOAT_NETWORK,
        stakeAmount: this.config.stakeAmount,
      });
    });

    // x402 payment middleware -- protects service endpoints
    const facilitatorClient = new HTTPFacilitatorClient({
      url: FACILITATOR_URL,
    });

    const evmScheme = new ExactEvmScheme();

    const resourceServer = new x402ResourceServer(facilitatorClient)
      .register(GOAT_NETWORK as `${string}:${string}`, evmScheme);

    // Use AssetAmount format to bypass default network asset lookup
    // Mock USDC has 6 decimals
    const usdcAmount = Math.round(this.config.priceUsdc * 1e6).toString();

    const method = this.config.serviceEndpoint.startsWith("/")
      ? `POST ${this.config.serviceEndpoint}`
      : `POST /${this.config.serviceEndpoint}`;

    const routes = {
      [method]: {
        accepts: {
          scheme: "exact" as const,
          network: GOAT_NETWORK as `${string}:${string}`,
          payTo: this.wallet.address,
          maxTimeoutSeconds: 300,
          price: {
            amount: usdcAmount,
            asset: USDC_ADDRESS,
            extra: {
              assetTransferMethod: "eip3009",
              name: "USD Coin",
              version: "1",
            },
          },
        },
        description: this.config.description,
        mimeType: "application/json",
      },
    };

    this.app.use(paymentMiddleware(routes, resourceServer));

    // Service endpoint -- x402 middleware handles payment gate
    this.app.post(this.config.serviceEndpoint, async (req: Request, res: Response) => {
      this.requestCount++;
      this.earnings += BigInt(usdcAmount);
      console.log(`[${this.config.name}] Request #${this.requestCount} - Payment verified`);

      try {
        await handler(req, res);
      } catch (error: any) {
        console.error(`[${this.config.name}] Service error:`, error.message);
        res.status(500).json({ error: "Service execution failed" });
      }
    });
  }
}
