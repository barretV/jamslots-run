import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { formatPrizeMoney, type ResolvedPrize } from '../lib/octoberWinners';
import type { JamGame } from '../types';

type TierName = 'gold' | 'silver' | 'bronze';

const TIER_LABEL: Record<TierName, string> = {
  gold: 'Champion',
  silver: 'Runner-up',
  bronze: 'Third place',
};

const DESKTOP = { width: 1280, height: 700 };
const COMPACT = { width: 460, height: 800 };

function ordinal(place: number): string {
  const mod100 = place % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${place}th`;
  switch (place % 10) {
    case 1:
      return `${place}st`;
    case 2:
      return `${place}nd`;
    case 3:
      return `${place}rd`;
    default:
      return `${place}th`;
  }
}

/**
 * Scales a fixed-size design canvas to the available space, so a ceremony
 * scene is always fully visible without page scrolling.
 */
export function FitStage({ children }: { children: ReactNode }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ scale: 0, compact: false, ready: false });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const measure = () => {
      const rect = host.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return;
      const compact = rect.width < 860;
      const design = compact ? COMPACT : DESKTOP;
      const safe = compact ? 10 : 24;
      const scale = Math.min(
        (rect.width - safe * 2) / design.width,
        (rect.height - safe * 2) / design.height,
      );
      setView({
        scale: Math.max(0.1, scale),
        compact,
        ready: true,
      });
    };

    const observer = new ResizeObserver(measure);
    observer.observe(host);
    measure();
    return () => observer.disconnect();
  }, []);

  const design = view.compact ? COMPACT : DESKTOP;

  return (
    <div className="fit-stage" ref={hostRef}>
      <div
        className={`fit-stage__canvas${view.compact ? ' is-compact' : ''}${view.ready ? ' is-ready' : ''}`}
        style={{
          width: design.width,
          height: design.height,
          transform: `translate3d(-50%, -50%, 0) scale(${view.scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Crown() {
  return (
    <svg viewBox="0 0 64 46" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="winner-crown-gold" x1="8" y1="6" x2="56" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff9d8" />
          <stop offset="0.45" stopColor="#ffd76a" />
          <stop offset="1" stopColor="#c98a12" />
        </linearGradient>
      </defs>
      <path
        d="M3 38 7 9l14 11L32 3l11 17 14-11 4 29H3Z"
        fill="url(#winner-crown-gold)"
        stroke="#fff3bd"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M6 38h52" stroke="#8a5a12" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
      <circle cx="7" cy="8" r="2.6" fill="#fff8d8" />
      <circle cx="32" cy="3" r="2.7" fill="#fff8d8" />
      <circle cx="57" cy="8" r="2.6" fill="#fff8d8" />
    </svg>
  );
}

interface WinnerCardProps {
  tier: TierName;
  row: ResolvedPrize;
  onOpen: (game: JamGame) => void;
}

function WinnerCard({ tier, row, onOpen }: WinnerCardProps) {
  const { prize, game } = row;
  const place = prize.place ?? (tier === 'gold' ? 1 : tier === 'silver' ? 2 : 3);

  return (
    <article className={`winner-card winner-card--${tier}`}>
      <button
        type="button"
        className="winner-card__poster"
        onClick={() => game && onOpen(game)}
        disabled={!game}
        aria-label={game ? `Play ${game.title}` : prize.title}
      >
        {game?.thumbnailUrl ? (
          <>
            <span
              className="winner-card__poster-bg"
              style={{ backgroundImage: `url("${game.thumbnailUrl}")` }}
              aria-hidden="true"
            />
            <img
              src={game.thumbnailUrl}
              alt=""
              referrerPolicy="strict-origin-when-cross-origin"
              draggable={false}
            />
          </>
        ) : (
          <span className="winner-card__fallback" aria-hidden="true">
            {prize.title.slice(0, 2)}
          </span>
        )}
        <span className="winner-card__poster-fade" aria-hidden="true" />
        {game ? <span className="winner-card__play">Play game</span> : null}
      </button>
      <div className="winner-card__info">
        <p className="winner-card__eyebrow">
          <span>{ordinal(place)}</span>
          <i aria-hidden="true" />
          {prize.category}
        </p>
        <h3 className="winner-card__title">{prize.title}</h3>
        <p className="winner-card__creator">
          {game?.creatorName ? `by ${game.creatorName}` : 'Creator to be announced'}
        </p>
        <p className="winner-card__amount">{formatPrizeMoney(prize.amount)}</p>
      </div>
      <span className="winner-card__shine" aria-hidden="true" />
    </article>
  );
}

function Tier({
  tier,
  row,
  onOpen,
  delay,
}: {
  tier: TierName;
  row: ResolvedPrize;
  onOpen: (game: JamGame) => void;
  delay: number;
}) {
  const rank = tier === 'gold' ? '1' : tier === 'silver' ? '2' : '3';
  return (
    <div className={`tier tier--${tier}`} style={{ '--drop-delay': `${delay}ms` } as CSSProperties}>
      <span className="tier__beam" aria-hidden="true" />
      <div className="tier__stack">
        <div className="winner-drop">
          {tier === 'gold' ? (
            <span className="winner-card__crown" aria-hidden="true">
              <Crown />
            </span>
          ) : null}
          <WinnerCard tier={tier} row={row} onOpen={onOpen} />
        </div>
        <div className="tier__podium">
          <span className="tier__impact" aria-hidden="true" />
          <span className="tier__medallion" aria-hidden="true">
            {rank}
          </span>
          <span className="tier__label">{TIER_LABEL[tier]}</span>
        </div>
      </div>
    </div>
  );
}

function RunnerUp({ row, onOpen }: { row: ResolvedPrize; onOpen: (game: JamGame) => void }) {
  const { prize, game } = row;
  const place = prize.place ?? 4;
  return (
    <article className="runner">
      <span className="runner__medal" aria-hidden="true">
        {place}
      </span>
      <button
        type="button"
        className="runner__poster"
        onClick={() => game && onOpen(game)}
        disabled={!game}
        aria-label={game ? `Play ${game.title}` : prize.title}
      >
        {game?.thumbnailUrl ? (
          <>
            <span
              className="runner__poster-bg"
              style={{ backgroundImage: `url("${game.thumbnailUrl}")` }}
              aria-hidden="true"
            />
            <img
              src={game.thumbnailUrl}
              alt=""
              referrerPolicy="strict-origin-when-cross-origin"
              draggable={false}
            />
          </>
        ) : (
          <span aria-hidden="true">{prize.title.slice(0, 2)}</span>
        )}
      </button>
      <div className="runner__copy">
        <p className="runner__eyebrow">
          {ordinal(place)} place · {prize.category}
        </p>
        <h3 className="runner__title">{prize.title}</h3>
        <p className="runner__creator">
          {game?.creatorName ? `by ${game.creatorName}` : 'Creator to be announced'}
        </p>
      </div>
      <p className="runner__amount">{formatPrizeMoney(prize.amount)}</p>
    </article>
  );
}

interface PodiumSceneProps {
  gold: ResolvedPrize;
  silver: ResolvedPrize;
  bronze: ResolvedPrize;
  finalists?: ResolvedPrize[];
  onOpen: (game: JamGame) => void;
  note?: string;
}

export function PodiumScene({ gold, silver, bronze, finalists = [], onOpen, note }: PodiumSceneProps) {
  return (
    <div className={`award-scene award-scene--podium${finalists.length > 0 ? ' has-finalists' : ''}`}>
      <div className="award-scene__halo" aria-hidden="true" />
      <div className="award-scene__rays" aria-hidden="true" />
      <div className="award-scene__stars" aria-hidden="true" />
      <div className="award-scene__floor" aria-hidden="true" />
      {note ? <p className="award-scene__note">{note}</p> : null}
      <div className="podium-row">
        <Tier tier="silver" row={silver} onOpen={onOpen} delay={90} />
        <Tier tier="gold" row={gold} onOpen={onOpen} delay={430} />
        <Tier tier="bronze" row={bronze} onOpen={onOpen} delay={250} />
      </div>
      {finalists.length > 0 ? (
        <div className="runner-rail">
          {finalists.map((row) => (
            <RunnerUp key={row.prize.id} row={row} onOpen={onOpen} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export type SpecialKind = 'sticky' | 'money' | 'social' | 'theme';

export interface SpecialItem {
  kind: SpecialKind;
  row: ResolvedPrize;
}

function SpecialIcon({ kind }: { kind: SpecialKind }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  if (kind === 'sticky') {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path {...common} d="M16 4.5 19.1 11l7 .9-5.2 4.8 1.4 7L16 20.5l-6.3 3.2 1.4-7L5.9 11l7-.9Z" />
        <path {...common} d="M16 23.5V28" />
      </svg>
    );
  }
  if (kind === 'money') {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <circle {...common} cx="16" cy="16" r="10.5" />
        <path {...common} d="M16 9v14M12.6 12.4c.8-.9 1.9-1.3 3.4-1.3 1.8 0 2.8.8 2.8 2s-1 1.8-2.9 2.2c-1.8.4-3 1-3 2.3 0 1.2 1.1 2.1 3.1 2.1 1.6 0 2.7-.5 3.4-1.4" />
      </svg>
    );
  }
  if (kind === 'social') {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <circle {...common} cx="9.5" cy="16" r="3.4" />
        <circle {...common} cx="22.5" cy="9.5" r="3.4" />
        <circle {...common} cx="22.5" cy="22.5" r="3.4" />
        <path {...common} d="m12.6 14.4 7.1-3.3M12.6 17.6l7.1 3.3" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path {...common} d="M21.4 20.2A9 9 0 0 1 11.8 6.7a8 8 0 1 0 9.6 13.5Z" />
      <path {...common} d="m23 8 .8 2.2L26 11l-2.2.8L23 14l-.8-2.2L20 11l2.2-.8Z" />
    </svg>
  );
}

export function SpecialScene({
  items,
  onOpen,
}: {
  items: SpecialItem[];
  onOpen: (game: JamGame) => void;
}) {
  return (
    <div className="award-scene award-scene--specials">
      <div className="award-scene__halo" aria-hidden="true" />
      <div className="award-scene__rays" aria-hidden="true" />
      <div className="award-scene__stars" aria-hidden="true" />
      <div className="award-scene__floor" aria-hidden="true" />
      <p className="award-scene__note">Special category honors · $500 each</p>
      <div className="special-grid">
        {items.map(({ kind, row }, index) => {
          const { prize, game } = row;
          return (
            <article
              key={prize.id}
              className={`special-card special-card--${kind}`}
              style={{ '--drop-delay': `${120 + index * 95}ms` } as CSSProperties}
            >
              <span className="special-card__glow" aria-hidden="true" />
              <div className="special-card__icon">
                <SpecialIcon kind={kind} />
              </div>
              <p className="special-card__award">{prize.category}</p>
              <button
                type="button"
                className="special-card__poster"
                onClick={() => game && onOpen(game)}
                disabled={!game}
                aria-label={game ? `Play ${game.title}` : prize.title}
              >
                {game?.thumbnailUrl ? (
                  <>
                    <span
                      className="special-card__poster-bg"
                      style={{ backgroundImage: `url("${game.thumbnailUrl}")` }}
                      aria-hidden="true"
                    />
                    <img
                      src={game.thumbnailUrl}
                      alt=""
                      referrerPolicy="strict-origin-when-cross-origin"
                      draggable={false}
                    />
                  </>
                ) : (
                  <span aria-hidden="true">{prize.title.slice(0, 2)}</span>
                )}
              </button>
              <h3 className="special-card__title">{prize.title}</h3>
              <p className="special-card__creator">
                {game?.creatorName ? `by ${game.creatorName}` : 'Creator to be announced'}
              </p>
              <p className="special-card__amount">{formatPrizeMoney(prize.amount)}</p>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function StoryScene({ rows }: { rows: ResolvedPrize[] }) {
  return (
    <div className="award-scene award-scene--story">
      <div className="award-scene__halo" aria-hidden="true" />
      <div className="award-scene__rays" aria-hidden="true" />
      <div className="award-scene__stars" aria-hidden="true" />
      <div className="award-scene__floor" aria-hidden="true" />
      <p className="award-scene__note">Story and video honors</p>
      <div className="story-grid">
        {rows.map(({ prize }, index) => {
          const metal =
            prize.metal === 'gold' || prize.metal === 'silver' || prize.metal === 'bronze'
              ? prize.metal
              : 'bronze';
          const place = prize.place ?? index + 1;
          return (
            <article
              key={prize.id}
              className={`story-card story-card--${metal}`}
              style={{ '--drop-delay': `${120 + index * 110}ms` } as CSSProperties}
            >
              <span className="story-card__ghost" aria-hidden="true">
                {place}
              </span>
              <span className="story-card__medal" aria-hidden="true">
                {place}
              </span>
              <div className="story-card__copy">
                <p className="story-card__eyebrow">
                  {ordinal(place)} place · {prize.category}
                </p>
                <h3 className="story-card__title">{prize.title}</h3>
                <span className="story-card__rule" aria-hidden="true" />
                <p className="story-card__amount">{formatPrizeMoney(prize.amount)}</p>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
