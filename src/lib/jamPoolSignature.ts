/** Stable signature for “which games are in this jam snapshot”. */
export function jamPoolSignature(syncedAt: number, gameIds: string[]): string {
  const sorted = [...new Set(gameIds)].sort();
  let hash = 0;
  const payload = sorted.join('\n');
  for (let i = 0; i < payload.length; i++) {
    hash = (Math.imul(31, hash) + payload.charCodeAt(i)) | 0;
  }
  return `${syncedAt}|${sorted.length}|${hash}`;
}
