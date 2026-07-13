import { useReadContracts } from "wagmi";
import { GOVERNOR_ADDRESS, governorAbi } from "../config/contracts";

export function useProposalState(proposalId: string) {
  const { data, isLoading, refetch } = useReadContracts({
    contracts: [
      {
        address: GOVERNOR_ADDRESS,
        abi: governorAbi,
        functionName: "state",
        args: [BigInt(proposalId)],
      },
      {
        address: GOVERNOR_ADDRESS,
        abi: governorAbi,
        functionName: "proposalVotes",
        args: [BigInt(proposalId)],
      },
      {
        address: GOVERNOR_ADDRESS,
        abi: governorAbi,
        functionName: "proposalSnapshot",
        args: [BigInt(proposalId)],
      },
      {
        address: GOVERNOR_ADDRESS,
        abi: governorAbi,
        functionName: "proposalDeadline",
        args: [BigInt(proposalId)],
      },
    ],
    query: {
      refetchInterval: 15_000,
      refetchOnWindowFocus: true,
    },
  });

  const stateResult = data?.[0]?.result;
  const votesResult = data?.[1]?.result;
  const snapshotResult = data?.[2]?.result;
  const deadlineResult = data?.[3]?.result;

  return {
    state: stateResult,
    againstVotes: votesResult?.[0],
    forVotes: votesResult?.[1],
    abstainVotes: votesResult?.[2],
    snapshot: snapshotResult,
    deadline: deadlineResult,
    isLoading,
    refetch,
  };
}
