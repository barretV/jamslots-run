import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLibraryImmersiveOverlay } from '../lib/useLibraryImmersiveOverlay';
import {
  EMPTY_CHART_FILTERS,
  filterGamesForCharts,
  gameMatchesChartFilters,
  hasActiveChartFilters,
  type ChartFilters,
} from '../lib/libraryChartFilters';
import { buildChartPoints, type LeaderMetric, type NebulaColorMode } from '../lib/libraryChartModels';
import type { JamGame } from '../types';
import { ChartsToolbar } from './libraryCharts/ChartsToolbar';
import { CompareRadar } from './libraryCharts/CompareRadar';
import { LeadersChart } from './libraryCharts/LeadersChart';
import { PlaystyleScatter3D } from './libraryCharts/PlaystyleScatter3D';
import { VotesPlaysScatter } from './libraryCharts/VotesPlaysScatter';

export type LibraryChartTab = 'nebula' | 'leaders' | 'scatter' | 'compare';

interface LibraryChartsModalProps {
  games: JamGame[];
  open: boolean;
  onClose: () => void;
  filterLabel: string;
}

export function LibraryChartsModal({ games, open, onClose }: LibraryChartsModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [tab, setTab] = useState<LibraryChartTab>('nebula');
  const [filters, setFilters] = useState<ChartFilters>(EMPTY_CHART_FILTERS);
  const [nebulaColorMode, setNebulaColorMode] = useState<NebulaColorMode>('votes');
  const [leaderMetric, setLeaderMetric] = useState<LeaderMetric>('votes');

  const chartPoints = useMemo(() => buildChartPoints(games), [games]);
  const showingCount = useMemo(
    () => games.filter((g) => gameMatchesChartFilters(g, filters)).length,
    [games, filters],
  );
  const scatterGames = useMemo(
    () => (hasActiveChartFilters(filters) ? filterGamesForCharts(games, filters) : games),
    [games, filters],
  );

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

  const bodyScroll = tab === 'nebula' || tab === 'scatter';

  return createPortal(
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
        aria-label="Library charts"
      >
        <ChartsToolbar
          tab={tab}
          onTabChange={setTab}
          showing={showingCount}
          total={games.length}
          filters={filters}
          onFiltersChange={setFilters}
          nebulaColorMode={nebulaColorMode}
          onNebulaColorModeChange={setNebulaColorMode}
          leaderMetric={leaderMetric}
          onLeaderMetricChange={setLeaderMetric}
          onBack={onClose}
          backRef={closeRef}
        />

        <div
          className={`library-charts-modal__body ${bodyScroll ? 'library-charts-modal__body--plot' : 'library-charts-modal__body--scroll'}`}
        >
          {tab === 'nebula' ? (
            <PlaystyleScatter3D
              points={chartPoints}
              colorMode={nebulaColorMode}
              filters={filters}
            />
          ) : null}
          {tab === 'leaders' ? (
            <LeadersChart games={games} filters={filters} metric={leaderMetric} />
          ) : null}
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
    </div>,
    document.body,
  );
}
