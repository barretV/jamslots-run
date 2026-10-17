import type { CSSProperties } from 'react';

export type PickerTab = 'slots' | 'favorites' | 'played' | 'library';

interface TabBarProps {
  active: PickerTab;
  onChange: (tab: PickerTab) => void;
  favoriteCount: number;
  playedCount: number;
  totalJamGames: number;
}

const TABS: { id: PickerTab; label: string; shortLabel: string }[] = [
  { id: 'slots', label: 'Slots', shortLabel: 'Slots' },
  { id: 'library', label: 'Library', shortLabel: 'Library' },
  { id: 'favorites', label: 'Favorites', shortLabel: 'Faves' },
  { id: 'played', label: 'Played', shortLabel: 'Played' },
];

export function TabBar({
  active,
  onChange,
  favoriteCount,
  playedCount,
  totalJamGames,
}: TabBarProps) {
  const playedPct =
    totalJamGames > 0
      ? Math.min(100, Math.round((playedCount / totalJamGames) * 100))
      : 0;

  return (
    <nav className="picker-tabs" aria-label="Game picker sections">
      <div className="picker-tabs-inner" role="tablist">
        {TABS.map((tab) => {
          const selected = active === tab.id;
          const isPlayed = tab.id === 'played';
          const favBadge = tab.id === 'favorites' && favoriteCount > 0 ? favoriteCount : null;

          const playedStyle = isPlayed
            ? ({ '--jam-progress': `${playedPct}%` } as CSSProperties)
            : undefined;

          const playedLabel =
            totalJamGames > 0
              ? `${playedCount} of ${totalJamGames.toLocaleString()}`
              : `${playedCount}`;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`panel-${tab.id}`}
              className={`picker-tab ${selected ? 'picker-tab-active' : ''} ${isPlayed ? 'picker-tab--played' : ''}`}
              style={playedStyle}
              onClick={() => onChange(tab.id)}
              aria-label={
                isPlayed
                  ? `Played, ${playedCount} of ${totalJamGames} jam games, ${playedPct} percent`
                  : undefined
              }
            >
              {isPlayed && <span className="picker-tab-progress-fill" aria-hidden />}
              {isPlayed ? (
                <>
                  <span className="picker-tab-played-copy">
                    <span className="picker-tab-label">
                      <span className="sm:hidden">{tab.shortLabel}</span>
                      <span className="hidden sm:inline">{tab.label}</span>
                    </span>
                    <span className="picker-tab-played-meta" aria-hidden>{playedLabel}</span>
                  </span>
                  <span className="picker-tab-played-pct" aria-hidden>{playedPct}%</span>
                </>
              ) : (
                <span className="picker-tab-label">
                  <span className="sm:hidden">{tab.shortLabel}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </span>
              )}
              {favBadge != null && (
                <span className="picker-tab-badge" aria-hidden>{favBadge}</span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
