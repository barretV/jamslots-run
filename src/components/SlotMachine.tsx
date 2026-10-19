import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { pickRandom } from '../lib/games';
import { getPlayUrl } from '../lib/playUrl';
import {
  parseLegacyFavoritesFromLocation,
  parseShortShareCodeFromLocation,
  resolveShortShareCode,
} from '../lib/shareFavoritesUrl';
import { useReducedMotion } from '../lib/useReducedMotion';
import {
  getStats,
  isFavorite,
  pruneStatsToJamPool,
  recordPlay,
  toggleFavorite,
} from '../state/persistence';
import type { HistoryEntry, JamGame } from '../types';
import { useFavoriteCounts } from './FavoriteCountsProvider';
import { FavoritesList } from './FavoritesList';
import { LibraryList } from './LibraryList';
import { GameDescriptionModal } from './GameDescriptionModal';
import { PlayedList } from './PlayedList';
import { ReelCard } from './ReelCard';
import { JamMetaBar } from './JamMetaBar';
import { PickerSidePanel } from './PickerSidePanel';
import { ShareFavoritesButton } from './ShareFavoritesButton';
import { SharedFavoritesBanner } from './SharedFavoritesBanner';
import { TabBar, type PickerTab } from './TabBar';

const BASE_SPIN_MS = 1200;
const REEL_STAGGER_MS = [0, 250, 500];
const INTRO_ROLL_DELAY_MS = 480;

let introRollFired = false;

interface SlotMachineProps {
  pool: JamGame[];
  jamName: string;
  jamSlug: string;
  syncedAt: number;
  votingCloseAt?: number;
}

