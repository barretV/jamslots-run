import { formatPlays } from '../lib/formatPlays';

interface PosterMetaChipProps {
  rank: number;
  votes?: number;
  votesToday?: number;
  numLikes?: number;
  voteUrl?: string;
  favorited?: boolean;
  showFavorite?: boolean;
  onToggleFavorite?: () => void;
  /** When set, vote chip opens stats instead of navigating away. */
  onVotePress?: () => void;
}

function ThumbIcon() {
  return (
    <svg className="poster-meta-chip__thumb" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7.493 18.75c-.425 0-.82-.236-.975-.632A7.48 7.48 0 0 1 6 15.375c0-1.75.599-3.358 1.602-4.634.151-.192.373-.309.6-.397.473-.183.89-.514 1.212-.924a9.042 9.042 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V3a.75.75 0 0 1 .75-.75 2.25 2.25 0 0 1 2.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23h-.777ZM4.5 10.5A2.25 2.25 0 0 0 2.25 12.75v6A2.25 2.25 0 0 0 4.5 21h.75a.75.75 0 0 0 .75-.75v-9a.75.75 0 0 0-.75-.75h-.75Z"
      />
    </svg>
  );
}

export function PosterMetaChip({
  rank,
  votes,
  votesToday,
  numLikes,
  voteUrl,
  favorited = false,
  showFavorite = false,
  onToggleFavorite,
  onVotePress,
}: PosterMetaChipProps) {
  const count = votes ?? 0;
  const likes = Math.max(0, numLikes ?? 0);
  const todayGain = votesToday != null && votesToday > 0 ? votesToday : 0;
  const href = voteUrl?.trim() ?? '';
  const linked = href.length > 0;
  const voteLabel =
    count > 0
      ? `${formatPlays(count)} jam votes${todayGain > 0 ? `, +${formatPlays(todayGain)} today` : ''}`
      : 'Vote on RUN';

  const voteTotal = (
    <span className="poster-meta-chip__votes-total">
      ▲ {count > 0 ? formatPlays(count) : linked ? 'Vote' : '—'}
    </span>
  );

  const todayChip =
    todayGain > 0 ? (
      <span
        className={`poster-meta-chip__votes-today ${todayGain >= 10 ? 'poster-meta-chip__votes-today--hot' : ''}`}
        aria-hidden="true"
        title={`+${formatPlays(todayGain)} new votes today (UTC)`}
      >
        +{formatPlays(todayGain)}
      </span>
    ) : null;

  return (
    <div
      className="poster-meta-chip"
      aria-label={`Rank ${rank}${count > 0 ? `, ${voteLabel}` : ''}, ${formatPlays(likes)} likes`}
    >
      <div className="poster-meta-chip__side poster-meta-chip__side--start">
        {showFavorite ? (
          <button
            type="button"
            className={`poster-meta-chip__star ${favorited ? 'poster-meta-chip__star--on' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite?.();
            }}
            aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
          >
            {favorited ? '★' : '☆'}
          </button>
        ) : (
          <span className="poster-meta-chip__star-spacer" aria-hidden />
        )}
      </div>
      <div className="poster-meta-chip__center">
        <span className="poster-meta-chip__rank" aria-hidden>
          #{rank}
        </span>
      </div>
      <div className="poster-meta-chip__side poster-meta-chip__side--end">
        <div className="poster-meta-chip__votes-stack">
          {linked && onVotePress ? (
            <button
              type="button"
              className="poster-meta-chip__votes poster-meta-chip__votes--link poster-meta-chip__votes--btn"
              title={`Jam vote stats (${voteLabel})`}
              aria-label={`Jam vote stats (${voteLabel})`}
              onClick={(e) => {
                e.stopPropagation();
                onVotePress();
              }}
            >
              {voteTotal}
            </button>
          ) : linked ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="poster-meta-chip__votes poster-meta-chip__votes--link"
              title={`Vote on RUN (${voteLabel})`}
              aria-label={`Vote on RUN (${voteLabel})`}
              onClick={(e) => e.stopPropagation()}
            >
              {voteTotal}
            </a>
          ) : (
            <span className="poster-meta-chip__votes" aria-hidden={count <= 0 && todayGain <= 0}>
              {voteTotal}
            </span>
          )}
          {todayChip}
          <span className="poster-meta-chip__likes" title={`${formatPlays(likes)} likes`}>
            <ThumbIcon />
            {formatPlays(likes)}
          </span>
        </div>
      </div>
    </div>
  );
}
