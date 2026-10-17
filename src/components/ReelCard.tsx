import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import type { JamGame } from '../types';
import { runJamVoteGameUrl } from '../lib/runVoteUrl';
import { CoverStatsRow } from './CoverStatsRow';
import { CoverVoteBadge } from './CoverVoteBadge';
import { GameThumbnail } from './GameThumbnail';
import { OverflowCrawlText } from './OverflowCrawlText';

function panelDescriptionText(description: string): string {
  return description.trim().replace(/\s+/g, ' ');
}

interface ReelCardProps {
  reelIndex: 0 | 1 | 2;
  jamSlug: string;
  game: JamGame;
  pool: JamGame[];
  reelSpinning: boolean;
  /** Winner for this reel during an active roll (known at spin start). */
  spinTarget: JamGame | null;
  justLanded: boolean;
  highlight: boolean;
  locked: boolean;
  lockDisabled: boolean;
  onToggleLock: () => void;
  onPlay: () => void;
  onShowDescription: () => void;
  onToggleFavorite: () => void;
  favorited: boolean;
  disabled: boolean;
}

const STRIP_PREFIX = 18;
const SPIN_PX_PER_SEC = 4000;
const LAND_MS = 240;

function pickFromPool(pool: JamGame[]): JamGame {
  return pool[Math.floor(Math.random() * pool.length)];
}

function titleTextClass(title: string): string {
  const len = title.length;
  if (len > 28) return 'text-[1.1rem] leading-tight line-clamp-3 sm:text-[1.1rem] sm:line-clamp-2';
  if (len > 18) return 'text-[1.1rem] leading-snug line-clamp-2 sm:text-[1.15rem]';
  return 'text-[1.1rem] leading-snug sm:text-[1.15rem]';
}

function buildSpinStrip(pool: JamGame[], target: JamGame | null): JamGame[] {
  if (pool.length === 0) return target ? [target] : [];
  const prefix = Array.from({ length: STRIP_PREFIX }, () => pickFromPool(pool));
  const end = target ?? pickFromPool(pool);
  return [...prefix, end];
}

function preloadThumbnail(url: string | undefined): void {
  const u = url?.trim();
  if (!u) return;
  const img = new Image();
  img.referrerPolicy = 'no-referrer';
  img.src = u;
}

