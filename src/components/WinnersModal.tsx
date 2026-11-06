import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  formatPrizeMoney,
  OCTOBER_SECTIONS,
  resolveOctoberPrizes,
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

function rowById(rows: ResolvedPrize[], id: string): ResolvedPrize {
  const row = rows.find((item) => item.prize.id === id);
  if (!row) throw new Error(`Missing prize ${id}`);
  return row;
}

function heading(id: string): string {
  return OCTOBER_SECTIONS.find((section) => section.id === id)?.heading ?? id;
}

function Poster({
  game,
  onOpen,
}: {
  game: JamGame;
  onOpen: (game: JamGame) => void;
}) {
  return (
    <button type="button" className="stage-poster" onClick={() => onOpen(game)} aria-label={`Play ${game.title}`}>
      {game.thumbnailUrl ? (
        <img src={game.thumbnailUrl} alt="" referrerPolicy="strict-origin-when-cross-origin" />
      ) : null}
    </button>
  );
}

function Medal({ metal, mark }: { metal: string; mark: string }) {
  return (
    <div className={`stage-medal stage-medal--${metal}`} aria-hidden="true">
      <span className="stage-medal__ribbon" />
      <span className="stage-medal__disc">{mark}</span>
    </div>
  );
}

function PodiumSpot({
  row,
  onOpen,
  tier,
}: {
  row: ResolvedPrize;
  onOpen: (game: JamGame) => void;
  tier: 'gold' | 'silver' | 'bronze';
}) {
  const { prize, game } = row;
  return (
    <article className={`podium-spot podium-spot--${tier}`}>
      <Medal metal={prize.metal} mark={String(prize.place ?? '')} />
      {game ? <Poster game={game} onOpen={onOpen} /> : null}
      <h3 className="podium-spot__title">{prize.title}</h3>
      {game?.creatorName ? <p className="podium-spot__creator">{game.creatorName}</p> : null}
      <p className="podium-spot__amount">{formatPrizeMoney(prize.amount)}</p>
      <div className="podium-spot__step" aria-hidden="true" />
    </article>
  );
}

function Finalist({ row, onOpen }: { row: ResolvedPrize; onOpen: (game: JamGame) => void }) {
  const { prize, game } = row;
  return (
    <article className="finalist">
      <Medal metal="place" mark={String(prize.place ?? '')} />
      {game ? <Poster game={game} onOpen={onOpen} /> : null}
      <h3 className="finalist__title">{prize.title}</h3>
      {game?.creatorName ? <p className="finalist__creator">{game.creatorName}</p> : null}
      <p className="finalist__amount">{formatPrizeMoney(prize.amount)}</p>
    </article>
  );
}

function Icon({ kind }: { kind: 'sticky' | 'money' | 'social' | 'theme' }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (kind === 'sticky') {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path {...common} d="M24 6l4 10 10 1-8 7 2 11-8-6-8 6 2-11-8-7 10-1z" />
        <path {...common} d="M24 34v8" />
      </svg>
    );
  }
  if (kind === 'money') {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <circle {...common} cx="24" cy="24" r="14" />
        <path {...common} d="M24 14v20M19 18.5c1.2-1.4 2.8-2 5-2 2.6 0 4 1.2 4 3s-1.4 2.6-4.2 3.2c-2.6.6-4.3 1.4-4.3 3.4 0 1.8 1.6 3.2 4.5 3.2 2.4 0 4-0.8 5-2.2" />
      </svg>
    );
  }
  if (kind === 'social') {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <circle {...common} cx="14" cy="24" r="5" />
        <circle {...common} cx="34" cy="14" r="5" />
        <circle {...common} cx="34" cy="34" r="5" />
        <path {...common} d="M18.5 22l11-6M18.5 26l11 6" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path {...common} d="M16 30c-4 0-8-3-8-8 6 0 8-2 8-8 6 2 10 6 12 12" />
      <path {...common} d="M28 18c2 6 6 10 12 12-2 6-8 10-14 8-4-1-8-5-10-10" />
      <circle {...common} cx="30" cy="22" r="2" />
    </svg>
  );
}

