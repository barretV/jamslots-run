import { useEffect, useRef, useState } from 'react';
import {
  formatListUpdatedAgo,
  formatVotingCountdownLabel,
  votingCountdown,
} from '../lib/formatJamMeta';
import { readLastSeenGameCount, writeLastSeenGameCount } from '../lib/jamListStats';
import { useReducedMotion } from '../lib/useReducedMotion';

interface JamMetaBarProps {
  gameCount: number;
  syncedAt: number;
  votingCloseAt?: number;
  jamName?: string;
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

export function JamMetaBar({ gameCount, syncedAt, votingCloseAt, jamName }: JamMetaBarProps) {
  const reducedMotion = useReducedMotion();
  const [displayCount, setDisplayCount] = useState(gameCount);
  const [newGamesDelta, setNewGamesDelta] = useState(0);
  const [showNewBadge, setShowNewBadge] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const committedRef = useRef(false);

  useEffect(() => {
    const tick = () => setNowMs(Date.now());
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

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

    const tick = (time: number) => {
      const t = Math.min(1, (time - start) / durationMs);
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

  const updatedLabel = formatListUpdatedAgo(syncedAt, nowMs);
  const countdown = votingCloseAt ? votingCountdown(votingCloseAt, nowMs) : null;
  const votingLabel = countdown ? formatVotingCountdownLabel(countdown) : null;

  return (
    <div className="jam-meta-bar jam-meta-bar--header" role="status">
      <p className="app-subtitle jam-meta-bar__row text-violet-100/85" title={jamName}>
        {jamName != null && <span className="jam-meta-bar__jam">{jamName}</span>}
        <span className="jam-meta-bar__sep" aria-hidden>·</span>
        <span className="jam-meta-bar__game-count">{displayCount.toLocaleString()} games</span>
        {showNewBadge && newGamesDelta > 0 && (
          <span className="jam-meta-bar__new-badge" aria-live="polite">
            +{newGamesDelta} new
          </span>
        )}
        <span className="jam-meta-bar__sep" aria-hidden>·</span>
        <span className="jam-meta-bar__muted">{updatedLabel}</span>
        {votingLabel && (
          <>
            <span className="jam-meta-bar__sep" aria-hidden>·</span>
            <span className="jam-meta-bar__timer">{votingLabel}</span>
          </>
        )}
      </p>
    </div>
  );
}
