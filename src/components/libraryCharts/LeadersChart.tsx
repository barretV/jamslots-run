import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ChartFilters } from '../../lib/libraryChartFilters';
import { gameMatchesChartFilters } from '../../lib/libraryChartFilters';
import type { LeaderMetric } from '../../lib/libraryChartModels';
import {
  buildChartPoints,
  CLUSTER_COLORS,
  leaderMetricValue,
  topGamesByMetric,
  truncateTitle,
} from '../../lib/libraryChartModels';
import type { JamGame } from '../../types';

const METRICS: { id: LeaderMetric; label: string }[] = [
  { id: 'votes', label: 'Votes' },
  { id: 'plays', label: 'Plays' },
  { id: 'today', label: 'Votes today' },
  { id: 'ratio', label: 'Votes per play' },
];

interface LeadersChartProps {
  games: JamGame[];
  filters: ChartFilters;
}

export function LeadersChart({ games, filters }: LeadersChartProps) {
  const [metric, setMetric] = useState<LeaderMetric>('votes');
  const clusters = useMemo(() => new Map(buildChartPoints(games).map((p) => [p.game.gameId, p.cluster])), [games]);

  const rows = useMemo(() => {
    const filtered = games.filter((g) => gameMatchesChartFilters(g, filters));
    return topGamesByMetric(filtered, metric, 15)
      .map((g) => ({
        game: g,
        title: truncateTitle(g.title, 26),
        value: leaderMetricValue(g, metric),
        fill: CLUSTER_COLORS[clusters.get(g.gameId) ?? 'tactician'],
        dim: gameMatchesChartFilters(g, filters) ? 1 : 0.35,
      }))
      .reverse();
  }, [games, filters, metric, clusters]);

  if (games.length === 0) {
    return <p className="library-charts-empty">No games match your library view.</p>;
  }

  if (rows.length === 0) {
    return <p className="library-charts-empty">No games match the selected filters. Try Clear.</p>;
  }

  return (
    <div className="library-charts-leaders">
      <div className="library-charts-nebula__modes" role="group" aria-label="Leader metric">
        {METRICS.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`library-charts-chip ${metric === m.id ? 'library-charts-chip--on' : ''}`}
            onClick={() => setMetric(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="library-charts-leaders__chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.08)" horizontal={false} />
            <XAxis type="number" tick={{ fill: '#a1a1aa', fontSize: 13 }} />
            <YAxis
              type="category"
              dataKey="title"
              width={140}
              tick={{ fill: '#e4e4e7', fontSize: 13 }}
            />
            <Tooltip
              contentStyle={{
                background: 'rgba(10,5,20,0.95)',
                border: '1px solid rgba(167,139,250,0.5)',
                fontSize: '1.1rem',
              }}
              formatter={(value) => [value, metric === 'ratio' ? 'Ratio' : METRICS.find((m) => m.id === metric)?.label]}
              labelFormatter={(_, payload) => {
                const row = payload?.[0]?.payload as { game?: JamGame };
                if (!row?.game) return '';
                return `${row.game.title} · ${row.game.creatorName}`;
              }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
