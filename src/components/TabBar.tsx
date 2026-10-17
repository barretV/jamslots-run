export type PickerTab = 'slots' | 'favorites' | 'played' | 'library';

interface TabBarProps {
  active: PickerTab;
  onChange: (tab: PickerTab) => void;
  favoriteCount: number;
  playedCount: number;
}

const TABS: { id: PickerTab; label: string }[] = [
  { id: 'slots', label: 'Slots' },
  { id: 'library', label: 'Library' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'played', label: 'Played' },
];

export function TabBar({ active, onChange, favoriteCount, playedCount }: TabBarProps) {
  return (
    <nav className="picker-tabs" aria-label="Game picker sections">
      <div className="picker-tabs-inner" role="tablist">
        {TABS.map((tab) => {
          const selected = active === tab.id;
          const badge =
            tab.id === 'favorites'
              ? favoriteCount
              : tab.id === 'played'
                ? playedCount
                : null;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`panel-${tab.id}`}
              className={`picker-tab ${selected ? 'picker-tab-active' : ''}`}
              onClick={() => onChange(tab.id)}
            >
              <span className="picker-tab-label">{tab.label}</span>
              {badge != null && badge > 0 && (
                <span className="picker-tab-badge" aria-hidden>{badge}</span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
