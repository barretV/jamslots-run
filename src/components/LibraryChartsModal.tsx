import { useEffect, useMemo, useRef, useState } from 'react';
import {
  EMPTY_CHART_FILTERS,
  filterGamesForCharts,
  gameMatchesChartFilters,
  hasActiveChartFilters,
  type ChartFilters,
} from '../lib/libraryChartFilters';
import { buildChartPoints, type NebulaColorMode } from '../lib/libraryChartModels';
import type { JamGame } from '../types';
import { ChartFilterBar } from './libraryCharts/ChartFilterBar';
import { CompareRadar } from './libraryCharts/CompareRadar';
import { LeadersChart } from './libraryCharts/LeadersChart';
import { PlaystyleScatter3D } from './libraryCharts/PlaystyleScatter3D';
import { VotesPlaysScatter } from './libraryCharts/VotesPlaysScatter';

export type LibraryChartTab = 'nebula' | 'leaders' | 'scatter' | 'compare';

const TABS: { id: LibraryChartTab; label: string }[] = [
  { id: 'nebula', label: 'Nebula' },
  { id: 'leaders', label: 'Leaders' },
  { id: 'scatter', label: 'Scatter' },
  { id: 'compare', label: 'Compare' },
];

interface LibraryChartsModalProps {
  games: JamGame[];
  open: boolean;
  onClose: () => void;
  filterLabel: string;
}

export function LibraryChartsModal({ games, open, onClose, filterLabel }: LibraryChartsModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [tab, setTab] = useState<LibraryChartTab>('nebula');
  const [filters, setFilters] = useState<ChartFilters>(EMPTY_CHART_FILTERS);
  const [nebulaColorMode, setNebulaColorMode] = useState<NebulaColorMode>('playstyle');

  const chartPoints = useMemo(() => buildChartPoints(games), [games]);
  const showingCount = useMemo(
    () => games.filter((g) => gameMatchesChartFilters(g, filters)).length,
    [games, filters],
  );
  const scatterGames = useMemo(
    () => (hasActiveChartFilters(filters) ? filterGamesForCharts(games, filters) : games),
    [games, filters],
  );

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

  return (
    <div className="library-charts-modal" role="presentation">
      <button
        type="button"
        className="library-charts-modal__backdrop"
        aria-label="Close charts"
        onClick={onClose}
      />
      <div
        className="library-charts-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="library-charts-title"
      >
        <header className="library-charts-modal__header">
          <div>
            <h2 id="library-charts-title" className="library-charts-modal__title">Library charts</h2>
            <p className="library-charts-modal__subtitle">
              {games.length} games · {filterLabel}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="library-charts-modal__close"
            onClick={onClose}
          >
            Close
          </button>
        </header>

        <div className="library-charts-modal__tabs" role="tablist" aria-label="Chart type">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`library-charts-modal__tab ${tab === t.id ? 'library-charts-modal__tab--on' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <ChartFilterBar total={games.length} showing={showingCount} filters={filters} onChange={setFilters} />

        <div className="library-charts-modal__body">
          {tab === 'nebula' ? (
            <PlaystyleScatter3D
              points={chartPoints}
              colorMode={nebulaColorMode}
              filters={filters}
              onColorModeChange={setNebulaColorMode}
            />
          ) : null}
          {tab === 'leaders' ? <LeadersChart games={games} filters={filters} /> : null}
          {tab === 'scatter' ? (
            <VotesPlaysScatter
              games={games}
              filters={filters}
              showingCount={showingCount}
              totalCount={games.length}
            />
          ) : null}
          {tab === 'compare' ? <CompareRadar games={scatterGames.length ? scatterGames : games} /> : null}
        </div>
      </div>
    </div>
  );
}
