import { useEffect, useState } from "react";
import { usePublicClient, useBlockNumber } from "wagmi";

const AVERAGE_BLOCK_TIME_MS = 12_000;

/**
 * Resolves a block number to a wall-clock time in milliseconds.
 * Uses the block's real timestamp once it's mined; estimates from the
 * current block otherwise (e.g. a not-yet-reached voting deadline).
 */
export function useBlockTime(blockNumber: bigint | undefined) {
  const publicClient = usePublicClient();
  const { data: currentBlock } = useBlockNumber();
  const [timestampMs, setTimestampMs] = useState<number | undefined>();

  useEffect(() => {
    if (blockNumber === undefined || !publicClient) return;
    let cancelled = false;

    publicClient
      .getBlock({ blockNumber })
      .then((block) => {
        if (!cancelled) setTimestampMs(Number(block.timestamp) * 1000);
      })
      .catch(() => {
        if (cancelled || currentBlock === undefined) return;
        const blocksAway = Number(blockNumber - currentBlock);
        setTimestampMs(Date.now() + blocksAway * AVERAGE_BLOCK_TIME_MS);
      });

    return () => {
      cancelled = true;
    };
  }, [blockNumber, publicClient, currentBlock]);

  return timestampMs;
}
