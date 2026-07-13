import { Link } from "react-router-dom";
import { useAccount, useBlockNumber, useReadContract } from "wagmi";
import { useProposals } from "../hooks/useProposals";
import { useVotingPower } from "../hooks/useVotingPower";
import { ProposalCard } from "../components/ProposalCard";
import { ProposalComparisonChart } from "../components/ProposalComparisonChart";
import { GOVERNOR_ADDRESS, governorAbi } from "../config/contracts";
import { formatTokenAmount } from "../lib/formatTokenAmount";
import heroImage from "../../../images/istockphoto-2067646188-612x612.jpg";

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-2 font-display text-2xl font-medium leading-tight text-ink">
        {value}
      </p>
    </div>
  );
}

export function Dashboard() {
  const { isConnected } = useAccount();
  const { data: proposals, isLoading } = useProposals();
  const { votingPower } = useVotingPower();
  const { data: blockNumber } = useBlockNumber();

  const { data: quorumNeeded } = useReadContract({
    address: GOVERNOR_ADDRESS,
    abi: governorAbi,
    functionName: "quorum",
    args:
      blockNumber !== undefined && blockNumber > 0n
        ? [blockNumber - 1n]
        : undefined,
    query: { enabled: blockNumber !== undefined && blockNumber > 0n },
  });

  return (
    <div className="space-y-10">
      <section
        aria-labelledby="governdao-hero-title"
        className="relative isolate -mx-6 -mt-4 overflow-hidden border-b border-border bg-bg sm:-mt-6 md:min-h-[344px]"
      >
        <picture className="block bg-surface2 md:hidden">
          <source srcSet={`${heroImage} 612w`} sizes="100vw" />
          <img
            src={heroImage}
            srcSet={`${heroImage} 612w`}
            sizes="100vw"
            width={612}
            height={344}
            loading="eager"
            decoding="async"
            alt="A digital ballot box on a smartphone for online voting"
            className="mx-auto h-auto w-full max-w-[612px] object-contain"
          />
        </picture>
        <picture className="pointer-events-none absolute right-0 top-1/2 hidden w-full max-w-[612px] -translate-y-1/2 md:block">
          <source srcSet={`${heroImage} 612w`} sizes="612px" />
          <img
            src={heroImage}
            srcSet={`${heroImage} 612w`}
            sizes="(min-width: 768px) 612px, 100vw"
            width={612}
            height={344}
            loading="eager"
            decoding="async"
            alt="A digital ballot box on a smartphone for online voting"
            className="h-auto w-full object-contain"
          />
        </picture>
        <div className="absolute inset-0 hidden bg-gradient-to-r from-bg via-bg/95 to-bg/20 md:block" />
        <div className="relative flex px-6 py-10 sm:py-12 md:min-h-[344px] md:items-center">
          <div className="max-w-xl">
            <p className="text-sm font-semibold uppercase text-accent">
              On-chain governance
            </p>
            <h1
              id="governdao-hero-title"
              className="mt-4 font-display text-4xl font-medium leading-tight text-ink sm:text-5xl"
            >
              GovernDAO decisions, proposed and voted on-chain.
            </h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-muted sm:text-lg">
              Create treasury proposals, track quorum, and vote with token
              power through a focused Sepolia governance interface.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/create"
                className="inline-flex items-center justify-center rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accentHover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                New Proposal
              </Link>
              <a
                href="#proposals"
                className="inline-flex items-center justify-center rounded-lg border border-border bg-surface/85 px-5 py-3 text-sm font-semibold text-ink shadow-sm transition-colors hover:border-accent/40 hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Review Proposals
              </a>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="governance-overview-title">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2
              id="governance-overview-title"
              className="font-display text-2xl font-medium text-ink"
            >
              Governance overview
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Live proposal count, personal voting power, and current quorum
              threshold.
            </p>
          </div>
          <Link
            to="/create"
            className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accentHover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            New Proposal
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile
            label="Total proposals"
            value={String(proposals?.length ?? 0)}
          />
          <StatTile
            label="Your voting power"
            value={isConnected ? formatTokenAmount(votingPower) : "—"}
          />
          <StatTile
            label="Quorum needed"
            value={formatTokenAmount(quorumNeeded)}
          />
        </div>
      </section>

      {!isLoading && proposals && proposals.length >= 2 && (
        <section aria-label="Proposal comparison">
          <ProposalComparisonChart proposals={proposals} />
        </section>
      )}

      <section id="proposals" aria-labelledby="proposals-title">
        <div className="mb-5">
          <h2
            id="proposals-title"
            className="font-display text-2xl font-medium text-ink"
          >
            Proposals
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            GovernDAO on-chain governance, live on Sepolia.
          </p>
        </div>

        {isLoading && (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-lg bg-surface2"
              />
            ))}
          </div>
        )}

        {!isLoading && (proposals?.length ?? 0) === 0 && (
          <div className="rounded-lg border border-border bg-surface px-6 py-14 text-center shadow-sm">
            <p className="text-muted">No proposals yet.</p>
            <Link
              to="/create"
              className="mt-4 inline-flex items-center justify-center rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accentHover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Create the first proposal
            </Link>
          </div>
        )}

        {!isLoading && proposals && proposals.length > 0 && (
          <div className="space-y-4">
            {proposals.map((proposal) => (
              <ProposalCard key={proposal.proposal_id} proposal={proposal} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
