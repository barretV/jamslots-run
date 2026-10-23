import type { JamGame } from '../types';

export interface ChartFilters {
  votesOverPlays: boolean;
  playsOverVotes: boolean;
  hasVotesToday: boolean;
}

export const EMPTY_CHART_FILTERS: ChartFilters = {
  votesOverPlays: false,
  playsOverVotes: false,
  hasVotesToday: false,
};

export function hasActiveChartFilters(filters: ChartFilters): boolean {
  return filters.votesOverPlays || filters.playsOverVotes || filters.hasVotesToday;
}

export function gameMatchesChartFilters(game: JamGame, filters: ChartFilters): boolean {
  if (!hasActiveChartFilters(filters)) return true;
  if (filters.votesOverPlays && game.votes <= game.totalPlays) return false;
  if (filters.playsOverVotes && game.totalPlays <= game.votes) return false;
  if (filters.hasVotesToday && (game.votesToday ?? 0) <= 0) return false;
  return true;
}

export function filterGamesForCharts(games: JamGame[], filters: ChartFilters): JamGame[] {
  if (!hasActiveChartFilters(filters)) return games;
  return games.filter((g) => gameMatchesChartFilters(g, filters));
}
