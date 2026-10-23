import { useEffect, useRef, useState } from 'react';
import type { JamGame } from '../types';
import { PlaystyleScatter3D } from './libraryCharts/PlaystyleScatter3D';
import { TopGamesRadar } from './libraryCharts/TopGamesRadar';
import { VotePlayHeatmap } from './libraryCharts/VotePlayHeatmap';
import { VotePlaySankey } from './libraryCharts/VotePlaySankey';
import { VoteTierWaffle } from './libraryCharts/VoteTierWaffle';

export type LibraryChartTab = 'playstyle' | 'sankey' | 'radar' | 'heatmap' | 'waffle';

const TABS: { id: LibraryChartTab; label: string }[] = [
  { id: 'playstyle', label: 'Playstyle 3D' },
  { id: 'sankey', label: 'Sankey' },
  { id: 'radar', label: 'Radar' },
  { id: 'heatmap', label: 'Heatmap' },
  { id: 'waffle', label: 'Waffle' },
];

interface LibraryChartsModalProps {
  games: JamGame[];
  open: boolean;
  onClose: () => void;
  filterLabel: string;
}

export function LibraryChartsModal({ games, open, onClose, filterLabel }: LibraryChartsModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [tab, setTab] = useState<LibraryChartTab>('playstyle');

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="library-charts-modal" role="presentation">
      <button
        type="button"
        className="library-charts-modal__backdrop"
        aria-label="Close charts"
        onClick={onClose}
      />
      <div
        className="library-charts-modal__sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="library-charts-title"
      >
        <header className="library-charts-modal__header">
          <div className="library-charts-modal__titles">
            <h2 id="library-charts-title" className="library-charts-modal__title">
              Library charts
            </h2>
            <p className="library-charts-modal__subtitle">
              {games.length} game{games.length === 1 ? '' : 's'} · {filterLabel}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="library-charts-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className="library-charts-modal__tabs" role="tablist" aria-label="Chart type">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`library-charts-modal__tab ${tab === t.id ? 'library-charts-modal__tab--on' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="library-charts-modal__body">
          {tab === 'playstyle' ? <PlaystyleScatter3D games={games} /> : null}
          {tab === 'sankey' ? <VotePlaySankey games={games} /> : null}
          {tab === 'radar' ? <TopGamesRadar games={games} /> : null}
          {tab === 'heatmap' ? <VotePlayHeatmap games={games} /> : null}
          {tab === 'waffle' ? <VoteTierWaffle games={games} /> : null}
        </div>
      </div>
    </div>
  );
}
