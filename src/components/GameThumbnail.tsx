import { useEffect, useMemo, useState } from 'react';

interface GameThumbnailProps {
  url: string;
  title: string;
  className?: string;
  fit?: 'contain' | 'cover';
  loading?: 'lazy' | 'eager';
}

function thumbSrc(url: string, retried: boolean): string {
  if (!retried) return url;
  return url.includes('?') ? `${url}&jamslots=1` : `${url}?jamslots=1`;
}

/** RUN jam thumbs are mostly square/portrait; contain inside the card frame. */
export function GameThumbnail({
  url,
  title,
  className = '',
  fit = 'contain',
  loading = 'lazy',
}: GameThumbnailProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [retried, setRetried] = useState(false);

  const trimmed = url?.trim() ?? '';

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
    setRetried(false);
  }, [trimmed]);

  const src = useMemo(() => (trimmed ? thumbSrc(trimmed, retried) : ''), [trimmed, retried]);

  const showErrorPlaceholder = trimmed.length === 0 || failed;
  const showLoadingShell = !showErrorPlaceholder && !loaded;

  return (
    <div
      className={`game-thumb-root relative flex h-full w-full min-h-0 items-center justify-center overflow-hidden bg-gradient-to-b from-violet-900/40 via-violet-950/80 to-fuchsia-950/60 ${className}`}
    >
      {showErrorPlaceholder ? (
        <div
          className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-violet-900/80 via-zinc-900 to-fuchsia-950/80 px-3"
          aria-hidden
        >
          <span className="font-display text-[2rem] font-black text-violet-300/50">
            {title.slice(0, 1).toUpperCase() || '?'}
          </span>
          <span className="text-center text-[1.1rem] text-violet-200/60">No thumbnail</span>
        </div>
      ) : (
        <>
          {showLoadingShell && (
            <div
              className="absolute inset-0 bg-gradient-to-br from-violet-900/85 via-violet-950 to-fuchsia-950/90"
              aria-hidden
            />
          )}
          <img
            src={src}
            alt=""
            className={`absolute inset-0 h-full w-full object-center ${
              fit === 'cover' ? 'object-cover' : 'object-contain'
            } ${loaded ? 'opacity-100' : 'opacity-0'}`}
            loading={loading}
            decoding="async"
            referrerPolicy="no-referrer"
            onLoad={() => setLoaded(true)}
            onError={() => {
              if (!retried) setRetried(true);
              else setFailed(true);
            }}
          />
        </>
      )}
    </div>
  );
}
