import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type CountsMap = Record<string, number>;

interface FavoriteCountsContextValue {
  getCount: (gameId: string) => number;
  applyDelta: (gameId: string, delta: 1 | -1) => void;
  ready: boolean;
}

const FavoriteCountsContext = createContext<FavoriteCountsContextValue | null>(null);

export function FavoriteCountsProvider({ children }: { children: ReactNode }) {
  const [counts, setCounts] = useState<CountsMap>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/favorites');
        if (!res.ok) throw new Error('fetch failed');
        const data = (await res.json()) as { counts?: CountsMap };
        if (!cancelled) setCounts(data.counts ?? {});
      } catch {
        if (!cancelled) setCounts({});
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const applyDelta = useCallback((gameId: string, delta: 1 | -1) => {
    setCounts((prev) => {
      const next = Math.max(0, (prev[gameId] ?? 0) + delta);
      const updated = { ...prev };
      if (next === 0) delete updated[gameId];
      else updated[gameId] = next;
      return updated;
    });

    void fetch('/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId, delta }),
    })
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { gameId?: string; count?: number };
        const id = data.gameId;
        const count = data.count;
        if (typeof id !== 'string' || typeof count !== 'number') return;
        setCounts((prev) => {
          const updated = { ...prev };
          if (count <= 0) delete updated[id];
          else updated[id] = count;
          return updated;
        });
      })
      .catch(() => {});
  }, []);

  const getCount = useCallback((gameId: string) => counts[gameId] ?? 0, [counts]);

  const value = useMemo(
    () => ({ getCount, applyDelta, ready }),
    [getCount, applyDelta, ready],
  );

  return (
    <FavoriteCountsContext.Provider value={value}>{children}</FavoriteCountsContext.Provider>
  );
}

export function useFavoriteCounts(): FavoriteCountsContextValue {
  const ctx = useContext(FavoriteCountsContext);
  if (!ctx) {
    throw new Error('useFavoriteCounts must be used within FavoriteCountsProvider');
  }
  return ctx;
}
