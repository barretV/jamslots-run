import { clearShareFavoritesFromLocation } from '../lib/shareFavoritesUrl';

interface SharedFavoritesBannerProps {
  matchCount: number;
  requestedCount: number;
  linkError?: boolean;
  onDismiss: () => void;
}

export function SharedFavoritesBanner({
  matchCount,
  requestedCount,
  linkError = false,
  onDismiss,
}: SharedFavoritesBannerProps) {
  const missing = requestedCount - matchCount;

  return (
    <div className="shared-favorites-banner" role="status">
      <p className="shared-favorites-banner__title font-display">
        {linkError ? 'Share link problem' : 'Shared favorites'}
      </p>
      <p className="shared-favorites-banner__meta">
        {linkError
          ? 'This link may have expired or was mistyped.'
          : `${matchCount} game${matchCount === 1 ? '' : 's'} in this jam${
              missing > 0 ? ` (${missing} not in current list)` : ''
            }`}
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
