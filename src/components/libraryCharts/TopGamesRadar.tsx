import { useMemo } from 'react';
import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts';
import { buildRadarRows } from '../../lib/libraryChartModels';
import type { JamGame } from '../../types';

interface TopGamesRadarProps {
  games: JamGame[];
}

export function TopGamesRadar({ games }: TopGamesRadarProps) {
  const data = useMemo(() => buildRadarRows(games), [games]);

  if (data.length === 0) {
    return <p className="library-charts-empty">No games in this view.</p>;
  }

  return (
    <div className="library-charts-panel library-charts-panel--radar">
      <p className="library-charts-caption">
        Top by votes, plays, and votes today — Attack (votes), Defense (plays), Mobility (today),
        Utility (rank), Versatility (vote/play balance).
      </p>
      <ResponsiveContainer width="100%" height={320}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="72%">
          <PolarGrid stroke="rgba(192,132,252,0.35)" />
          <PolarAngleAxis dataKey="axis" tick={{ fill: '#e4e4e7', fontSize: 13 }} />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 11 }} />
          <Radar
            name="Top votes"
            dataKey="byVotes"
            stroke="#f472b6"
            fill="#f472b6"
            fillOpacity={0.25}
          />
          <Radar
            name="Top plays"
            dataKey="byPlays"
            stroke="#22d3ee"
            fill="#22d3ee"
            fillOpacity={0.2}
          />
          <Radar
            name="Top today"
            dataKey="byToday"
            stroke="#fbbf24"
            fill="#fbbf24"
            fillOpacity={0.2}
          />
          <Legend wrapperStyle={{ fontSize: '1.1rem', color: '#e4e4e7' }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
