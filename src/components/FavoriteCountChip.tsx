import { formatPlays } from '../lib/formatPlays';
import { useFavoriteCounts } from './FavoriteCountsProvider';

interface FavoriteCountChipProps {
  gameId: string;
  className?: string;
}

export function FavoriteCountChip({ gameId, className }: FavoriteCountChipProps) {
  const { getCount } = useFavoriteCounts();
  const count = getCount(gameId);
  if (count <= 0) return null;

  const label = `${formatPlays(count)} community favorites`;

  return (
    <span
      className={['cover-favorites-chip', className].filter(Boolean).join(' ')}
      aria-label={label}
    >
      ★ {formatPlays(count)}
    </span>
  );
}
