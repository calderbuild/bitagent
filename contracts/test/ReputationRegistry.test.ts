import { expect } from "chai";
import { ethers } from "hardhat";
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("ReputationRegistryUpgradeable", function () {
  let identity: Awaited<ReturnType<typeof deployIdentityProxy>>;
  let reputation: Awaited<ReturnType<typeof deployReputationProxy>>;
  let owner: SignerWithAddress;
  let alice: SignerWithAddress;
  let client1: SignerWithAddress;
  let client2: SignerWithAddress;

  async function deployIdentityProxy() {
    const Impl = await ethers.getContractFactory("IdentityRegistryUpgradeable");
    const impl = await Impl.deploy();
    await impl.waitForDeployment();
    const initData = Impl.interface.encodeFunctionData("initialize");
    const Proxy = await ethers.getContractFactory("contracts/ERC1967Proxy.sol:ERC1967Proxy");
    const proxy = await Proxy.deploy(await impl.getAddress(), initData);
    await proxy.waitForDeployment();
    return Impl.attach(await proxy.getAddress()) as Awaited<ReturnType<typeof Impl.deploy>>;
  }

  async function deployReputationProxy(identityAddr: string) {
    const Impl = await ethers.getContractFactory("ReputationRegistryUpgradeable");
    const impl = await Impl.deploy();
    await impl.waitForDeployment();
    const initData = Impl.interface.encodeFunctionData("initialize", [identityAddr]);
    const Proxy = await ethers.getContractFactory("contracts/ERC1967Proxy.sol:ERC1967Proxy");
    const proxy = await Proxy.deploy(await impl.getAddress(), initData);
    await proxy.waitForDeployment();
    return Impl.attach(await proxy.getAddress()) as Awaited<ReturnType<typeof Impl.deploy>>;
  }

  beforeEach(async function () {
    [owner, alice, client1, client2] = await ethers.getSigners();
    identity = await deployIdentityProxy();
    reputation = await deployReputationProxy(await identity.getAddress());

    // Register an agent for testing
    await identity.connect(alice).getFunction("register(string)")("https://agent.dev/0");
  });

  describe("initialization", function () {
    it("stores identity registry address", async function () {
      expect(await reputation.getIdentityRegistry()).to.equal(await identity.getAddress());
    });

    it("rejects zero address identity", async function () {
      const Impl = await ethers.getContractFactory("ReputationRegistryUpgradeable");
      const impl = await Impl.deploy();
      await impl.waitForDeployment();
      const initData = Impl.interface.encodeFunctionData("initialize", [ethers.ZeroAddress]);
      const Proxy = await ethers.getContractFactory("contracts/ERC1967Proxy.sol:ERC1967Proxy");
      await expect(
        Proxy.deploy(await impl.getAddress(), initData),
      ).to.be.reverted;
    });
  });

  describe("giveFeedback", function () {
    it("client can give positive feedback", async function () {
      await reputation.connect(client1).giveFeedback(0, 80, 0, "quality", "service", "/api/audit", "", ethers.ZeroHash);
      const lastIdx = await reputation.getLastIndex(0, client1.address);
      expect(lastIdx).to.equal(1);
    });

    it("tracks multiple feedbacks from same client", async function () {
      await reputation.connect(client1).giveFeedback(0, 80, 0, "quality", "", "/api/audit", "", ethers.ZeroHash);
      await reputation.connect(client1).giveFeedback(0, 90, 0, "speed", "", "/api/audit", "", ethers.ZeroHash);
      expect(await reputation.getLastIndex(0, client1.address)).to.equal(2);
    });

    it("rejects valueDecimals > 18", async function () {
      await expect(
        reputation.connect(client1).giveFeedback(0, 80, 19, "", "", "", "", ethers.ZeroHash),
      ).to.be.revertedWith("too many decimals");
    });

    it("rejects value exceeding MAX_ABS_VALUE", async function () {
      const tooLarge = BigInt("100000000000000000000000000000000000001"); // > 1e38
      await expect(
        reputation.connect(client1).giveFeedback(0, tooLarge, 0, "", "", "", "", ethers.ZeroHash),
      ).to.be.reverted;
    });

    it("allows negative feedback", async function () {
      await reputation.connect(client1).giveFeedback(0, -50, 0, "poor", "", "/api/audit", "", ethers.ZeroHash);
      const fb = await reputation.readFeedback(0, client1.address, 1);
      expect(fb.value).to.equal(-50);
    });
  });

  describe("readFeedback", function () {
    beforeEach(async function () {
      await reputation.connect(client1).giveFeedback(0, 85, 2, "quality", "fast", "/api/audit", "", ethers.ZeroHash);
    });

    it("returns correct feedback data", async function () {
      const fb = await reputation.readFeedback(0, client1.address, 1);
      expect(fb.value).to.equal(85);
      expect(fb.valueDecimals).to.equal(2);
      expect(fb.tag1).to.equal("quality");
      expect(fb.tag2).to.equal("fast");
      expect(fb.isRevoked).to.be.false;
    });

    it("reverts for index 0", async function () {
      await expect(
        reputation.readFeedback(0, client1.address, 0),
      ).to.be.revertedWith("index must be > 0");
    });

    it("reverts for out-of-bounds index", async function () {
      await expect(
        reputation.readFeedback(0, client1.address, 99),
      ).to.be.revertedWith("index out of bounds");
    });
  });

  describe("getSummary", function () {
    it("returns aggregate of all feedbacks", async function () {
      await reputation.connect(client1).giveFeedback(0, 80, 0, "", "", "", "", ethers.ZeroHash);
      await reputation.connect(client2).giveFeedback(0, 60, 0, "", "", "", "", ethers.ZeroHash);

      const summary = await reputation.getSummary(0, [client1.address, client2.address], "", "");
      expect(summary.count).to.equal(2);
      // Average: (80 + 60) / 2 = 70
      expect(summary.summaryValue).to.equal(70);
    });

    it("excludes revoked feedback", async function () {
      await reputation.connect(client1).giveFeedback(0, 80, 0, "", "", "", "", ethers.ZeroHash);
      await reputation.connect(client1).giveFeedback(0, 20, 0, "", "", "", "", ethers.ZeroHash);
      await reputation.connect(client1).revokeFeedback(0, 2); // Revoke the low score

      const summary = await reputation.getSummary(0, [client1.address], "", "");
      expect(summary.count).to.equal(1);
      expect(summary.summaryValue).to.equal(80);
    });

    it("filters by tag1", async function () {
      await reputation.connect(client1).giveFeedback(0, 90, 0, "quality", "", "", "", ethers.ZeroHash);
      await reputation.connect(client1).giveFeedback(0, 30, 0, "speed", "", "", "", ethers.ZeroHash);

      const summary = await reputation.getSummary(0, [client1.address], "quality", "");
      expect(summary.count).to.equal(1);
      expect(summary.summaryValue).to.equal(90);
    });

    it("reverts with empty clientAddresses", async function () {
      await expect(
        reputation.getSummary(0, [], "", ""),
      ).to.be.revertedWith("clientAddresses required");
    });

    it("returns zeros for agent with no feedback", async function () {
      const summary = await reputation.getSummary(0, [client1.address], "", "");
      expect(summary.count).to.equal(0);
      expect(summary.summaryValue).to.equal(0);
    });
  });

  describe("getClients", function () {
    it("returns empty array initially", async function () {
      const clients = await reputation.getClients(0);
      expect(clients).to.deep.equal([]);
    });

    it("tracks unique client addresses", async function () {
      await reputation.connect(client1).giveFeedback(0, 80, 0, "", "", "", "", ethers.ZeroHash);
      await reputation.connect(client2).giveFeedback(0, 70, 0, "", "", "", "", ethers.ZeroHash);
      await reputation.connect(client1).giveFeedback(0, 90, 0, "", "", "", "", ethers.ZeroHash); // duplicate client

      const clients = await reputation.getClients(0);
      expect(clients.length).to.equal(2);
    });
  });

  describe("revokeFeedback", function () {
    beforeEach(async function () {
      await reputation.connect(client1).giveFeedback(0, 80, 0, "", "", "", "", ethers.ZeroHash);
    });

    it("client can revoke own feedback", async function () {
      await reputation.connect(client1).revokeFeedback(0, 1);
      const fb = await reputation.readFeedback(0, client1.address, 1);
      expect(fb.isRevoked).to.be.true;
    });

    it("cannot revoke twice", async function () {
      await reputation.connect(client1).revokeFeedback(0, 1);
      await expect(
        reputation.connect(client1).revokeFeedback(0, 1),
      ).to.be.revertedWith("Already revoked");
    });

    it("cannot revoke index 0", async function () {
      await expect(
        reputation.connect(client1).revokeFeedback(0, 0),
      ).to.be.revertedWith("index must be > 0");
    });

    it("cannot revoke out-of-bounds index", async function () {
      await expect(
        reputation.connect(client1).revokeFeedback(0, 99),
      ).to.be.revertedWith("index out of bounds");
    });

    it("other client cannot revoke", async function () {
      await expect(
        reputation.connect(client2).revokeFeedback(0, 1),
      ).to.be.revertedWith("index out of bounds");
    });
  });

  describe("UUPS upgrade", function () {
    it("owner can upgrade and state persists", async function () {
      // Give feedback before upgrade
      await reputation.connect(client1).giveFeedback(0, 80, 0, "quality", "", "", "", ethers.ZeroHash);

      const NewImpl = await ethers.getContractFactory("ReputationRegistryUpgradeable");
      const newImpl = await NewImpl.deploy();
      await newImpl.waitForDeployment();

      await reputation.connect(owner).upgradeToAndCall(await newImpl.getAddress(), "0x");

      // State preserved
      expect(await reputation.getLastIndex(0, client1.address)).to.equal(1);
      expect(await reputation.getVersion()).to.equal("2.0.0");
    });

    it("non-owner cannot upgrade", async function () {
      const NewImpl = await ethers.getContractFactory("ReputationRegistryUpgradeable");
      const newImpl = await NewImpl.deploy();
      await newImpl.waitForDeployment();

      await expect(
        reputation.connect(alice).upgradeToAndCall(await newImpl.getAddress(), "0x"),
      ).to.be.reverted;
    });
  });
});
