import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  usePublicClient,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { keccak256, toBytes, type Address, type Hex } from "viem";
import { GOVERNOR_ADDRESS, governorAbi } from "../config/contracts";
import { supabase, type VoteRow } from "../lib/supabase";
import {
  fetchProposalEvents,
  fetchVoteEvents,
  shouldReadGovernanceEvents,
} from "../lib/governanceEvents";
import { useProposalState } from "../hooks/useProposalState";
import { ProposalStateBadge } from "../components/ProposalStateBadge";
import { VoteBar } from "../components/VoteBar";
import { VotePanel } from "../components/VotePanel";
import { TxButton } from "../components/TxButton";

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function useProposal(proposalId: string | undefined) {
  const publicClient = usePublicClient();

  return useQuery({
    queryKey: ["proposal", proposalId, publicClient?.chain?.id],
    queryFn: async () => {
      const readEvents = shouldReadGovernanceEvents(publicClient);
      if (readEvents && publicClient && proposalId) {
        const proposal = (await fetchProposalEvents(publicClient)).find(
          (row) => row.proposal_id === proposalId
        );
        if (proposal) return proposal;
      }

      let cacheRow = null;

      try {
        const { data, error } = await supabase
          .from("proposals")
          .select("*")
          .eq("proposal_id", proposalId)
          .maybeSingle();

        if (error) throw error;
        cacheRow = data;
      } catch (error) {
        if (!readEvents) throw error;
      }

      if (cacheRow) return cacheRow;

      throw new Error("Proposal not found");
    },
    enabled: Boolean(proposalId),
  });
}

function useVotes(proposalId: string | undefined) {
  const publicClient = usePublicClient();

  return useQuery({
    queryKey: ["votes", proposalId, publicClient?.chain?.id],
    queryFn: async (): Promise<VoteRow[]> => {
      const readEvents = shouldReadGovernanceEvents(publicClient);
      if (readEvents && publicClient && proposalId) {
        return fetchVoteEvents(publicClient, proposalId);
      }

      let cacheRows: VoteRow[] = [];

      try {
        const { data, error } = await supabase
          .from("votes_cache")
          .select("*")
          .eq("proposal_id", proposalId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        cacheRows = data ?? [];
      } catch (error) {
        if (!readEvents) throw error;
      }

      return cacheRows;
    },
    enabled: Boolean(proposalId),
  });
}

const SUPPORT_LABEL: Record<number, string> = {
  0: "Against",
  1: "For",
  2: "Abstain",
};

export function ProposalDetail() {
  const { proposalId } = useParams<{ proposalId: string }>();
  const queryClient = useQueryClient();
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const interval = setInterval(
      () => setNow(Math.floor(Date.now() / 1000)),
      5000
    );
    return () => clearInterval(interval);
  }, []);

  const { data: proposal, isLoading: proposalLoading } =
    useProposal(proposalId);
  const { data: votes } = useVotes(proposalId);
  const {
    state,
    forVotes,
    againstVotes,
    abstainVotes,
    snapshot,
    deadline,
    refetch,
  } = useProposalState(proposalId ?? "0");

  const { data: eta } = useReadContract({
    address: GOVERNOR_ADDRESS,
    abi: governorAbi,
    functionName: "proposalEta",
    args: proposalId ? [BigInt(proposalId)] : undefined,
    query: { enabled: Boolean(proposalId) && state === 5 },
  });

  const {
    writeContract: writeQueue,
    data: queueHash,
    isPending: queuePending,
    error: queueError,
  } = useWriteContract();
  const { isLoading: queueConfirming, isSuccess: queueSuccess } =
    useWaitForTransactionReceipt({ hash: queueHash });

  const {
    writeContract: writeExecute,
    data: executeHash,
    isPending: executePending,
    error: executeError,
  } = useWriteContract();
  const { isLoading: executeConfirming, isSuccess: executeSuccess } =
    useWaitForTransactionReceipt({ hash: executeHash });

  useEffect(() => {
    if (queueSuccess || executeSuccess) {
      refetch();
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
    }
  }, [queueSuccess, executeSuccess, refetch, queryClient]);

  if (proposalLoading || !proposal) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-1/2 rounded bg-surface2 animate-pulse" />
        <div className="h-40 rounded-2xl bg-surface2 animate-pulse" />
      </div>
    );
  }

  const targets = proposal.targets as Address[];
  const values = (proposal.values as string[]).map((v) => BigInt(v));
  const calldatas = proposal.calldatas as Hex[];
  const descriptionHash = keccak256(toBytes(proposal.description));

  const handleQueue = () => {
    writeQueue({
      address: GOVERNOR_ADDRESS,
      abi: governorAbi,
      functionName: "queue",
      args: [targets, values, calldatas, descriptionHash],
    });
  };

  const handleExecute = () => {
    writeExecute({
      address: GOVERNOR_ADDRESS,
      abi: governorAbi,
      functionName: "execute",
      args: [targets, values, calldatas, descriptionHash],
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <ProposalStateBadge state={state} />
          <span className="text-sm text-muted">
            Proposed by {truncateAddress(proposal.proposer)}
          </span>
        </div>
        <h1 className="font-display text-3xl font-medium tracking-tight text-ink">
          {proposal.title}
        </h1>
      </div>

      <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
        <p className="whitespace-pre-wrap text-sm text-muted leading-relaxed">
          {proposal.description}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
          <p className="text-sm text-muted">Snapshot block</p>
          <p className="mt-1 text-ink">{snapshot?.toString() ?? "—"}</p>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
          <p className="text-sm text-muted">Deadline block</p>
          <p className="mt-1 text-ink">{deadline?.toString() ?? "—"}</p>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
        <h3 className="font-display text-lg font-medium text-ink mb-4">
          Votes
        </h3>
        <VoteBar
          forVotes={forVotes}
          againstVotes={againstVotes}
          abstainVotes={abstainVotes}
        />
      </div>

      <VotePanel
        proposalId={proposalId ?? "0"}
        state={state}
        snapshot={snapshot}
      />

      {state === 4 && (
        <TxButton
          label="Queue"
          onClick={handleQueue}
          isPending={queuePending}
          isConfirming={queueConfirming}
          isSuccess={queueSuccess}
          hash={queueHash}
          error={queueError}
        />
      )}

      {state === 5 && eta !== undefined && now >= Number(eta) && (
        <TxButton
          label="Execute"
          onClick={handleExecute}
          isPending={executePending}
          isConfirming={executeConfirming}
          isSuccess={executeSuccess}
          hash={executeHash}
          error={executeError}
        />
      )}

      {state === 5 && eta !== undefined && now < Number(eta) && (
        <p className="text-sm text-muted">
          Queued — executable after timelock delay elapses (
          {new Date(Number(eta) * 1000).toLocaleString()}).
        </p>
      )}

      <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
        <h3 className="font-display text-lg font-medium text-ink mb-4">
          Vote history
        </h3>
        {(!votes || votes.length === 0) && (
          <p className="text-sm text-muted">No votes cast yet.</p>
        )}
        <ul className="space-y-3">
          {votes?.map((vote) => (
            <li
              key={vote.id}
              className="flex items-start justify-between gap-4 text-sm"
            >
              <div>
                <span className="text-ink font-medium">
                  {truncateAddress(vote.voter)}
                </span>
                <span className="text-muted"> voted </span>
                <span className="text-ink font-medium">
                  {SUPPORT_LABEL[vote.support]}
                </span>
                {vote.reason && (
                  <p className="mt-1 text-muted">{vote.reason}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
