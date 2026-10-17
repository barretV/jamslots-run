/** RUN jam Game Votes page (community ballot). */
export function runJamVotesPageUrl(jamSlug: string): string {
  const slug = jamSlug.trim() || 'octoberjam';
  return `https://run.world/jams/${encodeURIComponent(slug)}`;
}
