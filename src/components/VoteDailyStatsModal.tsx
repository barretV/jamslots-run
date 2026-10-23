import { useEffect, useMemo, useRef, useState } from 'react';
import { formatPlays } from '../lib/formatPlays';

export interface VoteDailyStatsTarget {
  gameId: string;
  title: string;
  votes: number;
  voteUrl: string;
}

interface VoteDailyHistory {
  daysUtc: string[];
  games: Record<string, number[]>;
  updatedAt?: number;
}

type ModalView = 'menu' | 'chart';

function utcDayLabel(dayUtc: string): string {
  const parts = dayUtc.split('-');
  if (parts.length !== 3) return dayUtc;
  return `${parts[1]}/${parts[2]}`;
}

interface VoteDailyStatsModalProps {
  target: VoteDailyStatsTarget | null;
  onClose: () => void;
}

export function VoteDailyStatsModal({ target, onClose }: VoteDailyStatsModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [view, setView] = useState<ModalView>('menu');
  const [history, setHistory] = useState<VoteDailyHistory | null>(null);
  const [historyError, setHistoryError] = useState(false);

  useEffect(() => {
    if (!target) {
      setView('menu');
      setHistory(null);
      setHistoryError(false);
      return;
    }
    closeRef.current?.focus();
    setView('menu');
    setHistoryError(false);
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/vote-daily-history.json', { cache: 'no-cache' });
        if (!res.ok) throw new Error('fetch failed');
        const data = (await res.json()) as VoteDailyHistory;
        if (!cancelled) setHistory(data);
      } catch {
        if (!cancelled) {
          setHistory(null);
          setHistoryError(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [target]);

  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [target, onClose]);

  const chartRows = useMemo(() => {
    if (!target || !history?.daysUtc?.length) return [];
    const series = history.games[target.gameId];
    if (!series) return [];
    return history.daysUtc.map((day, i) => ({
      day,
      value: Math.max(0, series[i] ?? 0),
    }));
  }, [target, history]);

  const chartMax = useMemo(
    () => chartRows.reduce((m, r) => Math.max(m, r.value), 0),
    [chartRows],
  );

  if (!target) return null;

  const voteLabel = target.votes > 0 ? formatPlays(target.votes) : 'Vote';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Close vote stats"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="vote-stats-title"
        className="relative z-10 flex max-h-[min(85dvh,32rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-violet-500/40 bg-zinc-950 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <h2
              id="vote-stats-title"
              className="font-display text-[1.35rem] font-bold leading-tight text-amber-100"
            >
              {target.title}
            </h2>
            <p className="mt-1 text-[1.05rem] text-violet-200/90">
              ▲ {voteLabel} jam vote{target.votes === 1 ? '' : 's'}
            </p>
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
          {view === 'menu' ? (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                className="vote-stats-btn vote-stats-btn--secondary"
                onClick={() => setView('chart')}
              >
                Daily vote stats (UTC)
              </button>
              <a
                href={target.voteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="vote-stats-btn vote-stats-btn--primary text-center"
              >
                Vote on RUN
              </a>
              <p className="text-center text-[1rem] leading-snug text-zinc-500">
                Daily chart covers UTC days since JamSlots started syncing vote totals.
              </p>
            </div>
          ) : (
            <div>
              <button
                type="button"
                className="vote-stats-btn vote-stats-btn--ghost mb-3"
                onClick={() => setView('menu')}
              >
                ← Back
              </button>
              {historyError ? (
                <p className="text-[1.05rem] text-zinc-400">Could not load daily vote history.</p>
              ) : chartRows.length === 0 ? (
                <p className="text-[1.05rem] text-zinc-400">
                  No daily vote deltas yet for this game in our sync history.
                </p>
              ) : (
                <>
                  <p className="mb-3 text-[1rem] text-zinc-500">
                    New votes per UTC day (tracking period only).
                  </p>
                  <ul className="vote-daily-chart" aria-label="Daily jam votes">
                    {chartRows.map((row) => (
                      <li key={row.day} className="vote-daily-chart__row">
                        <span className="vote-daily-chart__label">{utcDayLabel(row.day)}</span>
                        <div className="vote-daily-chart__track">
                          <div
                            className="vote-daily-chart__bar"
                            style={{
                              width: chartMax > 0 ? `${(row.value / chartMax) * 100}%` : '0%',
                            }}
                          />
                        </div>
                        <span className="vote-daily-chart__value">
                          {row.value > 0 ? `+${formatPlays(row.value)}` : '0'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <a
                href={target.voteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="vote-stats-btn vote-stats-btn--primary mt-4 text-center"
              >
                Vote on RUN
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
