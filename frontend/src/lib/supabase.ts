import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export interface ProposalRow {
  id: number;
  proposal_id: string;
  title: string;
  description: string;
  proposer: string;
  targets: string[];
  values: string[];
  calldatas: string[];
  tx_hash: string;
  created_at: string;
}

export interface VoteRow {
  id: number;
  proposal_id: string;
  voter: string;
  support: 0 | 1 | 2;
  weight: string;
  reason: string | null;
  tx_hash: string;
  created_at: string;
}
