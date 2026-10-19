export function formatListUpdatedAgo(syncedAtMs: number, nowMs = Date.now()): string {
  if (!syncedAtMs || syncedAtMs <= 0) return 'List updated recently';
  const diffSec = Math.max(0, Math.floor((nowMs - syncedAtMs) / 1000));
  if (diffSec < 60) return 'List updated just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `List updated ${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 48) return `List updated ${diffHr} hr ago`;
  return `List updated ${new Date(syncedAtMs).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })}`;
}

export function formatVotingCloses(votingCloseAtMs: number, nowMs = Date.now()): string | null {
  if (!votingCloseAtMs || votingCloseAtMs <= 0) return null;
  if (nowMs >= votingCloseAtMs) return 'Voting closed';
  const date = new Date(votingCloseAtMs);
  const datePart = date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  return `Voting closes ${datePart}`;
}
