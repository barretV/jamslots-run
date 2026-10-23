import { useMemo } from 'react';
import { buildWaffleCells, WAFFLE_TIER_COLORS, VOTE_TIERS } from '../../lib/libraryChartModels';
import type { JamGame } from '../../types';

interface VoteTierWaffleProps {
  games: JamGame[];
}

export function VoteTierWaffle({ games }: VoteTierWaffleProps) {
  const cells = useMemo(() => buildWaffleCells(games), [games]);

  if (games.length === 0) {
    return <p className="library-charts-empty">No games in this view.</p>;
  }

  return (
    <div className="library-charts-panel">
      <p className="library-charts-caption">
        Each square ≈ 1% of filtered games by jam vote tier (0 · 1–9 · 10–49 · 50–99 · 100+).
      </p>
      <div className="library-charts-waffle" role="img" aria-label="Vote tier waffle">
        {cells.map((cell, i) => (
          <div
            key={i}
            className="library-charts-waffle-cell"
            style={{
              background: WAFFLE_TIER_COLORS[cell.tier || 'pad'] ?? WAFFLE_TIER_COLORS.pad,
            }}
          />
        ))}
      </div>
      <ul className="library-charts-legend">
        {VOTE_TIERS.map((tier) => (
          <li key={tier.id}>
            <span
              className="library-charts-swatch"
              style={{ background: WAFFLE_TIER_COLORS[tier.id] }}
            />
            {tier.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
