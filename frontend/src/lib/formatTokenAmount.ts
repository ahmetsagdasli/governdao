import { formatUnits } from "viem";

export function formatTokenAmount(raw: bigint | undefined): string {
  if (raw === undefined) return "—";
  const num = Number(formatUnits(raw, 18));
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
  return num.toFixed(2);
}
