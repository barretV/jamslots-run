export interface JamGame {
  gameId: string;
  title: string;
  creatorName: string;
  description: string;
  thumbnailUrl: string;
  slug: string;
  shareUrl: string;
  votes: number;
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
}
