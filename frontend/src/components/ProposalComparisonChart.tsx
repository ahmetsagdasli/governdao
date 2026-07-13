import { useState } from "react";
import { Link } from "react-router-dom";
import type { ProposalRow } from "../lib/supabase";
import { formatTokenAmount } from "../lib/formatTokenAmount";
import { useProposalsVotes, type ProposalVoteTally } from "../hooks/useProposalsVotes";

type Support = "for" | "against" | "abstain";

const SEGMENTS: { key: Support; label: string; barClass: string; dotClass: string }[] = [
  { key: "for", label: "For", barClass: "bg-success", dotClass: "bg-success" },
  { key: "against", label: "Against", barClass: "bg-danger", dotClass: "bg-danger" },
  { key: "abstain", label: "Abstain", barClass: "bg-muted", dotClass: "bg-muted" },
];

function segmentValue(tally: ProposalVoteTally, key: Support): bigint {
  if (key === "for") return tally.forVotes;
  if (key === "against") return tally.againstVotes;
  return tally.abstainVotes;
}

function pct(value: bigint, total: bigint): number {
  return total === 0n ? 0 : Number((value * 10_000n) / total) / 100;
}

function ComparisonRow({
  proposal,
  tally,
  maxTotal,
}: {
  proposal: ProposalRow;
  tally: ProposalVoteTally;
  maxTotal: bigint;
}) {
  const [hovered, setHovered] = useState<Support | null>(null);
  const barWidthPct = pct(tally.total, maxTotal);

  return (
    <div className="py-3">
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <Link
          to={`/proposal/${proposal.proposal_id}`}
          className="truncate text-sm font-medium text-ink hover:text-accent transition-colors"
        >
          {proposal.title}
        </Link>
        <span className="shrink-0 text-xs tabular-nums text-muted">
          {formatTokenAmount(tally.total)} votes
        </span>
      </div>

      <div className="relative">
        <div className="h-2.5 w-full rounded-full bg-surface2" />
        <div
          className="absolute inset-y-0 left-0 flex gap-[2px] overflow-hidden rounded-full"
          style={{ width: `${barWidthPct}%` }}
        >
          {SEGMENTS.map((segment) => {
            const value = segmentValue(tally, segment.key);
            const width = pct(value, tally.total);
            if (width === 0) return null;
            return (
              <div
                key={segment.key}
                className={`relative h-full ${segment.barClass}`}
                style={{ width: `${width}%` }}
                onMouseEnter={() => setHovered(segment.key)}
                onMouseLeave={() => setHovered(null)}
              >
                {hovered === segment.key && (
                  <div className="absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-xs font-medium text-white shadow-sm">
                    {segment.label}: {formatTokenAmount(value)} ({width.toFixed(0)}%)
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function ProposalComparisonChart({
  proposals,
}: {
  proposals: ProposalRow[];
}) {
  const { tallies, isLoading } = useProposalsVotes(
    proposals.map((proposal) => proposal.proposal_id)
  );

  if (proposals.length < 2) return null;

  const rows = proposals
    .map((proposal) => ({
      proposal,
      tally: tallies.find((t) => t.proposalId === proposal.proposal_id),
    }))
    .filter(
      (row): row is { proposal: ProposalRow; tally: ProposalVoteTally } =>
        row.tally !== undefined
    )
    .sort((a, b) => (b.tally.total > a.tally.total ? 1 : -1));

  const maxTotal = rows.reduce(
    (max, row) => (row.tally.total > max ? row.tally.total : max),
    0n
  );

  return (
    <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-medium text-ink">
          Compare proposals
        </h2>
        <div className="flex items-center gap-4 text-xs text-muted">
          {SEGMENTS.map((segment) => (
            <span key={segment.key} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${segment.dotClass}`} />
              {segment.label}
            </span>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-surface2" />
          ))}
        </div>
      )}

      {!isLoading && (
        <div className="divide-y divide-border">
          {rows.map(({ proposal, tally }) => (
            <ComparisonRow
              key={proposal.proposal_id}
              proposal={proposal}
              tally={tally}
              maxTotal={maxTotal}
            />
          ))}
        </div>
      )}

      <details className="mt-4">
        <summary className="cursor-pointer text-xs text-muted hover:text-accent transition-colors">
          View as table
        </summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-muted">
                <th className="py-1.5 pr-4 font-medium">Proposal</th>
                <th className="py-1.5 pr-4 font-medium text-success">For</th>
                <th className="py-1.5 pr-4 font-medium text-danger">Against</th>
                <th className="py-1.5 pr-4 font-medium">Abstain</th>
                <th className="py-1.5 font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="tabular-nums text-ink">
              {rows.map(({ proposal, tally }) => (
                <tr key={proposal.proposal_id} className="border-t border-border">
                  <td className="py-1.5 pr-4 max-w-[16rem] truncate">
                    {proposal.title}
                  </td>
                  <td className="py-1.5 pr-4">
                    {formatTokenAmount(tally.forVotes)}
                  </td>
                  <td className="py-1.5 pr-4">
                    {formatTokenAmount(tally.againstVotes)}
                  </td>
                  <td className="py-1.5 pr-4">
                    {formatTokenAmount(tally.abstainVotes)}
                  </td>
                  <td className="py-1.5">{formatTokenAmount(tally.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
