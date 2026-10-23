import type { NebulaColorMode } from '../../lib/libraryChartModels';

const COLOR_MODES: { id: NebulaColorMode; label: string }[] = [
  { id: 'playstyle', label: 'Playstyle' },
  { id: 'votes', label: 'Votes' },
  { id: 'plays', label: 'Plays' },
  { id: 'today', label: 'Votes today' },
];

interface NebulaColorModeBarProps {
  value: NebulaColorMode;
  onChange: (mode: NebulaColorMode) => void;
}

export function NebulaColorModeBar({ value, onChange }: NebulaColorModeBarProps) {
  return (
    <div className="library-charts-color-modes">
      <p className="library-charts-color-modes__label">Color</p>
      <div className="library-charts-color-modes__chips" role="group" aria-label="Color mode">
        {COLOR_MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`library-charts-chip ${value === m.id ? 'library-charts-chip--on' : ''}`}
            aria-pressed={value === m.id}
            onClick={() => onChange(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}
