import { useCallback, useEffect, useState } from 'react';
import { loadGames } from './games';
import type { GamesBundle } from '../types';

const REFRESH_MS = 10 * 60 * 1000;

export function useGames() {
  const [bundle, setBundle] = useState<GamesBundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshBundle = useCallback(async (showLoading: boolean) => {
    if (showLoading) setLoading(true);
    try {
      const b = await loadGames();
      setBundle(b);
      setError(null);
      return b;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Load failed');
      return null;
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void refreshBundle(true).then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [refreshBundle]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void refreshBundle(false);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    const interval = window.setInterval(() => void refreshBundle(false), REFRESH_MS);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(interval);
    };
  }, [refreshBundle]);

  return { bundle, error, loading };
}
