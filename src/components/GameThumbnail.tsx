import { useState } from 'react';

interface GameThumbnailProps {
  url: string;
  title: string;
  className?: string;
  fit?: 'contain' | 'cover';
}

/** RUN jam thumbs are mostly square/portrait; contain inside the card frame. */
export function GameThumbnail({ url, title, className = '', fit = 'contain' }: GameThumbnailProps) {
  const [failed, setFailed] = useState(false);
  const trimmed = url?.trim() ?? '';
  const showPlaceholder = trimmed.length === 0 || failed;

  return (
    <div
      className={`relative flex h-full w-full min-h-0 items-center justify-center overflow-hidden bg-gradient-to-b from-zinc-800/50 via-zinc-900 to-black ${className}`}
    >
      {showPlaceholder ? (
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
          src={trimmed}
          alt=""
          className={`h-full w-full object-center ${fit === 'cover' ? 'object-cover' : 'max-h-full max-w-full object-contain'}`}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
