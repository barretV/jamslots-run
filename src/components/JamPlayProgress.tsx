interface JamPlayProgressProps {
  uniquePlayed: number;
  totalGames: number;
  className?: string;
}

function formatCount(n: number): string {
  return Math.max(0, Math.floor(n)).toLocaleString();
}

function progressMessage(pct: number): string {
  if (pct >= 100) return 'You played every game in the jam. Legend.';
  if (pct >= 75) return 'Almost through the whole jam.';
  if (pct >= 50) return 'Halfway there. Keep spinning.';
  if (pct >= 25) return 'Nice start. Lots left to discover.';
  if (pct > 0) return 'Every play counts. Roll for more.';
  return 'Tap Play on the slots to log your first game.';
}

export function JamPlayProgress({
  uniquePlayed,
  totalGames,
  className,
}: JamPlayProgressProps) {
  const total = Math.max(0, totalGames);
  const played = Math.max(0, Math.min(uniquePlayed, total || uniquePlayed));
  const pct = total > 0 ? Math.min(100, (played / total) * 100) : 0;
  const pctLabel = total > 0 ? Math.min(100, Math.round(pct)) : 0;
  const message = progressMessage(pctLabel);

  return (
    <div
      className={['jam-play-progress', className].filter(Boolean).join(' ')}
      role="group"
      aria-label={`Jam progress: ${played} of ${total} games played, ${pctLabel} percent`}
    >
      <div className="jam-play-progress-hero" aria-hidden>
        <span className="jam-play-progress-played">{formatCount(played)}</span>
        <span className="jam-play-progress-of">out of</span>
        <span className="jam-play-progress-total">{formatCount(total)}</span>
      </div>
      <p className="jam-play-progress-caption">games played in this jam</p>

      <div className="jam-play-progress-track-wrap">
        <div className="jam-play-progress-track">
          <div
            className="jam-play-progress-fill"
            style={{ width: `${pct}%` }}
          >
            <span className="jam-play-progress-shine" />
          </div>
        </div>
        <span className="jam-play-progress-pct">{pctLabel}%</span>
      </div>

      <p className="jam-play-progress-msg">{message}</p>
    </div>
  );
}
