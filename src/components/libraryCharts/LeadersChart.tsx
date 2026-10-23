import { useMemo } from 'react';
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

interface LeadersChartProps {
  games: JamGame[];
  filters: ChartFilters;
  metric: LeaderMetric;
}

export function LeadersChart({ games, filters, metric }: LeadersChartProps) {
  const clusters = useMemo(() => new Map(buildChartPoints(games).map((p) => [p.game.gameId, p.cluster])), [games]);

  const rows = useMemo(() => {
    const filtered = games.filter((g) => gameMatchesChartFilters(g, filters));
    return topGamesByMetric(filtered, metric, 15).map((g) => ({
      game: g,
      title: truncateTitle(g.title, 28),
      value: leaderMetricValue(g, metric),
      fill: CLUSTER_COLORS[clusters.get(g.gameId) ?? 'tactician'],
    }));
  }, [games, filters, metric, clusters]);

  const chartHeight = Math.max(360, rows.length * 38 + 48);

  if (games.length === 0) {
    return <p className="library-charts-empty">No games match your library view.</p>;
  }

  if (rows.length === 0) {
    return <p className="library-charts-empty">No games match the selected filters. Try Clear.</p>;
  }

  return (
    <div className="library-charts-leaders library-charts-leaders--scroll">
      <div className="library-charts-leaders__chart" style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ left: 4, right: 16, top: 8, bottom: 8 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.08)" horizontal={false} />
            <XAxis type="number" tick={{ fill: '#a1a1aa', fontSize: 13 }} />
            <YAxis
              type="category"
              dataKey="title"
              width={148}
              reversed
              tick={{ fill: '#e4e4e7', fontSize: 13 }}
            />
            <Tooltip
              contentStyle={{
                background: 'rgba(10,5,20,0.95)',
                border: '1px solid rgba(167,139,250,0.5)',
                fontSize: '1.1rem',
              }}
              formatter={(value) => [value, metric === 'ratio' ? 'Ratio' : metric]}
              labelFormatter={(_, payload) => {
                const row = payload?.[0]?.payload as { game?: JamGame };
                if (!row?.game) return '';
                return `${row.game.title} · ${row.game.creatorName}`;
              }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
