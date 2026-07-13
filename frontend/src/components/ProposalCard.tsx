import { Link } from "react-router-dom";
import type { ProposalRow } from "../lib/supabase";
import { useProposalState } from "../hooks/useProposalState";
import { ProposalStateBadge } from "./ProposalStateBadge";
import { VoteBar } from "./VoteBar";

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function ProposalCard({ proposal }: { proposal: ProposalRow }) {
  const { state, forVotes, againstVotes, abstainVotes } = useProposalState(
    proposal.proposal_id
  );

  return (
    <Link
      to={`/proposal/${proposal.proposal_id}`}
      className="block bg-surface border border-border rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-accent/40 hover:-translate-y-0.5 transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-lg font-medium text-ink">
            {proposal.title}
          </h3>
          <p className="mt-1 text-sm text-muted">
            {truncateAddress(proposal.proposer)}
          </p>
        </div>
        <ProposalStateBadge state={state} />
      </div>
      <div className="mt-4">
        <VoteBar
          forVotes={forVotes}
          againstVotes={againstVotes}
          abstainVotes={abstainVotes}
        />
      </div>
    </Link>
  );
}
