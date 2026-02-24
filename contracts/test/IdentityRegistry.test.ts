import { expect } from "chai";
import { ethers } from "hardhat";
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("IdentityRegistryUpgradeable", function () {
  let identity: Awaited<ReturnType<typeof deployProxy>>;
  let owner: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;

  async function deployProxy() {
    const Impl = await ethers.getContractFactory("IdentityRegistryUpgradeable");
    const impl = await Impl.deploy();
    await impl.waitForDeployment();

    const initData = Impl.interface.encodeFunctionData("initialize");
    const Proxy = await ethers.getContractFactory("contracts/ERC1967Proxy.sol:ERC1967Proxy");
    const proxy = await Proxy.deploy(await impl.getAddress(), initData);
    await proxy.waitForDeployment();

    return Impl.attach(await proxy.getAddress()) as Awaited<ReturnType<typeof Impl.deploy>>;
  }

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();
    identity = await deployProxy();
  });

  describe("registration", function () {
    it("registers agent with auto-increment ID starting at 0", async function () {
      const tx = await identity.connect(alice).getFunction("register()")();
      const receipt = await tx.wait();
      const transferLog = receipt?.logs.find(
        (log: { topics: string[] }) => log.topics[0] === ethers.id("Transfer(address,address,uint256)"),
      );
      const agentId = transferLog ? BigInt(transferLog.topics[3]) : -1n;
      expect(agentId).to.equal(0n);
    });

    it("registers with URI", async function () {
      await identity.connect(alice).getFunction("register(string)")("https://agent.dev/0");
      const uri = await identity.tokenURI(0);
      expect(uri).to.equal("https://agent.dev/0");
    });

    it("registers with URI and metadata", async function () {
      const metadata = [{ metadataKey: "serviceType", metadataValue: ethers.toUtf8Bytes("audit") }];
      await identity.connect(alice).getFunction("register(string,(string,bytes)[])")("https://agent.dev/0", metadata);
      const stored = await identity.getMetadata(0, "serviceType");
      expect(ethers.toUtf8String(stored)).to.equal("audit");
    });

    it("sets agentWallet to caller on register", async function () {
      await identity.connect(alice).getFunction("register()")();
      const wallet = await identity.getAgentWallet(0);
      expect(wallet).to.equal(alice.address);
    });

    it("increments IDs for multiple registrations", async function () {
      await identity.connect(alice).getFunction("register()")();
      await identity.connect(bob).getFunction("register()")();
      expect(await identity.ownerOf(0)).to.equal(alice.address);
      expect(await identity.ownerOf(1)).to.equal(bob.address);
    });

    it("rejects reserved 'agentWallet' key in metadata", async function () {
      const metadata = [{ metadataKey: "agentWallet", metadataValue: ethers.toUtf8Bytes("bad") }];
      await expect(
        identity.connect(alice).getFunction("register(string,(string,bytes)[])")("uri", metadata),
      ).to.be.revertedWith("reserved key");
    });
  });

  describe("setAgentURI", function () {
    beforeEach(async function () {
      await identity.connect(alice).getFunction("register(string)")("https://old.uri");
    });

    it("owner can update URI", async function () {
      await identity.connect(alice).setAgentURI(0, "https://new.uri");
      expect(await identity.tokenURI(0)).to.equal("https://new.uri");
    });

    it("non-owner cannot update URI", async function () {
      await expect(
        identity.connect(bob).setAgentURI(0, "https://hack"),
      ).to.be.revertedWith("Not authorized");
    });
  });

  describe("metadata", function () {
    beforeEach(async function () {
      await identity.connect(alice).getFunction("register()")();
    });

    it("owner can set and read metadata", async function () {
      await identity.connect(alice).setMetadata(0, "endpoint", ethers.toUtf8Bytes("/api/audit"));
      const result = await identity.getMetadata(0, "endpoint");
      expect(ethers.toUtf8String(result)).to.equal("/api/audit");
    });

    it("rejects setting reserved 'agentWallet' key", async function () {
      await expect(
        identity.connect(alice).setMetadata(0, "agentWallet", ethers.toUtf8Bytes("bad")),
      ).to.be.revertedWith("reserved key");
    });

    it("non-owner cannot set metadata", async function () {
      await expect(
        identity.connect(bob).setMetadata(0, "endpoint", ethers.toUtf8Bytes("x")),
      ).to.be.revertedWith("Not authorized");
    });
  });

  describe("transfer resets wallet", function () {
    beforeEach(async function () {
      await identity.connect(alice).getFunction("register()")();
    });

    it("clears agentWallet on transfer", async function () {
      expect(await identity.getAgentWallet(0)).to.equal(alice.address);
      await identity.connect(alice).transferFrom(alice.address, bob.address, 0);
      expect(await identity.ownerOf(0)).to.equal(bob.address);
      expect(await identity.getAgentWallet(0)).to.equal(ethers.ZeroAddress);
    });
  });

  describe("ownerOf", function () {
    it("returns correct owner", async function () {
      await identity.connect(alice).getFunction("register()")();
      expect(await identity.ownerOf(0)).to.equal(alice.address);
    });

    it("reverts for non-existent token", async function () {
      await expect(identity.ownerOf(999)).to.be.reverted;
    });
  });

  describe("UUPS upgrade", function () {
    it("owner can upgrade implementation", async function () {
      const NewImpl = await ethers.getContractFactory("IdentityRegistryUpgradeable");
      const newImpl = await NewImpl.deploy();
      await newImpl.waitForDeployment();

      // Register an agent before upgrade
      await identity.connect(alice).getFunction("register(string)")("https://before-upgrade");

      // Upgrade
      await identity.connect(owner).upgradeToAndCall(await newImpl.getAddress(), "0x");

      // State preserved
      expect(await identity.ownerOf(0)).to.equal(alice.address);
      expect(await identity.tokenURI(0)).to.equal("https://before-upgrade");
      expect(await identity.getVersion()).to.equal("2.0.0");
    });

    it("non-owner cannot upgrade", async function () {
      const NewImpl = await ethers.getContractFactory("IdentityRegistryUpgradeable");
      const newImpl = await NewImpl.deploy();
      await newImpl.waitForDeployment();

      await expect(
        identity.connect(alice).upgradeToAndCall(await newImpl.getAddress(), "0x"),
      ).to.be.reverted;
    });
  });
});
