import { useReadContracts } from "wagmi";
import { GOVERNOR_ADDRESS, governorAbi } from "../config/contracts";

export interface ProposalVoteTally {
  proposalId: string;
  forVotes: bigint;
  againstVotes: bigint;
  abstainVotes: bigint;
  total: bigint;
}

export function useProposalsVotes(proposalIds: string[]) {
  const { data, isLoading } = useReadContracts({
    contracts: proposalIds.map((proposalId) => ({
      address: GOVERNOR_ADDRESS,
      abi: governorAbi,
      functionName: "proposalVotes",
      args: [BigInt(proposalId)],
    })),
    query: {
      enabled: proposalIds.length > 0,
      refetchInterval: 15_000,
      refetchOnWindowFocus: true,
    },
  });

  const tallies: ProposalVoteTally[] = proposalIds.map((proposalId, index) => {
    const result = data?.[index]?.result;
    const againstVotes = result?.[0] ?? 0n;
    const forVotes = result?.[1] ?? 0n;
    const abstainVotes = result?.[2] ?? 0n;

    return {
      proposalId,
      forVotes,
      againstVotes,
      abstainVotes,
      total: forVotes + againstVotes + abstainVotes,
    };
  });

  return { tallies, isLoading };
}
