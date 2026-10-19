import { useEffect, useRef, useState } from 'react';
import { formatListUpdatedAgo, formatVotingCloses } from '../lib/formatJamMeta';
import { readLastSeenGameCount, writeLastSeenGameCount } from '../lib/jamListStats';
import { useReducedMotion } from '../lib/useReducedMotion';

interface JamMetaBarProps {
  gameCount: number;
  syncedAt: number;
  votingCloseAt?: number;
  compact?: boolean;
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

export function JamMetaBar({
  gameCount,
  syncedAt,
  votingCloseAt,
  compact = false,
}: JamMetaBarProps) {
  const reducedMotion = useReducedMotion();
  const [displayCount, setDisplayCount] = useState(gameCount);
  const [newGamesDelta, setNewGamesDelta] = useState(0);
  const [showNewBadge, setShowNewBadge] = useState(false);
  const committedRef = useRef(false);

  useEffect(() => {
    const lastSeen = readLastSeenGameCount();
    const delta = lastSeen != null && gameCount > lastSeen ? gameCount - lastSeen : 0;
    const from = lastSeen != null && lastSeen > 0 ? Math.min(lastSeen, gameCount) : gameCount;

    if (reducedMotion || from === gameCount) {
      setDisplayCount(gameCount);
      if (delta > 0) {
        setNewGamesDelta(delta);
        setShowNewBadge(true);
        window.setTimeout(() => setShowNewBadge(false), 3200);
      }
      if (!committedRef.current) {
        writeLastSeenGameCount(gameCount);
        committedRef.current = true;
      }
      return;
    }

    setDisplayCount(from);
    if (delta > 0) {
      setNewGamesDelta(delta);
      setShowNewBadge(true);
    }

    const durationMs = 900;
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setDisplayCount(Math.round(from + (gameCount - from) * easeOutCubic(t)));
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        if (delta > 0) {
          window.setTimeout(() => setShowNewBadge(false), 3200);
        }
        if (!committedRef.current) {
          writeLastSeenGameCount(gameCount);
          committedRef.current = true;
        }
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [gameCount, reducedMotion]);

  const updatedLabel = formatListUpdatedAgo(syncedAt);
  const votingLabel = votingCloseAt ? formatVotingCloses(votingCloseAt) : null;

  return (
    <div className={`jam-meta-bar ${compact ? 'jam-meta-bar--compact' : ''}`} role="status">
      <p className="jam-meta-bar__counts">
        <span className="jam-meta-bar__game-count font-display">
          {displayCount.toLocaleString()} games
        </span>
        {showNewBadge && newGamesDelta > 0 && (
          <span className="jam-meta-bar__new-badge" aria-live="polite">
            +{newGamesDelta} new
          </span>
        )}
      </p>
      <p className="jam-meta-bar__meta">
        <span>{updatedLabel}</span>
        {votingLabel && (
          <>
            <span className="jam-meta-bar__dot" aria-hidden>·</span>
            <span>{votingLabel}</span>
          </>
        )}
      </p>
    </div>
  );
}
