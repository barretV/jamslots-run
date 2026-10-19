import { useEffect, useState } from 'react';
import { FavoriteCountsProvider } from './components/FavoriteCountsProvider';
import { SlotMachine } from './components/SlotMachine';
import { useGames } from './lib/useGames';
import { syncLocalSessionWithJamBundle } from './state/persistence';

export function App() {
  const { bundle, error, loading } = useGames();
  const [sessionKey, setSessionKey] = useState('boot');

  useEffect(() => {
    if (!bundle) return;
    syncLocalSessionWithJamBundle(bundle.games, bundle.syncedAt);
    setSessionKey(`${bundle.syncedAt}-${bundle.count}`);
  }, [bundle]);

  if (loading) {
    return (
      <div className="app-shell flex h-dvh max-h-dvh items-center justify-center px-4">
        <p className="animate-pulse font-display text-[1.25rem] font-bold text-amber-200">
          Loading jam games…
        </p>
      </div>
    );
  }

  if (error || !bundle) {
    return (
      <div className="app-shell flex h-dvh max-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-[1.15rem] text-red-300">Could not load the game list.</p>
        <p className="text-[1.1rem] text-zinc-400">{error ?? 'Unknown error'}</p>
      </div>
    );
  }

  return (
    <FavoriteCountsProvider>
      <SlotMachine
        key={sessionKey}
        pool={bundle.games}
        jamName={bundle.jamName}
        jamSlug={bundle.jamSlug}
        syncedAt={bundle.syncedAt}
        votingCloseAt={bundle.votingCloseAt}
      />
    </FavoriteCountsProvider>
  );
}
