/** RUN jam Game Votes page (community ballot). */
export function runJamVotesPageUrl(jamSlug: string): string {
  const slug = jamSlug.trim() || 'octoberjam';
  return `https://run.world/jams/${encodeURIComponent(slug)}`;
}

/** Opens the jam votes page scrolled to a specific game ballot. */
export function runJamVoteGameUrl(jamSlug: string, gameId: string): string {
  const slug = jamSlug.trim() || 'octoberjam';
  const id = gameId.trim();
  const base = runJamVotesPageUrl(slug);
  if (!id) return base;
  return `${base}?game=${encodeURIComponent(id)}`;
}
