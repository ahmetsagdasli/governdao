import { useAccount, useReadContract } from "wagmi";
import { TOKEN_ADDRESS, tokenAbi } from "../config/contracts";

export function useVotingPower() {
  const { address } = useAccount();

  const { data, isLoading, refetch } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: tokenAbi,
    functionName: "getVotes",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  return {
    votingPower: data,
    isLoading,
    refetch,
  };
}
