import { useEffect, useMemo, useState } from 'react';
import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts';
import type { CompareSeries } from '../../lib/libraryChartModels';
import {
  COMPARE_COLORS,
  buildCompareRadarData,
  defaultCompareSeries,
  truncateTitle,
} from '../../lib/libraryChartModels';
import type { JamGame } from '../../types';

interface CompareRadarProps {
  games: JamGame[];
}

export function CompareRadar({ games }: CompareRadarProps) {
  const [series, setSeries] = useState<CompareSeries[]>(() => defaultCompareSeries(games));

  useEffect(() => {
    setSeries(defaultCompareSeries(games));
  }, [games]);

  const data = useMemo(() => buildCompareRadarData(games, series), [games, series]);

  const pickerGames = useMemo(
    () =>
      [...games]
        .sort((a, b) => b.votes - a.votes)
        .slice(0, 24),
    [games],
  );

  const swapSeries = (slot: number, gameId: string) => {
    const game = games.find((g) => g.gameId === gameId);
    if (!game) return;
    setSeries((prev) => {
      const next = [...prev];
      while (next.length < 3) next.push({ gameId: '', label: '' });
      next[slot] = { gameId, label: truncateTitle(game.title, 32) };
      return next.slice(0, 3);
    });
  };

  if (games.length === 0) {
    return <p className="library-charts-empty">No games match your library view.</p>;
  }

  return (
    <div className="library-charts-compare">
      <p className="library-charts-cap-hint">
        Compare up to three games from this list. Tap a name below to swap a radar ring.
      </p>
      <div className="library-charts-compare__chart">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="72%">
            <PolarGrid stroke="rgba(192,132,252,0.35)" />
            <PolarAngleAxis dataKey="axis" tick={{ fill: '#e4e4e7', fontSize: 13 }} />
            <PolarRadiusAxis domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 11 }} />
            {series.map((s, i) => (
              <Radar
                key={s.gameId}
                name={s.label}
                dataKey={s.label}
                stroke={COMPARE_COLORS[i % COMPARE_COLORS.length]}
                fill={COMPARE_COLORS[i % COMPARE_COLORS.length]}
                fillOpacity={0.2}
              />
            ))}
            <Legend wrapperStyle={{ fontSize: '1.1rem', color: '#e4e4e7' }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="library-charts-compare__pickers">
        {series.map((s, slot) => (
          <div key={slot} className="library-charts-compare__slot">
            <span className="library-charts-compare__slot-label">Ring {slot + 1}</span>
            <select
              className="library-charts-compare__select"
              value={s.gameId}
              onChange={(e) => swapSeries(slot, e.target.value)}
            >
              {pickerGames.map((g) => (
                <option key={g.gameId} value={g.gameId}>
                  {truncateTitle(g.title, 40)}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
