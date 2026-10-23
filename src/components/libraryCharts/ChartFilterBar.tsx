import type { ChartFilters } from '../../lib/libraryChartFilters';
import { hasActiveChartFilters } from '../../lib/libraryChartFilters';

interface ChartFilterBarProps {
  total: number;
  showing: number;
  filters: ChartFilters;
  onChange: (filters: ChartFilters) => void;
}

export function ChartFilterBar({ total, showing, filters, onChange }: ChartFilterBarProps) {
  const toggle = (key: keyof ChartFilters) => {
    onChange({ ...filters, [key]: !filters[key] });
  };

  return (
    <div className="library-charts-filters">
      <p className="library-charts-filters__count">
        Showing {showing} of {total}
      </p>
      <div className="library-charts-filters__chips" role="group" aria-label="Chart filters">
        <button
          type="button"
          className={`library-charts-chip ${filters.votesOverPlays ? 'library-charts-chip--on' : ''}`}
          aria-pressed={filters.votesOverPlays}
          onClick={() => toggle('votesOverPlays')}
        >
          Votes &gt; plays
        </button>
        <button
          type="button"
          className={`library-charts-chip ${filters.playsOverVotes ? 'library-charts-chip--on' : ''}`}
          aria-pressed={filters.playsOverVotes}
          onClick={() => toggle('playsOverVotes')}
        >
          Plays &gt; votes
        </button>
        <button
          type="button"
          className={`library-charts-chip ${filters.hasVotesToday ? 'library-charts-chip--on' : ''}`}
          aria-pressed={filters.hasVotesToday}
          onClick={() => toggle('hasVotesToday')}
        >
          Has votes today
        </button>
        {hasActiveChartFilters(filters) ? (
          <button
            type="button"
            className="library-charts-chip library-charts-chip--ghost"
            onClick={() =>
              onChange({ votesOverPlays: false, playsOverVotes: false, hasVotesToday: false })
            }
          >
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}
