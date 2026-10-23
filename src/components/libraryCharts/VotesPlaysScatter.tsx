import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Label,
  LabelList,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import type { ChartFilters } from '../../lib/libraryChartFilters';
import { gameMatchesChartFilters, hasActiveChartFilters } from '../../lib/libraryChartFilters';
import { truncateTitle } from '../../lib/libraryChartModels';
import type { JamGame } from '../../types';
import { GameCallout } from './GameCallout';

interface VotesPlaysScatterProps {
  games: JamGame[];
  filters: ChartFilters;
  showingCount: number;
  totalCount: number;
}

interface ScatterRow {
  game: JamGame;
  votes: number;
  plays: number;
  label?: string;
  highlight?: boolean;
}

export function VotesPlaysScatter({ games, filters, showingCount, totalCount }: VotesPlaysScatterProps) {
  const [pinned, setPinned] = useState<JamGame | null>(null);

  const plot = useMemo(() => {
    const visible = hasActiveChartFilters(filters)
      ? games.filter((g) => gameMatchesChartFilters(g, filters))
      : games;

    const rows: ScatterRow[] = visible.map((g) => ({
      game: g,
      votes: g.votes,
      plays: g.totalPlays,
    }));

    const labelIds = new Set<string>();
    const addExtreme = (list: JamGame[], pick: (g: JamGame) => number) => {
      if (list.length === 0) return;
      const top = [...list].sort((a, b) => pick(b) - pick(a))[0];
      labelIds.add(top.gameId);
    };
    addExtreme(visible, (g) => g.votes);
    addExtreme(visible, (g) => g.totalPlays);
    addExtreme(visible, (g) => g.votesToday ?? 0);

    for (const row of rows) {
      if (labelIds.has(row.game.gameId)) {
        row.label = truncateTitle(row.game.title, 22);
        row.highlight = true;
      }
    }

    return rows;
  }, [games, filters]);

  if (games.length === 0) {
    return <p className="library-charts-empty">No games match your library view.</p>;
  }

  if (plot.length === 0) {
    return <p className="library-charts-empty">No games match the selected filters. Try Clear.</p>;
  }

  return (
    <div className="library-charts-scatter-layout">
      <p className="library-charts-cap-hint">
        {hasActiveChartFilters(filters)
          ? `Plotting ${showingCount} of ${totalCount} games from this list.`
          : 'Each dot is a game. Labeled dots are leaders on votes, plays, or votes today.'}
      </p>
      <div className="library-charts-scatter-layout__main">
        <div className="library-charts-scatter-chart">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 16, right: 16, bottom: 32, left: 16 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" />
              <XAxis
                type="number"
                dataKey="votes"
                name="Votes"
                tick={{ fill: '#a1a1aa', fontSize: 13 }}
              >
                <Label value="Jam votes" offset={-8} position="insideBottom" fill="#d4d4d8" fontSize={14} />
              </XAxis>
              <YAxis
                type="number"
                dataKey="plays"
                name="Plays"
                tick={{ fill: '#a1a1aa', fontSize: 13 }}
              >
                <Label value="RUN plays" angle={-90} position="insideLeft" fill="#d4d4d8" fontSize={14} />
              </YAxis>
              <ZAxis range={[80, 80]} />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{
                  background: 'rgba(10,5,20,0.95)',
                  border: '1px solid rgba(167,139,250,0.5)',
                  fontSize: '1.1rem',
                }}
                formatter={() => null}
                labelFormatter={(_, payload) => {
                  const row = payload?.[0]?.payload as ScatterRow | undefined;
                  if (!row) return '';
                  return `${row.game.title} · ${row.game.creatorName}`;
                }}
              />
              <Scatter
                data={plot}
                fill="#22d3ee"
                onClick={(d) => {
                  const row = d as unknown as ScatterRow;
                  if (row?.game) setPinned(row.game);
                }}
              >
                <LabelList
                  dataKey="label"
                  position="top"
                  fill="#fde68a"
                  fontSize={12}
                  formatter={(value) => (typeof value === 'string' ? value : '')}
                />
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        {pinned ? (
          <aside className="library-charts-scatter-side">
            <GameCallout game={pinned} pinned onClose={() => setPinned(null)} />
          </aside>
        ) : null}
      </div>
    </div>
  );
}
