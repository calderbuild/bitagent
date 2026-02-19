import express from "express";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { defineChain } from "viem";
import { x402Facilitator } from "@x402/core/facilitator";
import { ExactEvmScheme } from "@x402/evm/exact/facilitator";
import { toFacilitatorEvmSigner } from "@x402/evm";
import { GOAT_RPC, GOAT_CHAIN_ID } from "../core/config.js";

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
  app.use(express.json());

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
