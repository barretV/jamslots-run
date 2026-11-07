import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  OCTOBER_SECTIONS,
  resolveOctoberPrizes,
  type ResolvedPrize,
  type WinnerSection,
} from '../lib/octoberWinners';
import { useLibraryImmersiveOverlay } from '../lib/useLibraryImmersiveOverlay';
import type { JamGame } from '../types';

const WinnerStage3D = lazy(() =>
  import('./WinnerStage3D').then((module) => ({ default: module.WinnerStage3D })),
);

type WinnerTab = WinnerSection;

const TABS: { id: WinnerTab; label: string }[] = [
  { id: 'editors', label: "Editor's Picks" },
  { id: 'special', label: 'Special Categories' },
  { id: 'votes', label: 'Game Votes' },
  { id: 'story', label: 'Story and Video' },
];

interface WinnersModalProps {
  games: JamGame[];
  open: boolean;
  onClose: () => void;
  onOpen: (game: JamGame) => void;
}

function rowById(rows: ResolvedPrize[], id: string): ResolvedPrize {
  const row = rows.find((item) => item.prize.id === id);
  if (!row) throw new Error(`Missing prize ${id}`);
  return row;
}

function heading(id: WinnerTab): string {
  return OCTOBER_SECTIONS.find((section) => section.id === id)?.heading ?? id;
}

function TrophyCrest() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 3.5h10v3.7a5 5 0 0 1-10 0V3.5Z" />
      <path d="M7 5.5H4.2v1.8A3 3 0 0 0 7 10.3M17 5.5h2.8v1.8a3 3 0 0 1-2.8 3" />
      <path d="M12 12.2v3.6M9.2 19.5h5.6M10.4 15.8h3.2" />
    </svg>
  );
}

function BackArrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 5 8 12l7 7" />
    </svg>
  );
}

export function WinnersModal({ games, open, onClose, onOpen }: WinnersModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [tab, setTab] = useState<WinnerTab>('editors');
  const resolved = useMemo(() => resolveOctoberPrizes(games), [games]);

  useLibraryImmersiveOverlay(open);

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

  const editorsGold = rowById(resolved, 'editors-1');
  const editorsSilver = rowById(resolved, 'editors-2');
  const editorsBronze = rowById(resolved, 'editors-3');
  const place4 = rowById(resolved, 'editors-4');
  const place5 = rowById(resolved, 'editors-5');
  const votesGold = rowById(resolved, 'votes-1');
  const votesSilver = rowById(resolved, 'votes-2');
  const votesBronze = rowById(resolved, 'votes-3');
  const editorRows = [editorsGold, editorsSilver, editorsBronze, place4, place5];
  const voteRows = [votesGold, votesSilver, votesBronze];

  const specialRows = [
    rowById(resolved, 'special-sticky'),
    rowById(resolved, 'special-money'),
    rowById(resolved, 'special-social'),
    rowById(resolved, 'special-theme'),
  ];

  const storyRows = [
    rowById(resolved, 'story-1'),
    rowById(resolved, 'story-2'),
    rowById(resolved, 'story-3'),
  ];

  const stageMode: 'ranked' | 'special' | 'story' =
    tab === 'special' ? 'special' : tab === 'story' ? 'story' : 'ranked';
  const stageRows =
    tab === 'editors'
      ? editorRows
      : tab === 'votes'
        ? voteRows
        : tab === 'special'
          ? specialRows
          : storyRows;

  return createPortal(
    <div className="winners-modal">
      <div className="winners-modal__panel" role="dialog" aria-modal="true" aria-label="October Jam winners">
        <header className="winners-head">
          <div className="winners-head__brand">
            <span className="winners-head__crest">
              <TrophyCrest />
            </span>
            <div className="winners-head__copy">
              <p className="winners-head__kicker">
                October Jam <span aria-hidden="true">✦</span> Hall of Fame
              </p>
              <h2 className="winners-head__title">Winners</h2>
            </div>
          </div>

          <div className="winners-tabs" role="tablist" aria-label="Winner groups">
            {TABS.map((item) => (
              <button
                key={item.id}
                id={`winners-tab-${item.id}`}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                aria-controls="winners-panel"
                className={tab === item.id ? 'winners-tabs__btn is-on' : 'winners-tabs__btn'}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button ref={closeRef} type="button" className="winners-head__back" onClick={onClose}>
            <BackArrow />
            Back
          </button>
        </header>

        <div className="winners-body">
          <section
            className="winners-stage"
            id="winners-panel"
            role="tabpanel"
            aria-labelledby={`winners-tab-${tab}`}
            aria-label={heading(tab)}
          >
            <Suspense
              key={tab}
              fallback={
                <div className="winner-stage3d winner-stage3d--loading" role="status">
                  <div className="winner-stage3d__loader-panel">
                    <p className="winner-stage3d__loader-kicker">October Jam · Hall of Fame</p>
                    <p className="winner-stage3d__loader-title">Preparing the ceremony</p>
                    <div className="winner-stage3d__loader-track">
                      <div className="winner-stage3d__loader-fill winner-stage3d__loader-fill--indeterminate" />
                    </div>
                  </div>
                </div>
              }
            >
              <WinnerStage3D key={tab} rows={stageRows} mode={stageMode} onOpen={onOpen} />
            </Suspense>
          </section>
        </div>
      </div>
    </div>,
    document.body,
  );
}
