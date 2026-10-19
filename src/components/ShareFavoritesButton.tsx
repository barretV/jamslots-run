import { useCallback, useState } from 'react';
import { buildShareFavoritesUrl } from '../lib/shareFavoritesUrl';

interface ShareFavoritesButtonProps {
  gameIds: string[];
  disabled?: boolean;
}

export function ShareFavoritesButton({ gameIds, disabled }: ShareFavoritesButtonProps) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle');

  const onShare = useCallback(async () => {
    if (gameIds.length === 0) return;
    const url = buildShareFavoritesUrl(gameIds);
    try {
      await navigator.clipboard.writeText(url);
      setStatus('copied');
      window.setTimeout(() => setStatus('idle'), 2200);
    } catch {
      setStatus('error');
      window.setTimeout(() => setStatus('idle'), 2800);
    }
  }, [gameIds]);

  const label =
    status === 'copied'
      ? 'Link copied'
      : status === 'error'
        ? 'Could not copy'
        : 'Share my favorites';

  return (
    <button
      type="button"
      className="share-favorites-btn"
      onClick={() => void onShare()}
      disabled={disabled || gameIds.length === 0}
      aria-live="polite"
    >
      {label}
    </button>
  );
}
