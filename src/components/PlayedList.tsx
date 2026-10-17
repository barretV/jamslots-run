import type { HistoryEntry } from '../types';
import { GamePosterGrid } from './GamePosterGrid';
import { JamPlayProgress } from './JamPlayProgress';

interface PlayedListProps {
  entries: HistoryEntry[];
  uniquePlayed?: number;
  totalJamGames?: number;
  onOpen: (entry: HistoryEntry) => void;
  descriptionFor?: (gameId: string) => string | undefined;
  thumbnailFor?: (gameId: string) => string | undefined;
  creatorFor?: (gameId: string) => string | undefined;
  totalPlaysFor?: (gameId: string) => number | undefined;
  votesFor?: (gameId: string) => number | undefined;
  isFavorite?: (gameId: string) => boolean;
  onToggleFavorite?: (gameId: string) => void;
  embedded?: boolean;
}

export function PlayedList({
  entries,
  uniquePlayed = 0,
  totalJamGames = 0,
  onOpen,
  descriptionFor,
  thumbnailFor,
  creatorFor,
  totalPlaysFor,
  votesFor,
  isFavorite,
  onToggleFavorite,
  embedded = false,
}: PlayedListProps) {
  const shellClass = embedded
    ? 'played-panel flex min-h-0 flex-1 flex-col'
    : 'rounded-2xl border border-cyan-500/20 bg-cyan-950/20 p-4';

  const showProgress = totalJamGames > 0;

  const items = entries.map((entry) => ({
    key: `${entry.gameId}-${entry.playedAt}`,
    gameId: entry.gameId,
    title: entry.title,
    thumbnailUrl: thumbnailFor?.(entry.gameId) ?? '',
    creatorName: creatorFor?.(entry.gameId),
    description: descriptionFor?.(entry.gameId) ?? '',
    totalPlays: totalPlaysFor?.(entry.gameId),
    votes: votesFor?.(entry.gameId),
  }));

  return (
    <section
      aria-labelledby={embedded ? undefined : 'played-heading'}
      className={shellClass}
      role={embedded ? 'presentation' : undefined}
    >
      {!embedded && (
        <>
          <h2
            id="played-heading"
            className="mb-2 font-display text-[1.25rem] font-bold text-cyan-200"
          >
            Played games
          </h2>
          <p className="mb-3 text-[1.1rem] text-zinc-400">Tap a poster to play again.</p>
        </>
      )}
      {showProgress && (
        <JamPlayProgress
          uniquePlayed={uniquePlayed}
          totalGames={totalJamGames}
          className="jam-play-progress--panel shrink-0"
        />
      )}
      {embedded && entries.length > 0 && (
        <p className="played-recent-label mb-1 shrink-0 text-[1.1rem] text-zinc-400">Recent plays</p>
      )}
      <GamePosterGrid
        items={items}
        onOpen={(item) => {
          const entry = entries.find(
            (e) => e.gameId === item.gameId && `${e.gameId}-${e.playedAt}` === item.key,
          );
          if (entry) onOpen(entry);
        }}
        emptyMessage="No plays yet. Tap a game image on the slots to play."
        embedded={embedded}
        isFavorite={isFavorite}
        onToggleFavorite={onToggleFavorite}
      />
    </section>
  );
}
