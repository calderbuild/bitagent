import { expect } from "chai";
import { ethers } from "hardhat";
import { MockUSDC } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("MockUSDC", function () {
  let usdc: MockUSDC;
  let deployer: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;

  beforeEach(async function () {
    [deployer, alice, bob] = await ethers.getSigners();
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();
  });

  it("has correct name, symbol, decimals", async function () {
    expect(await usdc.name()).to.equal("USD Coin");
    expect(await usdc.symbol()).to.equal("USDC");
    expect(await usdc.decimals()).to.equal(6);
  });

  it("allows anyone to mint (testnet)", async function () {
    await usdc.mint(alice.address, 1000000n);
    expect(await usdc.balanceOf(alice.address)).to.equal(1000000n);
  });

  describe("transferWithAuthorization (EIP-3009)", function () {
    const amount = 500000n; // 0.5 USDC

    beforeEach(async function () {
      await usdc.mint(alice.address, 1000000n);
    });

    it("executes transfer with valid authorization", async function () {
      const nonce = ethers.randomBytes(32);
      const validAfter = 0n;
      const validBefore = BigInt(Math.floor(Date.now() / 1000) + 3600);

      const domain = {
        name: "USD Coin",
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await usdc.getAddress(),
      };

      const types = {
        TransferWithAuthorization: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
          { name: "validAfter", type: "uint256" },
          { name: "validBefore", type: "uint256" },
          { name: "nonce", type: "bytes32" },
        ],
      };

      const message = {
        from: alice.address,
        to: bob.address,
        value: amount,
        validAfter,
        validBefore,
        nonce: ethers.hexlify(nonce),
      };

      const signature = await alice.signTypedData(domain, types, message);
      const { v, r, s } = ethers.Signature.from(signature);

      await usdc.transferWithAuthorization(
        alice.address, bob.address, amount,
        validAfter, validBefore, ethers.hexlify(nonce),
        v, r, s
      );

      expect(await usdc.balanceOf(bob.address)).to.equal(amount);
      expect(await usdc.balanceOf(alice.address)).to.equal(1000000n - amount);
    });

    it("rejects expired authorization", async function () {
      const nonce = ethers.randomBytes(32);
      const validAfter = 0n;
      const validBefore = 1n; // already expired

      const domain = {
        name: "USD Coin",
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await usdc.getAddress(),
      };

      const types = {
        TransferWithAuthorization: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
          { name: "validAfter", type: "uint256" },
          { name: "validBefore", type: "uint256" },
          { name: "nonce", type: "bytes32" },
        ],
      };

      const message = {
        from: alice.address, to: bob.address, value: amount,
        validAfter, validBefore, nonce: ethers.hexlify(nonce),
      };

      const signature = await alice.signTypedData(domain, types, message);
      const { v, r, s } = ethers.Signature.from(signature);

      await expect(
        usdc.transferWithAuthorization(
          alice.address, bob.address, amount,
          validAfter, validBefore, ethers.hexlify(nonce),
          v, r, s
        )
      ).to.be.revertedWith("Authorization expired");
    });

    it("rejects reused nonce", async function () {
      const nonce = ethers.randomBytes(32);
      const validAfter = 0n;
      const validBefore = BigInt(Math.floor(Date.now() / 1000) + 3600);

      const domain = {
        name: "USD Coin",
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await usdc.getAddress(),
      };

      const types = {
        TransferWithAuthorization: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
          { name: "validAfter", type: "uint256" },
          { name: "validBefore", type: "uint256" },
          { name: "nonce", type: "bytes32" },
        ],
      };

      const message = {
        from: alice.address, to: bob.address, value: amount,
        validAfter, validBefore, nonce: ethers.hexlify(nonce),
      };

      const signature = await alice.signTypedData(domain, types, message);
      const { v, r, s } = ethers.Signature.from(signature);

      // First call succeeds
      await usdc.transferWithAuthorization(
        alice.address, bob.address, amount,
        validAfter, validBefore, ethers.hexlify(nonce),
        v, r, s
      );

      // Second call with same nonce fails
      await expect(
        usdc.transferWithAuthorization(
          alice.address, bob.address, amount,
          validAfter, validBefore, ethers.hexlify(nonce),
          v, r, s
        )
      ).to.be.revertedWith("Authorization already used");
    });
  });

  it("exposes DOMAIN_SEPARATOR", async function () {
    const ds = await usdc.DOMAIN_SEPARATOR();
    expect(ds).to.not.equal(ethers.ZeroHash);
  });
});
