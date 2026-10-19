export function formatListUpdatedAgo(syncedAtMs: number, nowMs = Date.now()): string {
  if (!syncedAtMs || syncedAtMs <= 0) return 'List updated recently';
  const diffSec = Math.max(0, Math.floor((nowMs - syncedAtMs) / 1000));
  if (diffSec < 60) return 'List updated just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Updated ${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 48) return `Updated ${diffHr}h ago`;
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

export type VotingCountdown = { closed: true } | { closed: false; days: number; hours: number; minutes: number };

export function votingCountdown(
  votingCloseAtMs: number,
  nowMs = Date.now(),
): VotingCountdown | null {
  if (!votingCloseAtMs || votingCloseAtMs <= 0) return null;
  if (nowMs >= votingCloseAtMs) return { closed: true };
  const ms = votingCloseAtMs - nowMs;
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  return { closed: false, days, hours, minutes };
}

export function formatVotingCountdownLabel(countdown: VotingCountdown): string {
  if (countdown.closed) return 'Voting closed';
  const { days, hours, minutes } = countdown;
  return `${days}d ${hours}h ${minutes}m left`;
}
