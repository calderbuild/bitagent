import { ethers } from "hardhat";

async function main() {
  const vault = await ethers.getContractAt("StakingVault", "0xF1A94cab9681dBC28d3D4F21a9Ce58787920546B");

  for (let i = 0; i <= 5; i++) {
    try {
      const info = await vault.getStakeInfo(i);
      const effective = await vault.effectiveStake(i);
      console.log(`Agent ${i}: amount=${ethers.formatEther(info[0])}, slashed=${ethers.formatEther(info[2])}, effective=${ethers.formatEther(effective)}, owner=${info[3]}, active=${info[4]}`);
    } catch (e: any) {
      console.log(`Agent ${i}: no stake`);
    }
  }
}

main().catch(console.error);
