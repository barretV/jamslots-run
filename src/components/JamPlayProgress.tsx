import { formatPlays } from '../lib/formatPlays';

interface JamPlayProgressProps {
  uniquePlayed: number;
  totalGames: number;
  className?: string;
}

function progressMessage(pct: number): string {
  if (pct >= 100) return 'You played every game in the jam. Legend.';
  if (pct >= 75) return 'Almost through the whole jam.';
  if (pct >= 50) return 'Halfway there. Keep spinning.';
  if (pct >= 25) return 'Nice start. Lots left to discover.';
  if (pct > 0) return 'Every play counts. Roll for more.';
  return 'Open a game from the slots to start your run.';
}

export function JamPlayProgress({
  uniquePlayed,
  totalGames,
  className,
}: JamPlayProgressProps) {
  const total = Math.max(0, totalGames);
  const played = Math.max(0, Math.min(uniquePlayed, total || uniquePlayed));
  const pct = total > 0 ? Math.min(100, Math.round((played / total) * 100)) : 0;
  const message = progressMessage(pct);

  return (
    <div
      className={['jam-play-progress', className].filter(Boolean).join(' ')}
      role="group"
      aria-label={`Jam progress: ${played} of ${total} games played, ${pct} percent`}
    >
      <div className="jam-play-progress-head">
        <span className="jam-play-progress-title font-display">Jam progress</span>
        <span className="jam-play-progress-pct" aria-hidden>{pct}%</span>
      </div>
      <div className="jam-play-progress-track" aria-hidden>
        <div className="jam-play-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="jam-play-progress-stats">
        <span className="jam-play-progress-count">
          <strong>{formatPlays(played)}</strong>
          <span className="jam-play-progress-of"> / {formatPlays(total)} games</span>
        </span>
        <span className="jam-play-progress-msg">{message}</span>
      </p>
    </div>
  );
}
