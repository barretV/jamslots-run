import { formatPlays } from '../lib/formatPlays';

interface CoverVoteBadgeProps {
  votes?: number;
  /** Votes gained since UTC midnight (from jam sync snapshots). */
  votesToday?: number;
  /** When set, badge opens RUN jam vote UI for this game. */
  voteUrl?: string;
  className?: string;
}

/** Official RUN jam vote count; optional deep link to vote for this game. */
export function CoverVoteBadge({ votes, votesToday, voteUrl, className }: CoverVoteBadgeProps) {
  const count = votes ?? 0;
  const todayGain = votesToday != null && votesToday > 0 ? votesToday : 0;
  const href = voteUrl?.trim() ?? '';
  const linked = href.length > 0;
  if (!linked && count <= 0 && todayGain <= 0) return null;

  const countLabel = count > 0 ? `${formatPlays(count)} jam votes` : 'Vote on RUN';
  const todayLabel = todayGain > 0 ? `, +${formatPlays(todayGain)} today (UTC)` : '';
  const label = linked ? `Vote on RUN (${countLabel}${todayLabel})` : `${countLabel}${todayLabel}`;
  const content = count > 0 ? `▲ ${formatPlays(count)}` : '▲ Vote';

  const classNames = ['cover-vote-badge', linked ? 'cover-vote-badge--link' : '', className]
    .filter(Boolean)
    .join(' ');

  const todayChip =
    todayGain > 0 ? (
      <span
        className={`cover-vote-today ${todayGain >= 10 ? 'cover-vote-today--hot' : ''}`}
        aria-hidden="true"
        title={`+${formatPlays(todayGain)} new votes today (UTC)`}
      >
        +{formatPlays(todayGain)}
      </span>
    ) : null;

  if (linked) {
    return (
      <div className="cover-vote-stack">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={classNames}
          aria-label={label}
          title={label}
          onClick={(e) => e.stopPropagation()}
        >
          {content}
        </a>
        {todayChip}
      </div>
    );
  }

  return (
    <div className="cover-vote-stack">
      <span className={classNames} aria-label={label} title={label}>
        {content}
      </span>
      {todayChip}
    </div>
  );
}
