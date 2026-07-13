import { formatTokenAmount } from "../lib/formatTokenAmount";

interface VoteBarProps {
  forVotes: bigint | undefined;
  againstVotes: bigint | undefined;
  abstainVotes: bigint | undefined;
}

export function VoteBar({ forVotes, againstVotes, abstainVotes }: VoteBarProps) {
  const f = forVotes ?? 0n;
  const a = againstVotes ?? 0n;
  const ab = abstainVotes ?? 0n;
  const total = f + a + ab;

  const pct = (value: bigint): number =>
    total === 0n ? 0 : Number((value * 10_000n) / total) / 100;

  return (
    <div>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-surface2">
        <div className="bg-success" style={{ width: `${pct(f)}%` }} />
        <div className="bg-danger" style={{ width: `${pct(a)}%` }} />
        <div className="bg-muted" style={{ width: `${pct(ab)}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted">
        <span className="text-success">For {formatTokenAmount(f)}</span>
        <span className="text-danger">Against {formatTokenAmount(a)}</span>
        <span>Abstain {formatTokenAmount(ab)}</span>
      </div>
    </div>
  );
}
