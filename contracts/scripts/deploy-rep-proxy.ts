import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const nonce = await ethers.provider.getTransactionCount(deployer.address);
  console.log("Deployer:", deployer.address, "nonce:", nonce);

  const IDENTITY_PROXY = "0x75ED93F08c4CFd9aaF93C5693Ff996d8D8A6CA61";
  const REP_IMPL = "0x36DaA768a3F78E59e6D4C04412a1388322739e72";

  // Deploy ERC1967 proxy for Reputation
  const RepImpl = await ethers.getContractFactory("ReputationRegistryUpgradeable");
  const repInitData = RepImpl.interface.encodeFunctionData("initialize", [IDENTITY_PROXY]);

  const ERC1967Proxy = await ethers.getContractFactory("contracts/ERC1967Proxy.sol:ERC1967Proxy");
  console.log("Deploying ReputationRegistry proxy (nonce:", nonce, ")...");
  const repProxy = await ERC1967Proxy.deploy(REP_IMPL, repInitData, { nonce });
  await repProxy.waitForDeployment();
  const repProxyAddr = await repProxy.getAddress();
  console.log("ReputationRegistry proxy:", repProxyAddr);

  // Verify
  const rep = RepImpl.attach(repProxyAddr);
  try {
    const linked = await rep.getIdentityRegistry();
    console.log("Linked IdentityRegistry:", linked);
  } catch {
    console.log("getIdentityRegistry() not available");
  }

  // Also verify identity
  console.log("\n=== Deployment Summary ===");
  console.log("IdentityRegistry (proxy):", IDENTITY_PROXY);
  console.log("ReputationRegistry (proxy):", repProxyAddr);
  console.log("\nUpdate .env:");
  console.log(`IDENTITY_REGISTRY_ADDRESS=${IDENTITY_PROXY}`);
  console.log(`REPUTATION_REGISTRY_ADDRESS=${repProxyAddr}`);

  // Quick verification: register a test agent
  const IdentityImpl = await ethers.getContractFactory("IdentityRegistryUpgradeable");
  const identity = IdentityImpl.attach(IDENTITY_PROXY);
  const tx = await identity.getFunction("register(string)").send("https://bitagent.dev/agents/test");
  const receipt = await tx.wait();
  const transferLog = receipt?.logs.find(
    (log: any) => log.topics[0] === ethers.id("Transfer(address,address,uint256)")
  );
  const agentId = transferLog ? BigInt(transferLog.topics[3]) : 0n;
  console.log("Registered test agent, ID:", agentId.toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
