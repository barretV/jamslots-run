import { formatPlays } from '../lib/formatPlays';

interface PosterMetaChipProps {
  rank: number;
  votes?: number;
  votesToday?: number;
  voteUrl?: string;
  favorited?: boolean;
  showFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export function PosterMetaChip({
  rank,
  votes,
  votesToday,
  voteUrl,
  favorited = false,
  showFavorite = false,
  onToggleFavorite,
}: PosterMetaChipProps) {
  const count = votes ?? 0;
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
    <div className="poster-meta-chip" aria-label={`Rank ${rank}${count > 0 ? `, ${voteLabel}` : ''}`}>
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
          {linked ? (
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
        </div>
      </div>
    </div>
  );
}