export function ReelCard({
  reelIndex,
  jamSlug,
  game,
  pool,
  reelSpinning,
  spinTarget,
  justLanded,
  highlight,
  locked,
  lockDisabled,
  onToggleLock,
  onPlay,
  onShowDescription,
  onToggleFavorite,
  favorited,
  disabled,
}: ReelCardProps) {
  const windowRef = useRef<HTMLDivElement>(null);
  const [cellHeight, setCellHeight] = useState(0);
  const [strip, setStrip] = useState<JamGame[]>(() => [game]);
  const [offsetY, setOffsetY] = useState(0);
  const [landing, setLanding] = useState(false);
  const [coverHover, setCoverHover] = useState(false);
  const rafRef = useRef<number>(0);
  const offsetYRef = useRef(0);
  const cellHeightRef = useRef(0);
  const prevSpinning = useRef(reelSpinning);
  const spinStripRef = useRef<JamGame[]>([]);

  const setOffset = useCallback((y: number) => {
    offsetYRef.current = y;
    setOffsetY(y);
  }, []);

  useLayoutEffect(() => {
    const el = windowRef.current;
    if (!el) return;
    const measure = () => {
      const h = el.clientHeight;
      if (h > 0) {
        cellHeightRef.current = h;
        setCellHeight(h);
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const stopSpinLoop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  }, []);

  useEffect(() => {
    if (!reelSpinning) {
      stopSpinLoop();
      return;
    }

    setCoverHover(false);

    const spinStrip = buildSpinStrip(pool, spinTarget);
    for (const g of spinStrip) preloadThumbnail(g.thumbnailUrl);
    spinStripRef.current = spinStrip;
    setStrip(spinStrip);
    setLanding(false);
    setOffset(0);

    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const h = cellHeightRef.current;
      const len = spinStripRef.current.length * h;
      if (h > 0 && len > 0) {
        let next = offsetYRef.current - SPIN_PX_PER_SEC * dt;
        while (next <= -len) next += len;
        setOffset(next);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return stopSpinLoop;
  }, [reelSpinning, pool, spinTarget, cellHeight, stopSpinLoop, setOffset]);

  useEffect(() => {
    const wasSpinning = prevSpinning.current;
    prevSpinning.current = reelSpinning;

    if (wasSpinning && !reelSpinning) {
      stopSpinLoop();
      const h = cellHeightRef.current || cellHeight;
      const active = spinStripRef.current.length > 0 ? spinStripRef.current : buildSpinStrip(pool, game);
      const landStrip =
        active[active.length - 1]?.gameId === game.gameId
          ? active
          : [...active.slice(0, -1), game];
      spinStripRef.current = landStrip;
      setStrip(landStrip);

      const finalY = -(landStrip.length - 1) * h;
      let from = offsetYRef.current;
      const minTravel = h * 2.2;
      const loop = landStrip.length * h;
      if (h > 0 && Math.abs(from - finalY) < minTravel) {
        from -= loop;
      }
      setLanding(false);
      setOffset(from);
      const frame = requestAnimationFrame(() => {
        setLanding(true);
        setOffset(finalY);
      });
      return () => {
        cancelAnimationFrame(frame);
      };
    }

  }, [reelSpinning, game, pool, cellHeight, stopSpinLoop, setOffset]);

  useEffect(() => {
    if (!landing) return;
    const t = window.setTimeout(() => setLanding(false), LAND_MS);
    return () => window.clearTimeout(t);
  }, [landing]);

  useEffect(() => {
    if (reelSpinning || !landing) return;
    const t = window.setTimeout(() => setLanding(false), LAND_MS + 80);
    return () => window.clearTimeout(t);
  }, [reelSpinning, landing]);

  useEffect(() => {
    preloadThumbnail(game.thumbnailUrl);
  }, [game.gameId, game.thumbnailUrl]);

  const showStrip = reelSpinning || landing;
  const infoLocked = disabled || reelSpinning;
  const playInvitePaused = infoLocked;
  const panelDescription = reelSpinning ? '' : panelDescriptionText(game.description);
  const showPanelDescription = coverHover && Boolean(panelDescription) && !infoLocked;

  const stripStyle = {
    transform: `translate3d(0, ${offsetY}px, 0)`,
    transition: landing ? `transform ${LAND_MS}ms cubic-bezier(0.22, 1, 0.36, 1)` : 'none',
  } as const;

  return (
    <article
      className={`reel-card flex h-full min-h-0 flex-col overflow-hidden rounded-xl border-2 bg-zinc-950/80 backdrop-blur sm:rounded-2xl ${
        locked ? 'reel-locked border-cyan-400/70' : highlight ? 'reel-highlight border-amber-300' : 'border-violet-500/40'
      } ${reelSpinning ? 'reel-active' : ''} ${justLanded ? 'reel-landed' : ''} ${
        disabled ? 'pointer-events-none' : ''
      } relative`}
    >
      {!reelSpinning && !disabled && (
        <button
          type="button"
          className={`reel-lock-btn pointer-events-auto absolute left-1 top-1 z-20 flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[1.1rem] font-semibold shadow-md backdrop-blur-sm sm:left-2 sm:top-2 sm:gap-1 sm:rounded-lg sm:px-2 sm:py-1 ${
            locked
              ? 'border-cyan-300/60 bg-cyan-950/90 text-cyan-100'
              : 'border-white/20 bg-black/55 text-zinc-200 hover:bg-black/75'
          } ${lockDisabled ? 'pointer-events-none opacity-40' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            if (!lockDisabled) onToggleLock();
          }}
          disabled={lockDisabled}
          aria-label={locked ? `Unlock reel ${reelIndex + 1}` : `Lock reel ${reelIndex + 1}`}
          aria-pressed={locked}
        >
          <span aria-hidden>{locked ? '📌' : '○'}</span>
          <span className="hidden sm:inline">{locked ? 'Locked' : 'Lock'}</span>
        </button>
      )}
      <button
        type="button"
        className="reel-thumb-trigger relative w-full overflow-hidden text-left"
        onClick={onPlay}
        aria-label={`Play ${game.title}`}
        aria-busy={reelSpinning}
      >
        <div
          ref={windowRef}
          className="reel-thumb-window relative overflow-hidden bg-zinc-900"
          style={
            cellHeight > 0
              ? ({ '--reel-cell-h': `${cellHeight}px` } as CSSProperties)
              : undefined
          }
          onMouseEnter={() => {
            if (!infoLocked) setCoverHover(true);
          }}
          onMouseLeave={() => setCoverHover(false)}
        >
          {showStrip ? (
            <div
              className={`reel-strip ${reelSpinning ? 'reel-strip-spinning' : ''} ${landing ? 'reel-strip-landing' : ''}`}
              style={stripStyle}
            >
              {strip.map((g, i) => (
                <div key={`${g.gameId}-${i}`} className="reel-strip-cell">
                  <GameThumbnail
                    url={g.thumbnailUrl}
                    title={g.title}
                    loading="eager"
                    fit="cover"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="reel-idle-thumb">
              <GameThumbnail
                key={game.gameId}
                url={game.thumbnailUrl}
                title={game.title}
                loading="eager"
                fit="cover"
              />
            </div>
          )}
          <div className="reel-window-shade reel-window-shade-top pointer-events-none" aria-hidden />
          <div className="reel-window-shade reel-window-shade-bottom pointer-events-none" aria-hidden />
          {reelSpinning && (
            <div className="reel-scanlines pointer-events-none absolute inset-0" aria-hidden />
          )}
        </div>
        {!reelSpinning && (
          <CoverStatsRow
            gameId={game.gameId}
            totalPlays={game.totalPlays}
            className="reel-cover-stats-row"
          />
        )}
      </button>
      {!reelSpinning && (
        <CoverVoteBadge
          votes={game.votes}
          voteUrl={runJamVoteGameUrl(jamSlug, game.gameId)}
          className="reel-cover-vote-badge"
        />
      )}

      <button
        type="button"
        className={`reel-play-row reel-play-row--${reelIndex} mx-1 mt-1 w-[calc(100%-0.5rem)] shrink-0 rounded-lg bg-amber-400/95 py-1.5 text-center text-[1.1rem] font-bold text-black sm:mx-3 sm:mt-2 sm:w-[calc(100%-1.5rem)] sm:rounded-xl sm:py-2.5 sm:text-[1.15rem] ${
          playInvitePaused ? 'reel-play-row--paused pointer-events-none opacity-0' : ''
        }`}
        onClick={onPlay}
        aria-label={`Play ${game.title}`}
        tabIndex={playInvitePaused ? -1 : 0}
      >
        <span className="reel-play-row-inner inline-flex">
          {'Play'.split('').map((letter, i) => (
            <span
              key={i}
              className="reel-play-letter"
              style={{ animationDelay: `${reelIndex * 0.28 + i * 0.12}s` }}
            >
              {letter}
            </span>
          ))}
        </span>
      </button>

      <div
        className={`reel-meta-panel border-t border-white/10 px-1.5 sm:px-3 ${
          showPanelDescription ? 'reel-meta-panel--desc' : ''
        }`}
      >
        <div className="reel-meta-stack">
          <div className="reel-meta-face reel-meta-face--info">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-1 pt-1 sm:gap-x-2 sm:pt-2">
              <button
                type="button"
                className={`line-clamp-2 min-w-0 text-left font-display font-bold text-amber-50 ${titleTextClass(game.title)} ${
                  reelSpinning ? 'pointer-events-none opacity-40' : 'hover:text-amber-100'
                }`}
                onClick={() => {
                  if (!infoLocked) onShowDescription();
                }}
                disabled={infoLocked}
                aria-label={`About ${game.title}`}
              >
                {reelSpinning ? '…' : game.title}
              </button>
              <button
                type="button"
                className={`row-span-2 shrink-0 rounded-lg px-1.5 py-0.5 text-[1.25rem] leading-none transition sm:px-2 sm:py-1 ${
                  favorited ? 'text-pink-400' : 'text-zinc-400 hover:text-pink-300'
                } ${reelSpinning ? 'invisible' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite();
                }}
                aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
                tabIndex={reelSpinning ? -1 : 0}
              >
                {favorited ? '★' : '☆'}
              </button>
              <button
                type="button"
                className={`col-start-1 min-w-0 truncate pb-1.5 text-left text-[1.1rem] text-violet-200/90 sm:pb-2.5 ${
                  reelSpinning ? 'pointer-events-none' : 'hover:text-violet-100'
                }`}
                onClick={() => {
                  if (!infoLocked) onShowDescription();
                }}
                disabled={infoLocked}
                aria-label={`About ${game.title}`}
              >
                {reelSpinning ? 'Rolling…' : `by ${game.creatorName}`}
              </button>
            </div>
          </div>
          {panelDescription ? (
            <OverflowCrawlText
              active={showPanelDescription}
              className="reel-meta-face reel-meta-face--desc pb-1.5 pt-1 text-[1.1rem] leading-snug text-zinc-300 sm:pt-2"
              aria-hidden={!showPanelDescription}
            >
              {panelDescription}
            </OverflowCrawlText>
          ) : null}
        </div>
      </div>
    </article>
  );
}
