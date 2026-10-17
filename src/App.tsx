import { FavoriteCountsProvider } from './components/FavoriteCountsProvider';
import { SlotMachine } from './components/SlotMachine';
import { useGames } from './lib/useGames';

export function App() {
  const { bundle, error, loading } = useGames();

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
      <SlotMachine pool={bundle.games} jamName={bundle.jamName} jamSlug={bundle.jamSlug} />
    </FavoriteCountsProvider>
  );
}
