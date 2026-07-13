import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { GOVERNOR_ADDRESS, governorAbi } from "../config/contracts";
import { supabase } from "../lib/supabase";
import { TxButton } from "./TxButton";

type Support = 0 | 1 | 2;

const SUPPORT_OPTIONS: { value: Support; label: string; classes: string }[] = [
  {
    value: 1,
    label: "For",
    classes: "bg-success/10 text-success border-success/20 hover:bg-success/20",
  },
  {
    value: 0,
    label: "Against",
    classes: "bg-danger/10 text-danger border-danger/20 hover:bg-danger/20",
  },
  {
    value: 2,
    label: "Abstain",
    classes: "bg-muted/10 text-muted border-muted/20 hover:bg-muted/20",
  },
];

interface VotePanelProps {
  proposalId: string;
  state: number | undefined;
  snapshot: bigint | undefined;
}

export function VotePanel({ proposalId, state, snapshot }: VotePanelProps) {
  const { address } = useAccount();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [selected, setSelected] = useState<Support | null>(null);

  const { data: hasVoted } = useReadContract({
    address: GOVERNOR_ADDRESS,
    abi: governorAbi,
    functionName: "hasVoted",
    args: address ? [BigInt(proposalId), address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const { data: pastVotingPower } = useReadContract({
    address: GOVERNOR_ADDRESS,
    abi: governorAbi,
    functionName: "getVotes",
    args: address && snapshot !== undefined ? [address, snapshot] : undefined,
    query: { enabled: Boolean(address) && snapshot !== undefined },
  });

  const {
    writeContract,
    data: hash,
    isPending,
    error,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  useEffect(() => {
    if (!isSuccess || !address || selected === null || !hash) return;

    supabase
      .from("votes_cache")
      .insert({
        proposal_id: proposalId,
        voter: address,
        support: selected,
        weight: (pastVotingPower ?? 0n).toString(),
        reason: reason.trim().length > 0 ? reason.trim() : null,
        tx_hash: hash,
      })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["votes", proposalId] });
      });
  }, [isSuccess, address, selected, hash, proposalId, reason, pastVotingPower, queryClient]);

  const isActive = state === 1;
  const hasPower = (pastVotingPower ?? 0n) > 0n;
  const canVote = Boolean(address) && isActive && hasPower && hasVoted === false;

  const disabledReason = !address
    ? "Connect your wallet to vote."
    : !isActive
      ? "Voting is not currently open for this proposal."
      : !hasPower
        ? "You had no voting power at the proposal snapshot."
        : hasVoted
          ? "You already voted on this proposal."
          : null;

  const castVote = (support: Support) => {
    setSelected(support);
    if (reason.trim().length > 0) {
      writeContract({
        address: GOVERNOR_ADDRESS,
        abi: governorAbi,
        functionName: "castVoteWithReason",
        args: [BigInt(proposalId), support, reason.trim()],
      });
    } else {
      writeContract({
        address: GOVERNOR_ADDRESS,
        abi: governorAbi,
        functionName: "castVote",
        args: [BigInt(proposalId), support],
      });
    }
  };

  return (
    <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
      <h3 className="font-display text-lg font-medium text-ink mb-4">
        Cast your vote
      </h3>

      {disabledReason && (
        <p className="text-sm text-muted mb-4">{disabledReason}</p>
      )}

      <textarea
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="Add a reason (optional)"
        disabled={!canVote}
        rows={3}
        className="w-full resize-none rounded-xl bg-surface2 border border-border px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-accent/40 disabled:opacity-40 mb-4"
      />

      <div className="grid grid-cols-3 gap-3">
        {SUPPORT_OPTIONS.map((option) => (
          <TxButton
            key={option.value}
            label={option.label}
            onClick={() => castVote(option.value)}
            isPending={isPending && selected === option.value}
            isConfirming={isConfirming && selected === option.value}
            isSuccess={isSuccess && selected === option.value}
            hash={selected === option.value ? hash : undefined}
            error={selected === option.value ? error : null}
            disabled={!canVote}
            variant="secondary"
          />
        ))}
      </div>
    </div>
  );
}
