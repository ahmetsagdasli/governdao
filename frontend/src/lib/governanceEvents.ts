import { parseAbiItem, type PublicClient } from "viem";
import { GOVERNOR_ADDRESS } from "../config/contracts";
import type { ProposalRow, VoteRow } from "./supabase";

const LOCAL_CHAIN_IDS = new Set([31337, 1337]);

const proposalCreatedEvent = parseAbiItem(
  "event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 voteStart, uint256 voteEnd, string description)"
);

const voteCastEvent = parseAbiItem(
  "event VoteCast(address indexed voter, uint256 proposalId, uint8 support, uint256 weight, string reason)"
);

export function shouldReadGovernanceEvents(
  publicClient: PublicClient | undefined
) {
  const envChainId = Number(import.meta.env.VITE_CHAIN_ID);

  return Boolean(
    LOCAL_CHAIN_IDS.has(envChainId) ||
      (publicClient?.chain?.id && LOCAL_CHAIN_IDS.has(publicClient.chain.id))
  );
}

function proposalTitle(description: string, proposalId: string) {
  const firstLine = description.split(/\r?\n/)[0]?.trim();
  return firstLine && firstLine.length >= 3
    ? firstLine.slice(0, 120)
    : `Proposal ${proposalId.slice(0, 10)}`;
}

async function getBlockTimestamps(
  publicClient: PublicClient,
  blockNumbers: bigint[]
) {
  const uniqueBlockNumbers = Array.from(
    new Set(blockNumbers.map((blockNumber) => blockNumber.toString()))
  ).map((blockNumber) => BigInt(blockNumber));

  const entries = await Promise.all(
    uniqueBlockNumbers.map(async (blockNumber) => {
      const block = await publicClient.getBlock({ blockNumber });
      return [blockNumber.toString(), Number(block.timestamp)] as const;
    })
  );

  return new Map(entries);
}

export async function fetchProposalEvents(
  publicClient: PublicClient
): Promise<ProposalRow[]> {
  const logs = await publicClient.getLogs({
    address: GOVERNOR_ADDRESS,
    event: proposalCreatedEvent,
    fromBlock: 0n,
    toBlock: "latest",
  });

  const timestamps = await getBlockTimestamps(
    publicClient,
    logs.map((log) => log.blockNumber)
  );

  return logs.map((log) => {
    const proposalId = (log.args.proposalId ?? 0n).toString();
    const description = log.args.description ?? "";
    const timestamp = timestamps.get(log.blockNumber.toString()) ?? 0;

    return {
      id: -Number(log.blockNumber * 1000n + BigInt(log.logIndex)) - 1,
      proposal_id: proposalId,
      title: proposalTitle(description, proposalId),
      description,
      proposer: log.args.proposer ?? "0x0000000000000000000000000000000000000000",
      targets: [...(log.args.targets ?? [])],
      values: (log.args.values ?? []).map((value) => value.toString()),
      calldatas: [...(log.args.calldatas ?? [])],
      tx_hash: log.transactionHash,
      created_at: new Date(timestamp * 1000).toISOString(),
    };
  });
}

export async function fetchVoteEvents(
  publicClient: PublicClient,
  proposalId: string
): Promise<VoteRow[]> {
  const logs = await publicClient.getLogs({
    address: GOVERNOR_ADDRESS,
    event: voteCastEvent,
    fromBlock: 0n,
    toBlock: "latest",
  });

  const matchingLogs = logs.filter(
    (log) => (log.args.proposalId ?? 0n).toString() === proposalId
  );
  const timestamps = await getBlockTimestamps(
    publicClient,
    matchingLogs.map((log) => log.blockNumber)
  );

  return matchingLogs.map((log) => {
    const timestamp = timestamps.get(log.blockNumber.toString()) ?? 0;
    const reason = log.args.reason ?? "";

    return {
      id: -Number(log.blockNumber * 1000n + BigInt(log.logIndex)) - 1,
      proposal_id: proposalId,
      voter: log.args.voter ?? "0x0000000000000000000000000000000000000000",
      support: (log.args.support ?? 0) as 0 | 1 | 2,
      weight: (log.args.weight ?? 0n).toString(),
      reason: reason.length > 0 ? reason : null,
      tx_hash: log.transactionHash,
      created_at: new Date(timestamp * 1000).toISOString(),
    };
  });
}
