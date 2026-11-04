import { createContext, use, useEffect, useState, type ReactNode } from 'react';

import { BootScreen } from '../app/BootScreen';
import { ChangeNotifier, createRepositories, openVoiceBloomDB, type Repositories } from '../persistence';

const DataContext = createContext<Repositories | null>(null);

type DataState = { status: 'loading' } | { status: 'ready'; repos: Repositories } | { status: 'error' };

/**
 * Opens the on-device database and provides the repositories. Tests can pass
 * ready-made `repositories` instead.
 */
export function DataProvider({ children, repositories }: { children: ReactNode; repositories?: Repositories }) {
  const [state, setState] = useState<DataState>(
    repositories ? { status: 'ready', repos: repositories } : { status: 'loading' },
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (repositories) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    openVoiceBloomDB().then(
      (db) => {
        if (cancelled) {
          db.close();
          return;
        }
        // Keeps several open tabs in sync with each other.
        const notifier = new ChangeNotifier({ crossTabChannel: 'voicebloom-data' });
        cleanup = () => {
          notifier.close();
          db.close();
        };
        setState({ status: 'ready', repos: createRepositories(db, notifier) });
      },
      (error: unknown) => {
        console.error('VoiceBloom could not open its database.', error);
        if (!cancelled) setState({ status: 'error' });
      },
    );
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [repositories, attempt]);

  if (state.status === 'loading') return <BootScreen />;
  if (state.status === 'error') {
    return (
      <BootScreen
        error
        onRetry={() => {
          setState({ status: 'loading' });
          setAttempt((value) => value + 1);
        }}
      />
    );
  }
  return <DataContext value={state.repos}>{children}</DataContext>;
}

export function useRepositories(): Repositories {
  const repos = use(DataContext);
  if (!repos) throw new Error('useRepositories must be used inside <DataProvider>');
  return repos;
}
