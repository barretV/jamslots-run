import { useCallback, useRef, type CSSProperties, type KeyboardEvent } from 'react';
import { PlayedTabIcon } from './PlayedTabIcon';

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
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const playedPct =
    totalJamGames > 0
      ? Math.min(100, Math.round((playedCount / totalJamGames) * 100))
      : 0;

  const focusTab = useCallback(
    (tabId: PickerTab) => {
      onChange(tabId);
      const index = TABS.findIndex((t) => t.id === tabId);
      tabRefs.current[index]?.focus();
    },
    [onChange],
  );

  const onTabListKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const index = TABS.findIndex((t) => t.id === active);
      if (index < 0) return;

      let next = index;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        next = (index + 1) % TABS.length;
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        next = (index - 1 + TABS.length) % TABS.length;
      } else if (event.key === 'Home') {
        next = 0;
      } else if (event.key === 'End') {
        next = TABS.length - 1;
      } else {
        return;
      }

      event.preventDefault();
      focusTab(TABS[next].id);
    },
    [active, focusTab],
  );

  return (
    <nav className="picker-tabs" aria-label="Game picker sections">
      <div className="picker-tabs-inner" role="tablist" onKeyDown={onTabListKeyDown}>
        {TABS.map((tab, tabIndex) => {
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
              ref={(el) => {
                tabRefs.current[tabIndex] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
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
                  <span className="picker-tab-played-row">
                    <PlayedTabIcon className="picker-tab-played-icon" />
                    <span className="picker-tab-played-copy">
                      <span className="picker-tab-label">
                        <span className="sm:hidden">{tab.shortLabel}</span>
                        <span className="hidden sm:inline">{tab.label}</span>
                      </span>
                      <span className="picker-tab-played-meta" aria-hidden>{playedLabel}</span>
                    </span>
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
