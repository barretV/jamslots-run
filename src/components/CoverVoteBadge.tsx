import { formatPlays } from '../lib/formatPlays';

interface CoverVoteBadgeProps {
  votes?: number;
  /** When set, badge opens RUN jam vote UI for this game. */
  voteUrl?: string;
  className?: string;
}

/** Official RUN jam vote count; optional deep link to vote for this game. */
export function CoverVoteBadge({ votes, voteUrl, className }: CoverVoteBadgeProps) {
  const count = votes ?? 0;
  const href = voteUrl?.trim() ?? '';
  const linked = href.length > 0;
  if (!linked && count <= 0) return null;

  const countLabel = count > 0 ? `${formatPlays(count)} jam votes` : 'Vote on RUN';
  const label = linked ? `Vote on RUN (${countLabel})` : countLabel;
  const content = count > 0 ? `▲ ${formatPlays(count)}` : '▲ Vote';

  const classNames = ['cover-vote-badge', linked ? 'cover-vote-badge--link' : '', className]
    .filter(Boolean)
    .join(' ');

  if (linked) {
    return (
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
    );
  }

  return (
    <span className={classNames} aria-label={label} title={label}>
      {content}
    </span>
  );
}
