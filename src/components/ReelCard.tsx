import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import type { JamGame } from '../types';
import { DescriptionTooltip } from './DescriptionTooltip';
import { GameThumbnail } from './GameThumbnail';

interface ReelCardProps {
  reelIndex: 0 | 1 | 2;
  game: JamGame;
  pool: JamGame[];
  reelSpinning: boolean;
  /** Winner for this reel during an active roll (known at spin start). */
  spinTarget: JamGame | null;
  justLanded: boolean;
  highlight: boolean;
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
  if (len > 32) return 'text-[0.95rem] leading-tight sm:text-[1.05rem]';
  if (len > 22) return 'text-[1.05rem] leading-snug sm:text-[1.1rem]';
  return 'text-[1.1rem] leading-snug sm:text-[1.15rem]';
}

function buildSpinStrip(pool: JamGame[], target: JamGame | null): JamGame[] {
  if (pool.length === 0) return target ? [target] : [];
  const prefix = Array.from({ length: STRIP_PREFIX }, () => pickFromPool(pool));
  const end = target ?? pickFromPool(pool);
  return [...prefix, end];
}

export function ReelCard({
  reelIndex,
  game,
  pool,
  reelSpinning,
  spinTarget,
  justLanded,
  highlight,
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

    const spinStrip = buildSpinStrip(pool, spinTarget);
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
      const t = window.setTimeout(() => setLanding(false), LAND_MS);
      return () => {
        cancelAnimationFrame(frame);
        window.clearTimeout(t);
      };
    }

  }, [reelSpinning, game, pool, cellHeight, stopSpinLoop, setOffset]);

  useEffect(() => {
    if (reelSpinning || landing) return;
    setStrip([game]);
    setOffset(0);
  }, [game, reelSpinning, landing, setOffset]);

  const infoLocked = disabled || reelSpinning;
  const playInvitePaused = infoLocked;
  const tooltipDescription = reelSpinning ? '' : game.description;

  const stripStyle = {
    transform: `translate3d(0, ${offsetY}px, 0)`,
    transition: landing ? `transform ${LAND_MS}ms cubic-bezier(0.22, 1, 0.36, 1)` : 'none',
  } as const;

  return (
    <article
      className={`reel-card flex h-full min-h-0 flex-col overflow-hidden rounded-xl border-2 bg-zinc-950/80 backdrop-blur sm:rounded-2xl ${
        highlight ? 'reel-highlight border-amber-300' : 'border-violet-500/40'
      } ${reelSpinning ? 'reel-active' : ''} ${justLanded ? 'reel-landed' : ''} ${
        disabled ? 'pointer-events-none' : ''
      }`}
    >
      <button
        type="button"
        className="relative block w-full shrink-0 overflow-hidden text-left"
        onClick={onPlay}
        aria-label={`Play ${game.title}`}
        aria-busy={reelSpinning}
      >
        <DescriptionTooltip
          description={tooltipDescription}
          disabled={infoLocked}
          placement="above"
        >
          <div
            ref={windowRef}
            className="reel-thumb-window relative aspect-[2/3] w-full max-h-[min(36dvh,17.5rem)] overflow-hidden bg-zinc-900 sm:max-h-[min(42dvh,20rem)] lg:max-h-[min(45dvh,22rem)]"
            style={
              cellHeight > 0
                ? ({ '--reel-cell-h': `${cellHeight}px` } as CSSProperties)
                : undefined
            }
          >
            <div
              className={`reel-strip ${reelSpinning ? 'reel-strip-spinning' : ''} ${landing ? 'reel-strip-landing' : ''}`}
              style={stripStyle}
            >
              {strip.map((g, i) => (
                <div key={`${g.gameId}-${i}`} className="reel-strip-cell">
                  <GameThumbnail url={g.thumbnailUrl} title={g.title} />
                </div>
              ))}
            </div>
            <div className="reel-window-shade reel-window-shade-top pointer-events-none" aria-hidden />
            <div className="reel-window-shade reel-window-shade-bottom pointer-events-none" aria-hidden />
            {reelSpinning && (
              <div className="reel-scanlines pointer-events-none absolute inset-0" aria-hidden />
            )}
          </div>
        </DescriptionTooltip>
      </button>

      <button
        type="button"
        className={`reel-play-row reel-play-row--${reelIndex} mx-1.5 mt-1.5 w-[calc(100%-0.75rem)] shrink-0 rounded-xl bg-amber-400/95 py-2 text-center text-[1.1rem] font-bold text-black shadow-md sm:mx-3 sm:mt-2 sm:py-2.5 sm:text-[1.15rem] ${
          playInvitePaused ? 'reel-play-row--paused pointer-events-none opacity-0' : ''
        }`}
        onClick={onPlay}
        aria-label={`Play ${game.title}`}
        tabIndex={playInvitePaused ? -1 : 0}
      >
        <span className="reel-play-row-inner inline-block">Play</span>
      </button>

      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-1 border-t border-white/10 px-1.5 pt-1 sm:gap-x-2 sm:px-3 sm:pt-2">
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
          className={`col-start-1 min-w-0 truncate pb-1.5 text-left text-[1.05rem] text-violet-200/90 sm:text-[1.1rem] ${
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
    </article>
  );
}
