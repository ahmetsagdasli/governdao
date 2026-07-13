-- GovernDAO schema
create table public.proposals (
  id bigint generated always as identity primary key,
  proposal_id text not null unique,          -- uint256 as decimal string
  title text not null check (char_length(title) between 3 and 120),
  description text not null check (char_length(description) <= 10000),
  proposer text not null check (proposer ~ '^0x[a-fA-F0-9]{40}$'),
  targets jsonb not null,
  "values" jsonb not null,
  calldatas jsonb not null,
  tx_hash text not null check (tx_hash ~ '^0x[a-fA-F0-9]{64}$'),
  created_at timestamptz not null default now()
);

create table public.votes_cache (
  id bigint generated always as identity primary key,
  proposal_id text not null references public.proposals(proposal_id),
  voter text not null check (voter ~ '^0x[a-fA-F0-9]{40}$'),
  support smallint not null check (support in (0, 1, 2)),  -- 0=Against 1=For 2=Abstain
  weight text not null,                       -- uint256 as string
  reason text,
  tx_hash text not null,
  created_at timestamptz not null default now(),
  unique (proposal_id, voter)
);

alter table public.proposals enable row level security;
alter table public.votes_cache enable row level security;

create policy "public read proposals"  on public.proposals  for select using (true);
create policy "public read votes"      on public.votes_cache for select using (true);
create policy "anon insert proposals"  on public.proposals  for insert with check (true);
create policy "anon insert votes"      on public.votes_cache for insert with check (true);
-- NOTE: demo policy. No update/delete policies exist, so rows are immutable via anon key.