function Plaque({
  row,
  kind,
  onOpen,
}: {
  row: ResolvedPrize;
  kind: 'sticky' | 'money' | 'social' | 'theme';
  onOpen: (game: JamGame) => void;
}) {
  const { prize, game } = row;
  return (
    <article className={`plaque plaque--${kind}`}>
      <div className="plaque__icon">
        <Icon kind={kind} />
      </div>
      <h3 className="plaque__award">{prize.category}</h3>
      <div className="plaque__body">
        {game ? <Poster game={game} onOpen={onOpen} /> : null}
        <div>
          <p className="plaque__title">{prize.title}</p>
          {game?.creatorName ? <p className="plaque__creator">{game.creatorName}</p> : null}
          <p className="plaque__amount">{formatPrizeMoney(prize.amount)}</p>
        </div>
      </div>
    </article>
  );
}

function StoryCard({ row }: { row: ResolvedPrize }) {
  const { prize } = row;
  const metal = prize.metal === 'gold' || prize.metal === 'silver' || prize.metal === 'bronze' ? prize.metal : 'bronze';
  return (
    <article className={`story-card story-card--${metal}`}>
      <Medal metal={metal} mark={String(prize.place ?? '')} />
      <h3 className="story-card__title">{prize.title}</h3>
      <p className="story-card__prize">{prize.category}</p>
      <p className="story-card__amount">{formatPrizeMoney(prize.amount)}</p>
    </article>
  );
}

function Podium({
  gold,
  silver,
  bronze,
  onOpen,
  size,
}: {
  gold: ResolvedPrize;
  silver: ResolvedPrize;
  bronze: ResolvedPrize;
  onOpen: (game: JamGame) => void;
  size: 'hero' | 'votes';
}) {
  return (
    <div className={`podium podium--${size}`}>
      <PodiumSpot row={silver} onOpen={onOpen} tier="silver" />
      <PodiumSpot row={gold} onOpen={onOpen} tier="gold" />
      <PodiumSpot row={bronze} onOpen={onOpen} tier="bronze" />
    </div>
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

  const editorsGold = rowById(resolved, 'editors-1');
  const editorsSilver = rowById(resolved, 'editors-2');
  const editorsBronze = rowById(resolved, 'editors-3');
  const place4 = rowById(resolved, 'editors-4');
  const place5 = rowById(resolved, 'editors-5');
  const votesGold = rowById(resolved, 'votes-1');
  const votesSilver = rowById(resolved, 'votes-2');
  const votesBronze = rowById(resolved, 'votes-3');

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
          <section className="stage-block stage-hero" aria-label={heading('editors')}>
            <h3 className="stage-block__title">{heading('editors')}</h3>
            <Podium gold={editorsGold} silver={editorsSilver} bronze={editorsBronze} onOpen={onOpen} size="hero" />
            <div className="finalists">
              <Finalist row={place4} onOpen={onOpen} />
              <Finalist row={place5} onOpen={onOpen} />
            </div>
          </section>

          <section className="stage-block" aria-label={heading('votes')}>
            <h3 className="stage-block__title">{heading('votes')}</h3>
            <Podium gold={votesGold} silver={votesSilver} bronze={votesBronze} onOpen={onOpen} size="votes" />
          </section>

          <section className="stage-block" aria-label={heading('special')}>
            <div className="stage-block__head">
              <h3 className="stage-block__title">{heading('special')}</h3>
              <p className="stage-block__note">$500 each</p>
            </div>
            <div className="plaques">
              <Plaque row={rowById(resolved, 'special-sticky')} kind="sticky" onOpen={onOpen} />
              <Plaque row={rowById(resolved, 'special-money')} kind="money" onOpen={onOpen} />
              <Plaque row={rowById(resolved, 'special-social')} kind="social" onOpen={onOpen} />
              <Plaque row={rowById(resolved, 'special-theme')} kind="theme" onOpen={onOpen} />
            </div>
          </section>

          <section className="stage-block stage-story" aria-label={heading('story')}>
            <h3 className="stage-block__title">{heading('story')}</h3>
            <div className="story-row">
              <StoryCard row={rowById(resolved, 'story-1')} />
              <StoryCard row={rowById(resolved, 'story-2')} />
              <StoryCard row={rowById(resolved, 'story-3')} />
            </div>
          </section>
        </div>
      </div>
    </div>,
    document.body,
  );
}
