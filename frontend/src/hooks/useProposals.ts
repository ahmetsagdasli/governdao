import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import {
  fetchProposalEvents,
  shouldReadGovernanceEvents,
} from "../lib/governanceEvents";
import { supabase, type ProposalRow } from "../lib/supabase";

export function useProposals() {
  const publicClient = usePublicClient();

  return useQuery({
    queryKey: ["proposals", publicClient?.chain?.id],
    queryFn: async (): Promise<ProposalRow[]> => {
      const readEvents = shouldReadGovernanceEvents(publicClient);
      if (readEvents && publicClient) {
        return fetchProposalEvents(publicClient);
      }

      let cacheRows: ProposalRow[] = [];

      try {
        const { data, error } = await supabase
          .from("proposals")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        cacheRows = data ?? [];
      } catch (error) {
        if (!readEvents) throw error;
      }

      return cacheRows;
    },
  });
}
