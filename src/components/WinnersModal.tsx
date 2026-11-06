import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  formatPrizeMoney,
  OCTOBER_SECTIONS,
  resolveOctoberPrizes,
  type OctoberPrize,
  type ResolvedPrize,
} from '../lib/octoberWinners';
import { useLibraryImmersiveOverlay } from '../lib/useLibraryImmersiveOverlay';
import type { JamGame } from '../types';

interface WinnersModalProps {
  games: JamGame[];
  open: boolean;
  onClose: () => void;
  onOpen: (game: JamGame) => void;
}

function medalMark(prize: OctoberPrize): string {
  if (prize.metal === 'special') return '★';
  if (prize.place) return String(prize.place);
  return '★';
}

function metalName(prize: OctoberPrize): string {
  if (prize.metal === 'gold') return 'Gold';
  if (prize.metal === 'silver') return 'Silver';
  if (prize.metal === 'bronze') return 'Bronze';
  if (prize.place) return `Place ${prize.place}`;
  return prize.category;
}

function WinnerRow({
  row,
  onOpen,
}: {
  row: ResolvedPrize;
  onOpen: (game: JamGame) => void;
}) {
  const { prize, game } = row;
  return (
    <article className={`winners-card winners-card--${prize.metal}`}>
      <div className="winners-medal" aria-hidden="true">
        <span className="winners-medal__ribbon" />
        <span className="winners-medal__disc">{medalMark(prize)}</span>
      </div>
      {game ? (
        <button
          type="button"
          className="winners-poster"
          onClick={() => onOpen(game)}
          aria-label={`Play ${game.title}`}
        >
          {game.thumbnailUrl ? (
            <img src={game.thumbnailUrl} alt="" referrerPolicy="strict-origin-when-cross-origin" />
          ) : null}
        </button>
      ) : null}
      <div className="winners-card__copy">
        <p className="winners-card__metal">{metalName(prize)}</p>
        <h3 className="winners-card__title">{prize.title}</h3>
        {game?.creatorName ? <p className="winners-card__creator">{game.creatorName}</p> : null}
        <p className="winners-card__meta">
          <span>{prize.category}</span>
          <span className="winners-card__amount">{formatPrizeMoney(prize.amount)}</span>
        </p>
      </div>
    </article>
  );
}

export function WinnersModal({ games, open, onClose, onOpen }: WinnersModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const resolved = useMemo(() => resolveOctoberPrizes(games), [games]);

  useLibraryImmersiveOverlay(open);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="winners-modal" role="presentation">
      <button type="button" className="winners-modal__backdrop" aria-label="Close winners" onClick={onClose} />
      <div className="winners-modal__panel" role="dialog" aria-modal="true" aria-label="October Jam winners">
        <header className="winners-modal__header">
          <div>
            <p className="winners-modal__kicker">October Jam</p>
            <h2 className="winners-modal__title">Winners</h2>
          </div>
          <button ref={closeRef} type="button" className="winners-modal__back" onClick={onClose}>
            Back
          </button>
        </header>
        <div className="winners-modal__body">
          {OCTOBER_SECTIONS.map((section) => {
            const rows = resolved.filter((row) => row.prize.section === section.id);
            return (
              <section key={section.id} className="winners-section" aria-label={section.heading}>
                <div className="winners-section__head">
                  <h3 className="winners-section__title">{section.heading}</h3>
                  {section.id === 'special' ? <p className="winners-section__note">$500 each</p> : null}
                </div>
                <div className="winners-section__list">
                  {rows.map((row) => (
                    <WinnerRow key={row.prize.id} row={row} onOpen={onOpen} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}
