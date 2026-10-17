import { useEffect, useRef } from 'react';
import type { JamGame } from '../types';

interface GameDescriptionModalProps {
  game: JamGame | null;
  onClose: () => void;
}

export function GameDescriptionModal({ game, onClose }: GameDescriptionModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!game) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [game, onClose]);

  if (!game) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Close description"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-desc-title"
        className="relative z-10 flex max-h-[min(85dvh,32rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-violet-500/40 bg-zinc-950 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <h2
              id="game-desc-title"
              className="font-display text-[1.35rem] font-bold leading-tight text-amber-100"
            >
              {game.title}
            </h2>
            <p className="mt-1 text-[1.1rem] text-violet-200/90">by {game.creatorName}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="shrink-0 rounded-lg px-2 py-1 text-[1.35rem] leading-none text-zinc-400 hover:bg-white/10 hover:text-white"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto touch-pan-y px-4 py-4">
          <p className="whitespace-pre-wrap text-[1.1rem] leading-relaxed text-zinc-200">
            {game.description.trim() || 'No description provided.'}
          </p>
        </div>
      </div>
    </div>
  );
}
