import type { RefObject } from 'react';
import type { ChartFilters } from '../../lib/libraryChartFilters';
import { hasActiveChartFilters } from '../../lib/libraryChartFilters';
import type { NebulaColorMode, LeaderMetric } from '../../lib/libraryChartModels';
import { CLUSTER_COLORS, CLUSTER_LABELS } from '../../lib/libraryChartModels';
import type { LibraryChartTab } from '../LibraryChartsModal';

const TABS: { id: LibraryChartTab; label: string }[] = [
  { id: 'nebula', label: 'Nebula' },
  { id: 'leaders', label: 'Leaders' },
  { id: 'scatter', label: 'Scatter' },
  { id: 'compare', label: 'Compare' },
];

const COLOR_MODES: { id: NebulaColorMode; label: string }[] = [
  { id: 'playstyle', label: 'Playstyle' },
  { id: 'votes', label: 'Votes' },
  { id: 'plays', label: 'Plays' },
  { id: 'today', label: 'Today' },
];

const LEADER_METRICS: { id: LeaderMetric; label: string }[] = [
  { id: 'votes', label: 'Votes' },
  { id: 'plays', label: 'Plays' },
  { id: 'today', label: 'Today' },
  { id: 'ratio', label: 'Votes/play' },
];

interface ChartsToolbarProps {
  tab: LibraryChartTab;
  onTabChange: (tab: LibraryChartTab) => void;
  showing: number;
  total: number;
  filters: ChartFilters;
  onFiltersChange: (f: ChartFilters) => void;
  nebulaColorMode: NebulaColorMode;
  onNebulaColorModeChange: (m: NebulaColorMode) => void;
  leaderMetric: LeaderMetric;
  onLeaderMetricChange: (m: LeaderMetric) => void;
  onBack: () => void;
  backRef: RefObject<HTMLButtonElement | null>;
}

export function ChartsToolbar({
  tab,
  onTabChange,
  showing,
  total,
  filters,
  onFiltersChange,
  nebulaColorMode,
  onNebulaColorModeChange,
  leaderMetric,
  onLeaderMetricChange,
  onBack,
  backRef,
}: ChartsToolbarProps) {
  const toggle = (key: keyof ChartFilters) => {
    onFiltersChange({ ...filters, [key]: !filters[key] });
  };

  return (
    <div className="library-charts-toolbar" role="toolbar" aria-label="Chart controls">
      <div className="library-charts-toolbar__tabs" role="tablist" aria-label="Chart type">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`library-charts-toolbar__tab ${tab === t.id ? 'library-charts-toolbar__tab--on' : ''}`}
            onClick={() => onTabChange(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <span className="library-charts-toolbar__count">{showing}/{total}</span>

      <div className="library-charts-toolbar__chips" role="group" aria-label="Chart filters">
        <button
          type="button"
          className={`library-charts-chip library-charts-chip--dense ${filters.votesOverPlays ? 'library-charts-chip--on' : ''}`}
          aria-pressed={filters.votesOverPlays}
          onClick={() => toggle('votesOverPlays')}
        >
          Votes &gt; plays
        </button>
        <button
          type="button"
          className={`library-charts-chip library-charts-chip--dense ${filters.playsOverVotes ? 'library-charts-chip--on' : ''}`}
          aria-pressed={filters.playsOverVotes}
          onClick={() => toggle('playsOverVotes')}
        >
          Plays &gt; votes
        </button>
        <button
          type="button"
          className={`library-charts-chip library-charts-chip--dense ${filters.hasVotesToday ? 'library-charts-chip--on' : ''}`}
          aria-pressed={filters.hasVotesToday}
          onClick={() => toggle('hasVotesToday')}
        >
          Today
        </button>
        {hasActiveChartFilters(filters) ? (
          <button
            type="button"
            className="library-charts-chip library-charts-chip--dense library-charts-chip--ghost"
            onClick={() =>
              onFiltersChange({ votesOverPlays: false, playsOverVotes: false, hasVotesToday: false })
            }
          >
            Clear
          </button>
        ) : null}
      </div>

      {tab === 'nebula' ? (
        <div className="library-charts-toolbar__nebula" role="group" aria-label="Nebula color">
          {COLOR_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`library-charts-chip library-charts-chip--dense ${nebulaColorMode === m.id ? 'library-charts-chip--on' : ''}`}
              aria-pressed={nebulaColorMode === m.id}
              onClick={() => onNebulaColorModeChange(m.id)}
            >
              {m.label}
            </button>
          ))}
          <span className="library-charts-toolbar__legend" aria-label="Color legend">
            {nebulaColorMode === 'playstyle' ? (
              <>
                <span className="library-charts-toolbar__swatch" style={{ background: CLUSTER_COLORS.rusher }} title={CLUSTER_LABELS.rusher} />
                <span className="library-charts-toolbar__swatch" style={{ background: CLUSTER_COLORS.tactician }} title={CLUSTER_LABELS.tactician} />
                <span className="library-charts-toolbar__swatch" style={{ background: CLUSTER_COLORS.survivor }} title={CLUSTER_LABELS.survivor} />
              </>
            ) : (
              <>
                <span className="library-charts-toolbar__swatch" style={{ background: '#22d3ee' }} title="Cyan" />
                <span className="library-charts-toolbar__swatch" style={{ background: '#fbbf24' }} title="Amber" />
                <span className="library-charts-toolbar__swatch" style={{ background: '#f472b6' }} title="Magenta" />
                <span className="library-charts-toolbar__swatch" style={{ background: '#a78bfa' }} title="Violet" />
              </>
            )}
          </span>
        </div>
      ) : null}

      {tab === 'leaders' ? (
        <div className="library-charts-toolbar__nebula" role="group" aria-label="Leader metric">
          {LEADER_METRICS.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`library-charts-chip library-charts-chip--dense ${leaderMetric === m.id ? 'library-charts-chip--on' : ''}`}
              onClick={() => onLeaderMetricChange(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
      ) : null}

      <button ref={backRef} type="button" className="library-charts-toolbar__back" onClick={onBack}>
        Back
      </button>
    </div>
  );
}
