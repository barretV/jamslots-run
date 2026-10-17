import { formatPlays } from '../lib/formatPlays';

interface CoverVoteBadgeProps {
  votes?: number;
  className?: string;
}

/** Official RUN jam vote count from synced jam data. */
export function CoverVoteBadge({ votes, className }: CoverVoteBadgeProps) {
  const count = votes ?? 0;
  if (count <= 0) return null;

  const label = `${formatPlays(count)} jam votes`;

  return (
    <span
      className={['cover-vote-badge', className].filter(Boolean).join(' ')}
      aria-label={label}
      title={label}
    >
      ▲ {formatPlays(count)}
    </span>
  );
}
