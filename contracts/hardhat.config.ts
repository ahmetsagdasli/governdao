import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const {
  SEPOLIA_RPC_URL,
  PRIVATE_KEY,
  ETHERSCAN_API_KEY,
  LOCALHOST_RPC_URL,
} = process.env;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "paris",
    },
  },
  networks: {
    localhost: {
      url: LOCALHOST_RPC_URL || "http://127.0.0.1:8545",
    },
    sepolia: {
      url: SEPOLIA_RPC_URL || "",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY || "",
  },
};

export default config;
