import { ethers } from "ethers";
import express, { Express, Request, Response } from "express";
import {
  getProvider,
  getWallet,
  STAKING_VAULT_ADDRESS,
  STAKING_VAULT_ABI,
  MOCK_USDC_ADDRESS,
  MOCK_USDC_ABI,
  GOAT_CHAIN_ID,
  GOAT_NETWORK,
} from "./config.js";

export interface AgentConfig {
  name: string;
  description: string;
  privateKey: string;
  port: number;
  stakeAmount: string; // in ether (BTC) e.g. "0.01"
  pricePerCall: string; // in USDC units e.g. "10000" = 0.01 USDC
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
      pricePerCall: this.config.pricePerCall,
      earnings: this.earnings.toString(),
      requestCount: this.requestCount,
    };
  }

  /**
   * Boot sequence: stake BTC, then start HTTP server.
   */
  async boot(handler: ServiceHandler): Promise<void> {
    console.log(`[${this.config.name}] Booting...`);
    console.log(`[${this.config.name}] Wallet: ${this.wallet.address}`);

    // Check BTC balance
    const balance = await getProvider().getBalance(this.wallet.address);
    console.log(`[${this.config.name}] BTC Balance: ${ethers.formatEther(balance)}`);

    // Stake BTC if vault address is configured
    if (STAKING_VAULT_ADDRESS) {
      await this.stakeBTC();
    } else {
      console.log(`[${this.config.name}] StakingVault not configured, skipping staking`);
    }

    // Set agent ID from config or use wallet-derived ID
    this.agentId = this.config.agentId || parseInt(this.wallet.address.slice(-4), 16);

    // Set up HTTP endpoints
    this.setupEndpoints(handler);

    // Start server
    this.app.listen(this.config.port, () => {
      console.log(`[${this.config.name}] Listening on port ${this.config.port}`);
      console.log(`[${this.config.name}] Service: ${this.config.serviceEndpoint}`);
      console.log(`[${this.config.name}] Price: ${this.config.pricePerCall} USDC per call`);
    });
  }

  private async stakeBTC(): Promise<void> {
    const vault = new ethers.Contract(STAKING_VAULT_ADDRESS, STAKING_VAULT_ABI, this.wallet);
    const stakeWei = ethers.parseEther(this.config.stakeAmount);

    try {
      // Check if already staked
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
    // Health check
    this.app.get("/health", (_req, res) => {
      res.json({ status: "ok", agent: this.stats });
    });

    // Agent info (for client discovery)
    this.app.get("/info", (_req, res) => {
      res.json({
        agentId: this.agentId,
        name: this.config.name,
        description: this.config.description,
        wallet: this.wallet.address,
        service: this.config.serviceEndpoint,
        price: this.config.pricePerCall,
        network: GOAT_NETWORK,
        stakeAmount: this.config.stakeAmount,
      });
    });

    // x402-style payment gate: return 402 if no payment header
    this.app.post(this.config.serviceEndpoint, async (req: Request, res: Response) => {
      // Check for x402 payment signature
      const paymentSig = req.headers["payment-signature"] || req.headers["x-payment"];

      if (!paymentSig) {
        // Return 402 with payment requirements
        const paymentRequired = {
          x402Version: 2,
          error: "Payment required",
          accepts: [{
            scheme: "exact",
            network: GOAT_NETWORK,
            amount: this.config.pricePerCall,
            asset: MOCK_USDC_ADDRESS,
            payTo: this.wallet.address,
            maxTimeoutSeconds: 300,
          }],
          resource: {
            url: `http://localhost:${this.config.port}${this.config.serviceEndpoint}`,
            description: this.config.description,
          },
        };

        res.status(402).json(paymentRequired);
        return;
      }

      // Payment provided -- execute service
      this.requestCount++;
      this.earnings += BigInt(this.config.pricePerCall);
      console.log(`[${this.config.name}] Request #${this.requestCount} - Payment received`);

      try {
        await handler(req, res);
      } catch (error: any) {
        console.error(`[${this.config.name}] Service error:`, error.message);
        res.status(500).json({ error: "Service execution failed" });
      }
    });
  }
}
