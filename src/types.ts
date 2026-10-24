export interface JamGame {
  gameId: string;
  title: string;
  creatorName: string;
  description: string;
  thumbnailUrl: string;
  slug: string;
  shareUrl: string;
  votes: number;
  /** Votes gained since UTC day start (from sync snapshots). */
  votesToday?: number;
  totalPlays: number;
  publishedAt: number;
  rank?: number;
}

export interface GamesBundle {
  source: string;
  syncedAt: number;
  jamName: string;
  jamSlug: string;
  count: number;
  games: JamGame[];
  /** UTC day (`YYYY-MM-DD`) that `votesToday` is relative to. */
  votesDayUtc?: string;
  votingCloseAt?: number;
  submissionsCloseAt?: number;
}

export interface HistoryEntry {
  gameId: string;
  title: string;
  shareUrl: string;
  playedAt: number;
}

export interface PickerStats {
  playCounts: Record<string, number>;
  favorites: string[];
  history: HistoryEntry[];
  /** Game IDs that have appeared on slot reels this jam cycle. */
  rollSeenIds?: string[];
  /**
   * Game ids present the last time this browser loaded the site.
   * Missing means this profile has never saved a visit.
   */
  seenGameIds?: string[];
}
