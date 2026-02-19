import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    goatTestnet3: {
      url: "https://rpc.testnet3.goat.network",
      chainId: 48816,
      accounts: [PRIVATE_KEY],
    },
    hardhat: {
      chainId: 48816,
    },
  },
};

export default config;
