import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Upgrading with:", deployer.address);

  const PROXY_ADDRESS = process.env.REPUTATION_REGISTRY_ADDRESS;
  if (!PROXY_ADDRESS) {
    throw new Error("REPUTATION_REGISTRY_ADDRESS not set");
  }

  // Deploy new implementation
  const Factory = await ethers.getContractFactory("ReputationRegistryUpgradeable");
  const newImpl = await Factory.deploy();
  await newImpl.waitForDeployment();
  const implAddress = await newImpl.getAddress();
  console.log("New implementation:", implAddress);

  // Upgrade proxy via UUPS
  const proxy = await ethers.getContractAt("ReputationRegistryUpgradeable", PROXY_ADDRESS);
  const tx = await proxy.upgradeToAndCall(implAddress, "0x");
  await tx.wait();
  console.log("Upgraded! TX:", tx.hash);

  // Verify version
  const version = await proxy.getVersion();
  console.log("Version:", version);
}

main().catch(console.error);
