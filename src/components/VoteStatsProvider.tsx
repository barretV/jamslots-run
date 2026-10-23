import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { runJamVoteGameUrl } from '../lib/runVoteUrl';
import { VoteDailyStatsModal, type VoteDailyStatsTarget } from './VoteDailyStatsModal';

export interface OpenVoteStatsArgs {
  gameId: string;
  title: string;
  votes?: number;
}

const VoteStatsContext = createContext<(args: OpenVoteStatsArgs) => void>(() => {});

export function VoteStatsProvider({
  jamSlug,
  children,
}: {
  jamSlug: string;
  children: ReactNode;
}) {
  const [target, setTarget] = useState<VoteDailyStatsTarget | null>(null);
  const openVoteStats = useCallback(
    (args: OpenVoteStatsArgs) => {
      setTarget({
        gameId: args.gameId,
        title: args.title,
        votes: args.votes ?? 0,
        voteUrl: runJamVoteGameUrl(jamSlug, args.gameId),
      });
    },
    [jamSlug],
  );

  return (
    <VoteStatsContext.Provider value={openVoteStats}>
      {children}
      <VoteDailyStatsModal target={target} onClose={() => setTarget(null)} />
    </VoteStatsContext.Provider>
  );
}

export function useOpenVoteStats(): (args: OpenVoteStatsArgs) => void {
  return useContext(VoteStatsContext);
}
