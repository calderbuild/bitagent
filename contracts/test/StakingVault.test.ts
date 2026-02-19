import { expect } from "chai";
import { ethers } from "hardhat";
import { StakingVault } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("StakingVault", function () {
  let vault: StakingVault;
  let admin: SignerWithAddress;
  let agent1Owner: SignerWithAddress;
  let other: SignerWithAddress;
  const AGENT_ID = 1n;
  const STAKE_AMOUNT = ethers.parseEther("0.01"); // 0.01 BTC

  beforeEach(async function () {
    [admin, agent1Owner, other] = await ethers.getSigners();
    const StakingVault = await ethers.getContractFactory("StakingVault");
    vault = await StakingVault.deploy(admin.address);
    await vault.waitForDeployment();
    // Set minimum stake low for tests
    await vault.setMinimumStake(ethers.parseEther("0.0001"));
    // Set cooldown to 0 for tests
    await vault.setCooldownPeriod(0);
  });

  it("allows agent to stake BTC", async function () {
    await vault.connect(agent1Owner).stake(AGENT_ID, { value: STAKE_AMOUNT });
    const effective = await vault.effectiveStake(AGENT_ID);
    expect(effective).to.equal(STAKE_AMOUNT);
  });

  it("records stake owner on first stake", async function () {
    await vault.connect(agent1Owner).stake(AGENT_ID, { value: STAKE_AMOUNT });
    const info = await vault.getStakeInfo(AGENT_ID);
    expect(info.owner).to.equal(agent1Owner.address);
    expect(info.active).to.be.true;
  });

  it("allows additional staking by same owner", async function () {
    await vault.connect(agent1Owner).stake(AGENT_ID, { value: STAKE_AMOUNT });
    await vault.connect(agent1Owner).stake(AGENT_ID, { value: STAKE_AMOUNT });
    expect(await vault.effectiveStake(AGENT_ID)).to.equal(STAKE_AMOUNT * 2n);
  });

  it("rejects staking by non-owner for existing agent", async function () {
    await vault.connect(agent1Owner).stake(AGENT_ID, { value: STAKE_AMOUNT });
    await expect(
      vault.connect(other).stake(AGENT_ID, { value: STAKE_AMOUNT })
    ).to.be.revertedWith("Not stake owner");
  });

  it("rejects below minimum stake", async function () {
    await expect(
      vault.connect(agent1Owner).stake(AGENT_ID, { value: 100n })
    ).to.be.revertedWith("Below minimum stake");
  });

  describe("slash", function () {
    beforeEach(async function () {
      await vault.connect(agent1Owner).stake(AGENT_ID, { value: STAKE_AMOUNT });
    });

    it("oracle can slash agent", async function () {
      const slashAmount = ethers.parseEther("0.003");
      await vault.connect(admin).slash(AGENT_ID, slashAmount, "poor service");
      const effective = await vault.effectiveStake(AGENT_ID);
      expect(effective).to.equal(STAKE_AMOUNT - slashAmount);
    });

    it("slash capped at effective stake", async function () {
      const hugeSlash = ethers.parseEther("100");
      await vault.connect(admin).slash(AGENT_ID, hugeSlash, "total slash");
      expect(await vault.effectiveStake(AGENT_ID)).to.equal(0n);
    });

    it("non-oracle cannot slash", async function () {
      await expect(
        vault.connect(other).slash(AGENT_ID, 1000n, "attack")
      ).to.be.revertedWith("Only oracle can slash");
    });
  });

  describe("unstake", function () {
    beforeEach(async function () {
      await vault.connect(agent1Owner).stake(AGENT_ID, { value: STAKE_AMOUNT });
    });

    it("owner can unstake after cooldown", async function () {
      const balanceBefore = await ethers.provider.getBalance(agent1Owner.address);
      const tx = await vault.connect(agent1Owner).unstake(AGENT_ID);
      const receipt = await tx.wait();
      const gasCost = receipt!.gasUsed * receipt!.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(agent1Owner.address);
      expect(balanceAfter + gasCost - balanceBefore).to.equal(STAKE_AMOUNT);
    });

    it("unstake returns correct amount after slash", async function () {
      const slashAmount = ethers.parseEther("0.003");
      await vault.connect(admin).slash(AGENT_ID, slashAmount, "slash");
      const balanceBefore = await ethers.provider.getBalance(agent1Owner.address);
      const tx = await vault.connect(agent1Owner).unstake(AGENT_ID);
      const receipt = await tx.wait();
      const gasCost = receipt!.gasUsed * receipt!.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(agent1Owner.address);
      expect(balanceAfter + gasCost - balanceBefore).to.equal(STAKE_AMOUNT - slashAmount);
    });

    it("non-owner cannot unstake", async function () {
      await expect(
        vault.connect(other).unstake(AGENT_ID)
      ).to.be.revertedWith("Not stake owner");
    });
  });
});
