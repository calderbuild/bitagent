import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "BTC");

  // 1. Deploy MockUSDC
  console.log("\n--- Deploying MockUSDC ---");
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy();
  await usdc.waitForDeployment();
  console.log("MockUSDC:", await usdc.getAddress());

  // Mint test tokens to deployer (1,000,000 USDC)
  const mintAmount = ethers.parseUnits("1000000", 6);
  await usdc.mint(deployer.address, mintAmount);
  console.log("Minted 1,000,000 USDC to deployer");

  // 2. Deploy StakingVault
  console.log("\n--- Deploying StakingVault ---");
  const StakingVault = await ethers.getContractFactory("StakingVault");
  const vault = await StakingVault.deploy(deployer.address); // deployer = slash oracle
  await vault.waitForDeployment();
  console.log("StakingVault:", await vault.getAddress());

  // Set cooldown to 0 for testnet demo
  await vault.setCooldownPeriod(0);
  console.log("Cooldown set to 0 for demo");

  // Set minimum stake to 0.0001 BTC for testnet
  await vault.setMinimumStake(ethers.parseEther("0.0001"));
  console.log("Minimum stake set to 0.0001 BTC");

  // Summary
  console.log("\n=== Deployment Summary ===");
  console.log("MockUSDC:", await usdc.getAddress());
  console.log("StakingVault:", await vault.getAddress());
  console.log("\nUpdate .env with these addresses.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
