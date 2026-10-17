import { formatPlays } from '../lib/formatPlays';
import { useFavoriteCounts } from './FavoriteCountsProvider';

interface CoverStatsRowProps {
  gameId: string;
  totalPlays?: number;
  className?: string;
  /** Tighter copy for narrow library posters (reels use default). */
  density?: 'normal' | 'compact';
}

export function CoverStatsRow({
  gameId,
  totalPlays,
  className,
  density = 'normal',
}: CoverStatsRowProps) {
  const { getCount } = useFavoriteCounts();
  const favCount = getCount(gameId);
  const showPlays = totalPlays != null && totalPlays > 0;
  const showFavs = favCount > 0;

  if (!showPlays && !showFavs) return null;

  const playsLabel = showPlays ? formatPlays(totalPlays!) : '';
  const favsLabel = showFavs ? `★ ${formatPlays(favCount)}` : '';
  const playsAria = showPlays ? `${formatPlays(totalPlays)} plays` : '';
  const favsAria = showFavs ? `${formatPlays(favCount)} favorites` : '';

  return (
    <div
      className={[
        'cover-stats-row',
        density === 'compact' ? 'cover-stats-row--compact' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={[playsAria, favsAria].filter(Boolean).join(', ')}
    >
      <span className="cover-stats-row__plays" title={playsAria}>
        {showPlays ? playsLabel : ''}
      </span>
      <span className="cover-stats-row__favs" title={favsAria}>
        {showFavs ? favsLabel : ''}
      </span>
    </div>
  );
}
