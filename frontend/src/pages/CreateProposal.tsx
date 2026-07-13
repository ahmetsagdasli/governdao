import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { encodeFunctionData, parseEventLogs } from "viem";
import {
  GOVERNOR_ADDRESS,
  TREASURY_ADDRESS,
  governorAbi,
  treasuryAbi,
} from "../config/contracts";
import { supabase } from "../lib/supabase";
import { useVotingPower } from "../hooks/useVotingPower";
import { DelegateBanner } from "../components/DelegateBanner";
import { TxButton } from "../components/TxButton";

export function CreateProposal() {
  const navigate = useNavigate();
  const { address } = useAccount();
  const { votingPower } = useVotingPower();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [newValue, setNewValue] = useState("");

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const {
    data: receipt,
    isLoading: isConfirming,
    isSuccess,
  } = useWaitForTransactionReceipt({ hash });

  const isValid =
    title.trim().length >= 3 &&
    title.trim().length <= 120 &&
    description.trim().length > 0 &&
    newValue.trim().length > 0;

  const submitProposal = () => {
    if (!isValid) return;

    const calldata = encodeFunctionData({
      abi: treasuryAbi,
      functionName: "store",
      args: [BigInt(newValue)],
    });

    const fullDescription = `${title.trim()}\n\n${description.trim()}`;

    writeContract({
      address: GOVERNOR_ADDRESS,
      abi: governorAbi,
      functionName: "propose",
      args: [[TREASURY_ADDRESS], [0n], [calldata], fullDescription],
    });
  };

  useEffect(() => {
    if (!isSuccess || !receipt || !address || !hash) return;

    const logs = parseEventLogs({
      abi: governorAbi,
      eventName: "ProposalCreated",
      logs: receipt.logs,
    });

    const created = logs[0];
    if (!created) return;

    const proposalId = created.args.proposalId.toString();
    const fullDescription = `${title.trim()}\n\n${description.trim()}`;
    const calldata = encodeFunctionData({
      abi: treasuryAbi,
      functionName: "store",
      args: [BigInt(newValue)],
    });

    supabase
      .from("proposals")
      .insert({
        proposal_id: proposalId,
        title: title.trim(),
        description: fullDescription,
        proposer: address,
        targets: [TREASURY_ADDRESS],
        values: ["0"],
        calldatas: [calldata],
        tx_hash: hash,
      })
      .then(() => {
        navigate(`/proposal/${proposalId}`);
      });
  }, [isSuccess, receipt, address, hash, title, description, newValue, navigate]);

  if (address && (votingPower ?? 0n) === 0n) {
    return (
      <div className="max-w-xl">
        <h1 className="font-display text-3xl font-medium tracking-tight text-ink mb-6">
          New Proposal
        </h1>
        <DelegateBanner />
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-3xl font-medium tracking-tight text-ink mb-8">
        New Proposal
      </h1>
      <div className="space-y-5">
        <div>
          <label className="block text-sm text-muted mb-2">Title</label>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            minLength={3}
            maxLength={120}
            required
            className="w-full rounded-xl bg-surface2 border border-border px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent/40 focus:bg-surface transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm text-muted mb-2">Description</label>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            required
            rows={6}
            className="w-full resize-none rounded-xl bg-surface2 border border-border px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent/40 focus:bg-surface transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm text-muted mb-2">
            New Treasury Value
          </label>
          <input
            value={newValue}
            onChange={(event) => setNewValue(event.target.value)}
            type="number"
            min={0}
            required
            className="w-full rounded-xl bg-surface2 border border-border px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent/40 focus:bg-surface transition-colors"
          />
        </div>

        <TxButton
          label="Submit Proposal"
          onClick={submitProposal}
          isPending={isPending}
          isConfirming={isConfirming}
          isSuccess={isSuccess}
          hash={hash}
          error={error}
          disabled={!isValid}
        />
      </div>
    </div>
  );
}
