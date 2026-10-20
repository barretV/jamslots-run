import { useEffect, useMemo, useState, type ImgHTMLAttributes } from 'react';

interface GameThumbnailProps {
  url: string;
  title: string;
  className?: string;
  fit?: 'contain' | 'cover';
  loading?: 'lazy' | 'eager';
  referrerPolicy?: ImgHTMLAttributes<HTMLImageElement>['referrerPolicy'];
}

function cacheBustUrl(url: string): string {
  return url.includes('?') ? `${url}&jamslots=1` : `${url}?jamslots=1`;
}

function lowercasedHostUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const lowered = u.hostname.toLowerCase();
    if (lowered === u.hostname) return null;
    u.hostname = lowered;
    return u.toString();
  } catch {
    return null;
  }
}

/** 0 = original, 1 = cache-bust, 2 = lowercased host */
function thumbSrc(url: string, stage: number): string {
  if (stage <= 0) return url;
  if (stage === 1) return cacheBustUrl(url);
  return lowercasedHostUrl(url) ?? url;
}

/** RUN jam thumbs are mostly square/portrait; contain inside the card frame. */
export function GameThumbnail({
  url,
  title,
  className = '',
  fit = 'contain',
  loading = 'lazy',
  referrerPolicy = 'strict-origin-when-cross-origin',
}: GameThumbnailProps) {
  const [failed, setFailed] = useState(false);
  const [retryStage, setRetryStage] = useState(0);

  const trimmed = url?.trim() ?? '';

  useEffect(() => {
    setFailed(false);
    setRetryStage(0);
  }, [trimmed]);

  const src = useMemo(
    () => (trimmed ? thumbSrc(trimmed, retryStage) : ''),
    [trimmed, retryStage],
  );

  const showErrorPlaceholder = trimmed.length === 0 || failed;

  return (
    <div
      className={`game-thumb-root relative flex h-full w-full min-h-0 items-center justify-center overflow-hidden bg-zinc-950 ${className}`}
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
        <img
          src={src}
          alt=""
          className={`absolute inset-0 h-full w-full object-center ${
            fit === 'cover' ? 'object-cover' : 'object-contain'
          }`}
          loading={loading}
          decoding="async"
          referrerPolicy={referrerPolicy}
          onLoad={() => setFailed(false)}
          onError={() => {
            if (retryStage === 0) setRetryStage(1);
            else if (retryStage === 1) {
              if (lowercasedHostUrl(trimmed)) setRetryStage(2);
              else setFailed(true);
            } else setFailed(true);
          }}
        />
      )}
    </div>
  );
}