export function SlotMachine({ pool, jamName, jamSlug, syncedAt, votingCloseAt }: SlotMachineProps) {
  const { applyDelta } = useFavoriteCounts();
  const reducedMotion = useReducedMotion();
  const [triplet, setTriplet] = useState<JamGame[]>(() => pickRandom(pool, 3));
  const [reelSpinning, setReelSpinning] = useState<[boolean, boolean, boolean]>([
    false,
    false,
    false,
  ]);
  const [landedReels, setLandedReels] = useState<[boolean, boolean, boolean]>([
    false,
    false,
    false,
  ]);
  const [spinning, setSpinning] = useState(false);
  const [jackpotFlash, setJackpotFlash] = useState(false);
  const [frameShake, setFrameShake] = useState(false);
  const [statsTick, setStatsTick] = useState(0);
  const [descriptionGame, setDescriptionGame] = useState<JamGame | null>(null);
  const [spinTargets, setSpinTargets] = useState<JamGame[] | null>(null);
  const initialShortCode = parseShortShareCodeFromLocation();
  const initialLegacyFavs = parseLegacyFavoritesFromLocation();
  const [sharedFavoriteIds, setSharedFavoriteIds] = useState<string[] | null>(() =>
    initialLegacyFavs,
  );
  const [sharedLinkState, setSharedLinkState] = useState<'idle' | 'loading' | 'error'>(() =>
    initialShortCode ? 'loading' : 'idle',
  );
  const [sharedViewActive, setSharedViewActive] = useState(
    () => Boolean(initialShortCode || initialLegacyFavs?.length),
  );
  const [activeTab, setActiveTab] = useState<PickerTab>(() =>
    initialShortCode || initialLegacyFavs?.length ? 'favorites' : 'slots',
  );
  const [onlyUnplayed, setOnlyUnplayed] = useState(false);
  const [lockedReels, setLockedReels] = useState<[boolean, boolean, boolean]>([
    false,
    false,
    false,
  ]);
  const timersRef = useRef<number[]>([]);

  const refreshStats = () => setStatsTick((n) => n + 1);

  const toggleFavoriteWithCount = useCallback(
    (gameId: string) => {
      const wasFavorite = isFavorite(gameId);
      toggleFavorite(gameId);
      applyDelta(gameId, wasFavorite ? -1 : 1);
      refreshStats();
    },
    [applyDelta],
  );

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  useEffect(() => {
    const code = parseShortShareCodeFromLocation();
    if (!code) return;
    let cancelled = false;
    setSharedViewActive(true);
    setSharedLinkState('loading');
    setActiveTab('favorites');
    void resolveShortShareCode(code).then((ids) => {
      if (cancelled) return;
      if (ids?.length) {
        setSharedFavoriteIds(ids);
        setSharedLinkState('idle');
      } else {
        setSharedFavoriteIds(null);
        setSharedLinkState('error');
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = getStats();
  void statsTick;

  const poolIds = useMemo(() => new Set(pool.map((g) => g.gameId)), [pool]);
  const poolSignature = useMemo(
    () => pool.map((g) => g.gameId).sort().join('\n'),
    [pool],
  );

  useEffect(() => {
    if (poolIds.size === 0) return;
    if (pruneStatsToJamPool(poolIds)) refreshStats();
  }, [poolSignature, poolIds]);

  useEffect(() => {
    if (pool.length < 3) return;
    setTriplet((prev) => {
      if (prev.length === 3 && prev.every((g) => poolIds.has(g.gameId))) return prev;
      return pickRandom(pool, 3);
    });
  }, [poolSignature, pool, poolIds]);

  const playedIds = useMemo(
    () => new Set(stats.history.map((h) => h.gameId)),
    [stats.history],
  );

  const uniquePlayedInJam = useMemo(() => {
    if (pool.length === 0) return 0;
    const poolIds = new Set(pool.map((g) => g.gameId));
    let n = 0;
    for (const id of playedIds) {
      if (poolIds.has(id)) n += 1;
    }
    return n;
  }, [pool, playedIds]);

  const unplayedCount = useMemo(
    () => pool.filter((g) => !playedIds.has(g.gameId)).length,
    [pool, playedIds],
  );

  const stripPool = useMemo(() => {
    if (!onlyUnplayed) return pool;
    const unplayed = pool.filter((g) => !playedIds.has(g.gameId));
    return unplayed.length >= 3 ? unplayed : pool;
  }, [pool, onlyUnplayed, playedIds]);

  const pickExclude = useMemo(() => {
    return onlyUnplayed ? playedIds : new Set<string>();
  }, [onlyUnplayed, playedIds]);

  const buildRollResult = useCallback(
    (current: JamGame[], locks: [boolean, boolean, boolean]): JamGame[] | null => {
      const unlocked = ([0, 1, 2] as const).filter((i) => !locks[i]);
      if (unlocked.length === 0) return null;

      const exclude = new Set(pickExclude);
      for (let i = 0; i < 3; i++) {
        if (locks[i]) exclude.add(current[i].gameId);
      }

      const picks = pickRandom(pool, unlocked.length, exclude);
      const next = [...current] as JamGame[];
      unlocked.forEach((reelIndex, pickIndex) => {
        next[reelIndex] = picks[pickIndex];
      });
      return next;
    },
    [pool, pickExclude],
  );

  const lockedCount = lockedReels.filter(Boolean).length;

  const toggleReelLock = useCallback(
    (reelIndex: 0 | 1 | 2) => {
      if (spinning || reelSpinning.some(Boolean)) return;
      setLockedReels((prev) => {
        const next = [...prev] as [boolean, boolean, boolean];
        if (next[reelIndex]) {
          next[reelIndex] = false;
          return next;
        }
        if (prev.filter(Boolean).length >= 2) return prev;
        next[reelIndex] = true;
        return next;
      });
    },
    [spinning, reelSpinning],
  );

  const roll = useCallback(() => {
    if (spinning || pool.length < 3) return;
    clearTimers();

    const next = buildRollResult(triplet, lockedReels);
    if (!next) return;

    const spinMask: [boolean, boolean, boolean] = [
      !lockedReels[0],
      !lockedReels[1],
      !lockedReels[2],
    ];

    if (reducedMotion) {
      setSpinTargets(null);
      setTriplet(next);
      setReelSpinning([false, false, false]);
      setLandedReels([false, false, false]);
      return;
    }

    setSpinTargets(next);
    setSpinning(true);
    setReelSpinning(spinMask);
    setLandedReels([false, false, false]);
    setJackpotFlash(false);
    setFrameShake(false);

    const unlockedIndices = ([0, 1, 2] as const).filter((i) => spinMask[i]);
    const lastToLand = unlockedIndices[unlockedIndices.length - 1];

    unlockedIndices.forEach((reelIndex) => {
      const stagger = REEL_STAGGER_MS[reelIndex];
      const stopAt = BASE_SPIN_MS + stagger;
      const landId = window.setTimeout(() => {
        setTriplet((prev) => {
          const updated = [...prev] as JamGame[];
          updated[reelIndex] = next[reelIndex];
          return updated;
        });
        setReelSpinning((prev) => {
          const updated = [...prev] as [boolean, boolean, boolean];
          updated[reelIndex] = false;
          return updated;
        });
        setLandedReels((prev) => {
          const updated = [...prev] as [boolean, boolean, boolean];
          updated[reelIndex] = true;
          return updated;
        });
        window.setTimeout(() => {
          setLandedReels((prev) => {
            const updated = [...prev] as [boolean, boolean, boolean];
            updated[reelIndex] = false;
            return updated;
          });
        }, 520);

        if (reelIndex === lastToLand) {
          setSpinning(false);
          setJackpotFlash(true);
          setFrameShake(true);
          setSpinTargets(null);
          window.setTimeout(() => setJackpotFlash(false), 700);
          window.setTimeout(() => setFrameShake(false), 400);
        }
      }, stopAt);
      timersRef.current.push(landId);
    });
  }, [
    pool,
    spinning,
    reducedMotion,
    clearTimers,
    triplet,
    lockedReels,
    buildRollResult,
  ]);

  useEffect(() => {
    if (triplet.length === 0 && pool.length > 0) {
      setTriplet(pickRandom(pool, 3));
    }
  }, [pool, triplet.length]);

  useEffect(() => {
    if (introRollFired || pool.length < 3) return;
    introRollFired = true;
    const delay = reducedMotion ? 0 : INTRO_ROLL_DELAY_MS;
    const id = window.setTimeout(() => roll(), delay);
    return () => window.clearTimeout(id);
  }, [pool.length, reducedMotion, roll]);

  const anyReelSpinning = reelSpinning.some(Boolean);
  const interactionLocked = spinning || anyReelSpinning;

  const launchGame = useCallback((game: JamGame) => {
    const url = getPlayUrl(game);
    recordPlay(game.gameId, game.title, url);
    refreshStats();
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  const playFromReel = useCallback(
    (game: JamGame) => {
      if (interactionLocked) return;
      launchGame(game);
    },
    [interactionLocked, launchGame],
  );

  const openFromHistory = useCallback(
    (entry: HistoryEntry) => {
      const fromPool = pool.find((g) => g.gameId === entry.gameId);
      const url = fromPool ? getPlayUrl(fromPool) : entry.shareUrl;
      recordPlay(entry.gameId, entry.title, url);
      refreshStats();
      window.open(url, '_blank', 'noopener,noreferrer');
    },
    [pool],
  );

  const favoriteGames = useMemo(
    () =>
      stats.favorites
        .map((id) => pool.find((g) => g.gameId === id))
        .filter((g): g is JamGame => g != null),
    [stats.favorites, pool],
  );

  const sharedFavoriteGames = useMemo(() => {
    if (!sharedFavoriteIds?.length) return [];
    const byId = new Map(pool.map((g) => [g.gameId, g]));
    return sharedFavoriteIds
      .map((id) => byId.get(id))
      .filter((g): g is JamGame => g != null);
  }, [pool, sharedFavoriteIds]);

  const dismissSharedView = useCallback(() => {
    setSharedFavoriteIds(null);
    setSharedViewActive(false);
    setSharedLinkState('idle');
  }, []);

  return (
    <div className="app-layout">
      <PickerSidePanel jamSlug={jamSlug} />
      <div className="app-layout__main">
        <div className="app-shell mx-auto w-full max-w-4xl">
      <header className="app-header shrink-0">
        <div className="app-header-top">
          <h1 className="app-title font-display font-black uppercase tracking-tight text-transparent bg-gradient-to-r from-amber-300 via-fuchsia-400 to-cyan-300 bg-clip-text">
            JamSlots
          </h1>
        </div>
        <JamMetaBar
          jamName={jamName}
          gameCount={pool.length}
          syncedAt={syncedAt}
          votingCloseAt={votingCloseAt}
        />
      </header>

      <div className="app-tab-rail shrink-0">
        <TabBar
          active={activeTab}
          onChange={setActiveTab}
          favoriteCount={favoriteGames.length}
          playedCount={uniquePlayedInJam}
          totalJamGames={pool.length}
        />
      </div>

      <main className="app-main min-h-0 flex-1">
        {activeTab === 'slots' && (
          <div
            id="panel-slots"
            role="tabpanel"
            aria-labelledby="tab-slots"
            className={`slot-frame tab-panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-fuchsia-500/30 bg-gradient-to-b from-violet-950/60 to-black/80 p-1.5 shadow-[inset_0_0_60px_rgba(168,85,247,0.15)] sm:rounded-3xl sm:p-4 md:p-5 ${
              jackpotFlash ? 'jackpot-flash' : ''
            } ${frameShake ? 'slot-shake' : ''}`}
          >
            <div
              className="reel-grid min-h-0 flex-1"
              role="group"
              aria-label="Slot reels"
              aria-busy={interactionLocked}
            >
              {triplet.map((game, reelIndex) => (
                <ReelCard
                  key={reelIndex}
                  reelIndex={reelIndex as 0 | 1 | 2}
                  jamSlug={jamSlug}
                  game={game}
                  pool={stripPool}
                  reelSpinning={reelSpinning[reelIndex]}
                  spinTarget={spinTargets?.[reelIndex] ?? null}
                  justLanded={landedReels[reelIndex]}
                  highlight={!interactionLocked && !lockedReels[reelIndex]}
                  locked={lockedReels[reelIndex]}
                  lockDisabled={
                    interactionLocked ||
                    (!lockedReels[reelIndex] && lockedCount >= 2)
                  }
                  onToggleLock={() => toggleReelLock(reelIndex as 0 | 1 | 2)}
                  disabled={interactionLocked}
                  favorited={isFavorite(game.gameId)}
                  onPlay={() => playFromReel(game)}
                  onShowDescription={() => setDescriptionGame(game)}
                  onToggleFavorite={() => toggleFavoriteWithCount(game.gameId)}
                />
              ))}
            </div>

            <div className="slot-footer mt-1.5 shrink-0 sm:mt-3">
              {onlyUnplayed && unplayedCount < 3 && (
                <p className="slot-footer-hint mb-1.5 px-1 text-center text-[1.1rem] leading-snug text-amber-200/85 sm:mb-2 sm:max-w-sm sm:px-2">
                  {unplayedCount === 0
                    ? 'You have played every game. Rolls use the full list.'
                    : 'Few unplayed games left. Rolls may include games you already played.'}
                </p>
              )}
              <div className="slot-footer-row">
                <label
                  className={`slot-footer-unplayed flex cursor-pointer items-center gap-2 text-[1.1rem] text-violet-100/90 ${
                    interactionLocked ? 'pointer-events-none opacity-50' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    className="size-[1.15rem] shrink-0 rounded border-violet-400/60 accent-fuchsia-400"
                    checked={onlyUnplayed}
                    onChange={(e) => setOnlyUnplayed(e.target.checked)}
                    disabled={interactionLocked}
                  />
                  <span className="leading-tight">Only unplayed</span>
                </label>
                <button
                  type="button"
                  className="slot-btn slot-footer-roll rounded-xl px-4 py-2.5 text-[1.1rem] font-bold uppercase tracking-wide text-black sm:rounded-2xl sm:px-6 sm:py-3.5 sm:text-[1.2rem]"
                  onClick={roll}
                  disabled={interactionLocked || pool.length < 3}
                  aria-busy={interactionLocked}
                >
                  {interactionLocked ? 'Rolling…' : 'Roll again'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'favorites' && (
          <div
            id="panel-favorites"
            role="tabpanel"
            aria-labelledby="tab-favorites"
            className="tab-panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-pink-500/30 bg-gradient-to-b from-pink-950/40 to-black/80 p-2 sm:rounded-3xl sm:p-4 md:p-5"
          >
            {sharedViewActive && sharedLinkState !== 'loading' ? (
              <SharedFavoritesBanner
                matchCount={sharedFavoriteGames.length}
                requestedCount={sharedFavoriteIds?.length ?? 0}
                linkError={sharedLinkState === 'error'}
                onDismiss={dismissSharedView}
              />
            ) : sharedLinkState === 'loading' ? (
              <p className="shared-favorites-loading shrink-0 text-[1.1rem] text-zinc-300">
                Loading shared favorites…
              </p>
            ) : (
              <div className="favorites-tab-actions shrink-0">
                <ShareFavoritesButton gameIds={stats.favorites} />
              </div>
            )}
            <FavoritesList
              games={sharedViewActive ? sharedFavoriteGames : favoriteGames}
              onOpen={launchGame}
              onToggleFavorite={sharedViewActive ? undefined : toggleFavoriteWithCount}
              jamSlug={jamSlug}
              embedded
              emptyMessage={
                sharedLinkState === 'error'
                  ? 'This share link is missing or expired.'
                  : sharedViewActive
                    ? 'None of these games are in the current jam list.'
                    : undefined
              }
            />
          </div>
        )}

        {activeTab === 'played' && (
          <div
            id="panel-played"
            role="tabpanel"
            aria-labelledby="tab-played"
            className="tab-panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-cyan-500/25 bg-gradient-to-b from-cyan-950/35 to-black/80 p-2 sm:rounded-3xl sm:p-4 md:p-5"
          >
            <PlayedList
              entries={stats.history.filter((e) => poolIds.has(e.gameId))}
              jamSlug={jamSlug}
              onOpen={openFromHistory}
              descriptionFor={(gameId) => pool.find((g) => g.gameId === gameId)?.description}
              thumbnailFor={(gameId) => pool.find((g) => g.gameId === gameId)?.thumbnailUrl ?? ''}
              creatorFor={(gameId) => pool.find((g) => g.gameId === gameId)?.creatorName}
              totalPlaysFor={(gameId) => pool.find((g) => g.gameId === gameId)?.totalPlays}
              votesFor={(gameId) => pool.find((g) => g.gameId === gameId)?.votes}
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavoriteWithCount}
              embedded
            />
          </div>
        )}

        {activeTab === 'library' && (
          <div
            id="panel-library"
            role="tabpanel"
            aria-labelledby="tab-library"
            className="tab-panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-violet-500/30 bg-gradient-to-b from-violet-950/45 to-black/80 p-2 sm:rounded-3xl sm:p-4 md:p-5"
          >
            <LibraryList
              games={pool}
              onOpen={launchGame}
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavoriteWithCount}
              jamSlug={jamSlug}
              embedded
            />
          </div>
        )}
      </main>

      <GameDescriptionModal game={descriptionGame} onClose={() => setDescriptionGame(null)} />
        </div>
      </div>
      <div className="app-layout__balance" aria-hidden="true" />
    </div>
  );
}
