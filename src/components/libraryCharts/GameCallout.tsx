import type { JamGame } from '../../types';

interface GameCalloutProps {
  game: JamGame;
  pinned?: boolean;
  onClose?: () => void;
  className?: string;
}

export function GameCallout({ game, pinned, onClose, className = '' }: GameCalloutProps) {
  return (
    <div className={`library-charts-callout ${pinned ? 'library-charts-callout--pinned' : ''} ${className}`}>
      <div className="library-charts-callout__head">
        <strong className="library-charts-callout__title">{game.title}</strong>
        {pinned && onClose ? (
          <button type="button" className="library-charts-callout__close" onClick={onClose} aria-label="Unpin">
            ×
          </button>
        ) : null}
      </div>
      <p className="library-charts-callout__creator">{game.creatorName}</p>
      <p className="library-charts-callout__stats">
        {game.votes} votes · {game.totalPlays} plays · +{game.votesToday ?? 0} today
      </p>
    </div>
  );
}
