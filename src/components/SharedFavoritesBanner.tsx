import { clearShareFavoritesFromLocation } from '../lib/shareFavoritesUrl';

interface SharedFavoritesBannerProps {
  matchCount: number;
  requestedCount: number;
  onDismiss: () => void;
}

export function SharedFavoritesBanner({
  matchCount,
  requestedCount,
  onDismiss,
}: SharedFavoritesBannerProps) {
  const missing = requestedCount - matchCount;

  return (
    <div className="shared-favorites-banner" role="status">
      <p className="shared-favorites-banner__title font-display">
        Shared favorites
      </p>
      <p className="shared-favorites-banner__meta">
        {matchCount} game{matchCount === 1 ? '' : 's'} in this jam
        {missing > 0 ? ` (${missing} not in current list)` : ''}
      </p>
      <button
        type="button"
        className="shared-favorites-banner__dismiss"
        onClick={() => {
          clearShareFavoritesFromLocation();
          onDismiss();
        }}
      >
        Back to my picks
      </button>
    </div>
  );
}
