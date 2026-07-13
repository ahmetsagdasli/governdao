import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { hardhat, sepolia } from "wagmi/chains";

const chains =
  import.meta.env.VITE_CHAIN_ID === "31337"
    ? ([hardhat, sepolia] as const)
    : ([sepolia, hardhat] as const);

// LOCAL DEV ONLY: `hardhat` is included so this can be smoke-tested against a
// local node. Remove it and keep `[sepolia]` for the real deployment.
export const wagmiConfig = getDefaultConfig({
  appName: "GovernDAO",
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
  chains,
  ssr: false,
});
