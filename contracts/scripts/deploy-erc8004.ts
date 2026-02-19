import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying ERC-8004 with:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "BTC");

  // 1. Deploy IdentityRegistryUpgradeable implementation
  console.log("\n--- Deploying IdentityRegistry ---");
  const IdentityImpl = await ethers.getContractFactory("IdentityRegistryUpgradeable");
  const identityImpl = await IdentityImpl.deploy();
  await identityImpl.waitForDeployment();
  const identityImplAddr = await identityImpl.getAddress();
  console.log("IdentityRegistry impl:", identityImplAddr);

  // Deploy ERC1967 proxy for Identity
  const identityInitData = IdentityImpl.interface.encodeFunctionData("initialize");
  const ERC1967Proxy = await ethers.getContractFactory("contracts/ERC1967Proxy.sol:ERC1967Proxy");
  const identityProxy = await ERC1967Proxy.deploy(identityImplAddr, identityInitData);
  await identityProxy.waitForDeployment();
  const identityProxyAddr = await identityProxy.getAddress();
  console.log("IdentityRegistry proxy:", identityProxyAddr);

  // Verify identity works
  const identity = IdentityImpl.attach(identityProxyAddr);
  const version = await identity.getVersion();
  console.log("IdentityRegistry version:", version);

  // 2. Deploy ReputationRegistryUpgradeable implementation
  console.log("\n--- Deploying ReputationRegistry ---");
  const RepImpl = await ethers.getContractFactory("ReputationRegistryUpgradeable");
  const repImpl = await RepImpl.deploy();
  await repImpl.waitForDeployment();
  const repImplAddr = await repImpl.getAddress();
  console.log("ReputationRegistry impl:", repImplAddr);

  // Deploy ERC1967 proxy for Reputation (needs identity address)
  const repInitData = RepImpl.interface.encodeFunctionData("initialize", [identityProxyAddr]);
  const repProxy = await ERC1967Proxy.deploy(repImplAddr, repInitData);
  await repProxy.waitForDeployment();
  const repProxyAddr = await repProxy.getAddress();
  console.log("ReputationRegistry proxy:", repProxyAddr);

  // Verify reputation works
  const rep = RepImpl.attach(repProxyAddr);
  const repVersion = await rep.getVersion();
  const linkedIdentity = await rep.getIdentityRegistry();
  console.log("ReputationRegistry version:", repVersion);
  console.log("Linked IdentityRegistry:", linkedIdentity);

  // 3. Verification: register an agent and give feedback
  console.log("\n--- Verification ---");
  const tx = await identity.getFunction("register(string)").send("https://bitagent.dev/agents/test");
  const receipt = await tx.wait();
  // Find agentId from Transfer event (ERC721 mint)
  const transferLog = receipt?.logs.find(
    (log: any) => log.topics[0] === ethers.id("Transfer(address,address,uint256)")
  );
  const agentId = transferLog ? BigInt(transferLog.topics[3]) : 0n;
  console.log("Registered test agent, ID:", agentId.toString());

  const uri = await identity.tokenURI(agentId);
  console.log("Agent URI:", uri);

  const wallet = await identity.getAgentWallet(agentId);
  console.log("Agent wallet:", wallet);

  // Summary
  console.log("\n=== ERC-8004 Deployment Summary ===");
  console.log("IdentityRegistry (proxy):", identityProxyAddr);
  console.log("ReputationRegistry (proxy):", repProxyAddr);
  console.log("IdentityRegistry (impl):", identityImplAddr);
  console.log("ReputationRegistry (impl):", repImplAddr);
  console.log("\nUpdate .env:");
  console.log(`IDENTITY_REGISTRY_ADDRESS=${identityProxyAddr}`);
  console.log(`REPUTATION_REGISTRY_ADDRESS=${repProxyAddr}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
