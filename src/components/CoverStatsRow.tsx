import { formatPlays } from '../lib/formatPlays';
import { useFavoriteCounts } from './FavoriteCountsProvider';

interface CoverStatsRowProps {
  gameId: string;
  totalPlays?: number;
  className?: string;
}

export function CoverStatsRow({ gameId, totalPlays, className }: CoverStatsRowProps) {
  const { getCount } = useFavoriteCounts();
  const favCount = getCount(gameId);
  const showPlays = totalPlays != null && totalPlays > 0;
  const showFavs = favCount > 0;

  if (!showPlays && !showFavs) return null;

  const playsLabel = showPlays ? `${formatPlays(totalPlays)} plays` : '';
  const favsLabel = showFavs ? `★ ${formatPlays(favCount)} favs` : '';

  return (
    <div
      className={['cover-stats-row', className].filter(Boolean).join(' ')}
      aria-label={[playsLabel, favsLabel].filter(Boolean).join(', ')}
    >
      <span className="cover-stats-row__plays">{showPlays ? playsLabel : ''}</span>
      <span className="cover-stats-row__favs">{showFavs ? favsLabel : ''}</span>
    </div>
  );
}
