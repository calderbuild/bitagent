import { ethers } from "hardhat";

async function main() {
  const vault = await ethers.getContractAt("StakingVault", "0xF1A94cab9681dBC28d3D4F21a9Ce58787920546B");
  const currentMin = await vault.minimumStake();
  console.log("Current minimumStake:", ethers.formatEther(currentMin), "BTC");

  const tx = await vault.setMinimumStake(ethers.parseEther("0.000001"));
  await tx.wait();
  const newMin = await vault.minimumStake();
  console.log("New minimumStake:", ethers.formatEther(newMin), "BTC");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
