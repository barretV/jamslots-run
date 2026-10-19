import type { JamGame } from '../types';

/** Web play URL on run.world (stable when API shareUrl or creator slug changes). */
export function getPlayUrl(game: Pick<JamGame, 'creatorName' | 'slug' | 'shareUrl'>): string {
  const creator = game.creatorName?.trim();
  const slug = game.slug?.trim();
  if (creator && slug) {
    return `https://run.world/${encodeURIComponent(creator)}/${encodeURIComponent(slug)}`;
  }
  return game.shareUrl;
}
