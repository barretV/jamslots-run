import { useMemo } from 'react';
import { buildHeatmapCells, heatmapColor } from '../../lib/libraryChartModels';
import type { JamGame } from '../../types';

interface VotePlayHeatmapProps {
  games: JamGame[];
}

export function VotePlayHeatmap({ games }: VotePlayHeatmapProps) {
  const cells = useMemo(() => buildHeatmapCells(games), [games]);
  const maxRatio = useMemo(
    () => cells.reduce((m, c) => (c.count > 0 ? Math.max(m, c.ratio) : m), 0),
    [cells],
  );

  if (games.length === 0) {
    return <p className="library-charts-empty">No games in this view.</p>;
  }

  return (
    <div className="library-charts-panel">
      <p className="library-charts-caption">
        Vote quintile (columns) vs play quintile (rows). Color = avg vote/play ratio; label = game
        count.
      </p>
      <div className="library-charts-heatmap" role="img" aria-label="Vote play heatmap">
        {cells.map((cell) => (
          <div
            key={`${cell.voteQ}-${cell.playQ}`}
            className="library-charts-heatmap-cell"
            style={{
              gridColumn: cell.voteQ + 1,
              gridRow: cell.playQ + 1,
              background: heatmapColor(cell.ratio, cell.count, maxRatio),
            }}
            title={`${cell.count} games · ratio ${cell.ratio.toFixed(2)}`}
          >
            {cell.count > 0 ? cell.count : ''}
          </div>
        ))}
      </div>
      <div className="library-charts-heatmap-axes">
        <span>← lower votes</span>
        <span>higher votes →</span>
      </div>
    </div>
  );
}
