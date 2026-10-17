import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { pickRandom } from '../lib/games';
import { useReducedMotion } from '../lib/useReducedMotion';
import {
  getStats,
  isFavorite,
  recordPlay,
  toggleFavorite,
  totalPlays,
} from '../state/persistence';
import type { HistoryEntry, JamGame } from '../types';
import { FavoritesList } from './FavoritesList';
import { GameDescriptionModal } from './GameDescriptionModal';
import { PlayedList } from './PlayedList';
import { ReelCard } from './ReelCard';
import { TabBar, type PickerTab } from './TabBar';

const BASE_SPIN_MS = 1200;
const REEL_STAGGER_MS = [0, 250, 500];

interface SlotMachineProps {
  pool: JamGame[];
  jamName: string;
}

export function SlotMachine({ pool, jamName }: SlotMachineProps) {
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
  const [activeTab, setActiveTab] = useState<PickerTab>('slots');
  const timersRef = useRef<number[]>([]);

  const refreshStats = () => setStatsTick((n) => n + 1);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const roll = useCallback(() => {
    if (spinning || pool.length < 3) return;
    clearTimers();

    const next = pickRandom(pool, 3);

    if (reducedMotion) {
      setSpinTargets(null);
      setTriplet(next);
      setReelSpinning([false, false, false]);
      setLandedReels([false, false, false]);
      return;
    }

    setSpinTargets(next);
    setSpinning(true);
    setReelSpinning([true, true, true]);
    setLandedReels([false, false, false]);
    setJackpotFlash(false);
    setFrameShake(false);

    REEL_STAGGER_MS.forEach((stagger, reelIndex) => {
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

        if (reelIndex === 2) {
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
  }, [pool, spinning, reducedMotion, clearTimers]);

  useEffect(() => {
    if (triplet.length === 0 && pool.length > 0) {
      setTriplet(pickRandom(pool, 3));
    }
  }, [pool, triplet.length]);

  const anyReelSpinning = reelSpinning.some(Boolean);
  const interactionLocked = spinning || anyReelSpinning;

  const launchGame = useCallback((game: JamGame) => {
    recordPlay(game.gameId, game.title, game.shareUrl);
    refreshStats();
    window.open(game.shareUrl, '_blank', 'noopener,noreferrer');
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
      recordPlay(entry.gameId, entry.title, entry.shareUrl);
      refreshStats();
      window.open(entry.shareUrl, '_blank', 'noopener,noreferrer');
    },
    [],
  );

  const stats = getStats();
  const plays = totalPlays();
  void statsTick;

  const favoriteGames = useMemo(
    () =>
      stats.favorites
        .map((id) => pool.find((g) => g.gameId === id))
        .filter((g): g is JamGame => g != null),
    [stats.favorites, pool],
  );

  return (
    <div className="app-shell mx-auto w-full max-w-4xl">
      <header className="app-header shrink-0">
        <h1 className="app-title font-display font-black uppercase tracking-tight text-transparent bg-gradient-to-r from-amber-300 via-fuchsia-400 to-cyan-300 bg-clip-text">
          JamSlots
        </h1>
        <p className="app-subtitle min-w-0 truncate text-violet-100/85" title={jamName}>
          {jamName}
          <span className="text-zinc-500">
            {' '}
            · {pool.length} games · {plays} opens
          </span>
        </p>
      </header>

      <div className="app-tab-rail shrink-0">
        <TabBar
          active={activeTab}
          onChange={setActiveTab}
          favoriteCount={favoriteGames.length}
          playedCount={stats.history.length}
        />
      </div>

      <main className="app-main min-h-0 flex-1">
        {activeTab === 'slots' && (
          <div
            id="panel-slots"
            role="tabpanel"
            aria-labelledby="tab-slots"
            className={`slot-frame tab-panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-fuchsia-500/30 bg-gradient-to-b from-violet-950/60 to-black/80 p-2 shadow-[inset_0_0_60px_rgba(168,85,247,0.15)] sm:rounded-3xl sm:p-4 md:p-5 ${
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
                  game={game}
                  pool={pool}
                  reelSpinning={reelSpinning[reelIndex]}
                  spinTarget={spinTargets?.[reelIndex] ?? null}
                  justLanded={landedReels[reelIndex]}
                  highlight={!interactionLocked}
                  disabled={interactionLocked}
                  favorited={isFavorite(game.gameId)}
                  onPlay={() => playFromReel(game)}
                  onShowDescription={() => setDescriptionGame(game)}
                  onToggleFavorite={() => {
                    toggleFavorite(game.gameId);
                    refreshStats();
                  }}
                />
              ))}
            </div>

            <div className="mt-2 flex shrink-0 justify-center sm:mt-3">
              <button
                type="button"
                className="slot-btn w-full max-w-sm rounded-xl px-6 py-3 text-[1.15rem] font-bold uppercase tracking-wide text-black sm:max-w-xs sm:rounded-2xl sm:py-3.5 sm:text-[1.2rem]"
                onClick={roll}
                disabled={interactionLocked || pool.length < 3}
                aria-busy={interactionLocked}
              >
                {interactionLocked ? 'Rolling…' : 'Roll again'}
              </button>
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
            <FavoritesList
              games={favoriteGames}
              onOpen={launchGame}
              onToggleFavorite={(gameId) => {
                toggleFavorite(gameId);
                refreshStats();
              }}
              embedded
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
              entries={stats.history}
              onOpen={openFromHistory}
              descriptionFor={(gameId) => pool.find((g) => g.gameId === gameId)?.description}
              thumbnailFor={(gameId) => pool.find((g) => g.gameId === gameId)?.thumbnailUrl ?? ''}
              creatorFor={(gameId) => pool.find((g) => g.gameId === gameId)?.creatorName}
              isFavorite={isFavorite}
              onToggleFavorite={(gameId) => {
                toggleFavorite(gameId);
                refreshStats();
              }}
              embedded
            />
          </div>
        )}
      </main>

      <GameDescriptionModal game={descriptionGame} onClose={() => setDescriptionGame(null)} />
    </div>
  );
}
