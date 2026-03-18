import { ethers } from "hardhat";

async function main() {
  const vault = await ethers.getContractAt("StakingVault", process.env.STAKING_VAULT_ADDRESS || "0x975bD215C549F315A066306B161119cec480c927");
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
