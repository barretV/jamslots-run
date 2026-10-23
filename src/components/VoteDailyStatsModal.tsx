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
  gameTotals?: Record<string, number[]>;
  updatedAt?: number;
}

type ModalView = 'menu' | 'chart';
type ChartStyle = 'bars' | 'histogram' | 'trend';

function utcDayLabel(dayUtc: string): string {
  const parts = dayUtc.split('-');
  if (parts.length !== 3) return dayUtc;
  return `${Number(parts[1])}/${Number(parts[2])}`;
}

interface VoteDailyStatsModalProps {
  target: VoteDailyStatsTarget | null;
  onClose: () => void;
}

const CHART_TABS: { id: ChartStyle; label: string }[] = [
  { id: 'bars', label: 'Bars' },
  { id: 'histogram', label: 'Histogram' },
  { id: 'trend', label: 'Total trend' },
];

export function VoteDailyStatsModal({ target, onClose }: VoteDailyStatsModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [view, setView] = useState<ModalView>('menu');
  const [chartStyle, setChartStyle] = useState<ChartStyle>('bars');
  const [history, setHistory] = useState<VoteDailyHistory | null>(null);
  const [historyError, setHistoryError] = useState(false);

  useEffect(() => {
    if (!target) {
      setView('menu');
      setChartStyle('bars');
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
        const base = import.meta.env.BASE_URL ?? '/';
        const res = await fetch(`${base}vote-daily-history.json?t=${Date.now()}`, {
          cache: 'no-store',
        });
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
    const totals = history.gameTotals?.[target.gameId];
    if (!series) return [];
    let running = 0;
    return history.daysUtc.map((day, i) => {
      const delta = Math.max(0, series[i] ?? 0);
      const endTotal = totals?.[i];
      const after =
        endTotal != null && Number.isFinite(endTotal) ? endTotal : running + delta;
      const before =
        endTotal != null && Number.isFinite(endTotal)
          ? Math.max(0, endTotal - delta)
          : running;
      running = after;
      return { day, delta, before, after };
    });
  }, [target, history]);

  const chartMax = useMemo(
    () => chartRows.reduce((m, r) => Math.max(m, r.delta), 0),
    [chartRows],
  );

  const trendMax = useMemo(
    () => chartRows.reduce((m, r) => Math.max(m, r.after), 0),
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
        className="vote-stats-modal relative z-10 flex max-h-[min(88dvh,36rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-violet-500/40 bg-zinc-950 shadow-2xl"
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

        <div className="vote-stats-modal__body touch-pan-y px-4 py-4">
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
                Charts use UTC days since JamSlots started syncing vote totals.
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
                  <div
                    className="vote-chart-tabs"
                    role="tablist"
                    aria-label="Chart style"
                  >
                    {CHART_TABS.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={chartStyle === tab.id}
                        className={`vote-chart-tabs__tab ${chartStyle === tab.id ? 'vote-chart-tabs__tab--on' : ''}`}
                        onClick={() => setChartStyle(tab.id)}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {chartStyle === 'bars' ? (
                    <ul className="vote-daily-chart vote-daily-chart--bars" aria-label="Daily jam votes bars">
                      {chartRows.map((row) => {
                        const pct = chartMax > 0 ? (row.delta / chartMax) * 100 : 0;
                        return (
                          <li key={row.day} className="vote-daily-day">
                            <div
                              className="vote-daily-day__head"
                              aria-label={`${utcDayLabel(row.day)}: votes ${formatPlays(row.before)} to ${formatPlays(row.after)}`}
                            >
                              <span className="vote-daily-day__date">{utcDayLabel(row.day)}</span>
                              <span className="vote-daily-day__meta">
                                <span className="vote-daily-chart__before">{formatPlays(row.before)}</span>
                                <span className="vote-daily-chart__arrow" aria-hidden>→</span>
                                <span className="vote-daily-chart__after">{formatPlays(row.after)}</span>
                                {row.delta > 0 ? (
                                  <span className="vote-daily-chart__delta">(+{formatPlays(row.delta)})</span>
                                ) : (
                                  <span className="vote-daily-chart__delta vote-daily-chart__delta--zero">(0)</span>
                                )}
                              </span>
                            </div>
                            <div className="vote-daily-chart__track vote-daily-day__track">
                              <div
                                className="vote-daily-chart__bar"
                                style={{ width: `${Math.max(row.delta > 0 ? 6 : 0, pct)}%` }}
                              />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}

                  {chartStyle === 'histogram' ? (
                    <div className="vote-histogram" aria-label="Daily votes histogram">
                      <div className="vote-histogram__plot">
                        {chartRows.map((row) => {
                          const h = chartMax > 0 ? (row.delta / chartMax) * 100 : 0;
                          return (
                            <div key={row.day} className="vote-histogram__col">
                              <span className="vote-histogram__value">
                                {row.delta > 0 ? `+${formatPlays(row.delta)}` : '0'}
                              </span>
                              <div
                                className="vote-histogram__bar"
                                style={{ height: `${Math.max(row.delta > 0 ? 4 : 0, h)}%` }}
                                title={`${utcDayLabel(row.day)}: ${formatPlays(row.before)} → ${formatPlays(row.after)}`}
                              />
                              <span className="vote-histogram__label">{utcDayLabel(row.day)}</span>
                            </div>
                          );
                        })}
                      </div>
                      <p className="vote-histogram__hint text-[1rem] text-zinc-500">
                        Tap a column: before → after totals for that UTC day.
                      </p>
                      <ul className="vote-histogram__legend">
                        {chartRows.map((row) => (
                          <li key={`leg-${row.day}`} className="vote-histogram__legend-row">
                            <span>{utcDayLabel(row.day)}</span>
                            <span>
                              {formatPlays(row.before)} → {formatPlays(row.after)}
                              {row.delta > 0 ? ` (+${formatPlays(row.delta)})` : ''}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {chartStyle === 'trend' ? (
                    <div className="vote-trend" aria-label="Cumulative vote total trend">
                      <svg
                        className="vote-trend__svg"
                        viewBox={`0 0 ${Math.max(chartRows.length - 1, 1) * 40} 100`}
                        preserveAspectRatio="none"
                        role="img"
                        aria-hidden
                      >
                        <polyline
                          className="vote-trend__line"
                          fill="none"
                          points={chartRows
                            .map((row, i) => {
                              const x = i * 40;
                              const y = trendMax > 0 ? 100 - (row.after / trendMax) * 92 : 100;
                              return `${x},${y}`;
                            })
                            .join(' ')}
                        />
                        {chartRows.map((row, i) => {
                          const x = i * 40;
                          const y = trendMax > 0 ? 100 - (row.after / trendMax) * 92 : 100;
                          return <circle key={row.day} className="vote-trend__dot" cx={x} cy={y} r={3} />;
                        })}
                      </svg>
                      <ul className="vote-trend__days">
                        {chartRows.map((row) => (
                          <li key={row.day}>
                            <span className="vote-trend__day">{utcDayLabel(row.day)}</span>
                            <span className="vote-trend__total">▲ {formatPlays(row.after)}</span>
                            {row.delta > 0 ? (
                              <span className="vote-trend__delta">+{formatPlays(row.delta)}</span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
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
