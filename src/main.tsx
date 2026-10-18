import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import '@fontsource-variable/overpass';
import '@fontsource-variable/overpass-mono';
import 'maplibre-gl/dist/maplibre-gl.css';
import './styles/index.css';
import { App } from './App';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      // Serve cached data immediately when offline instead of pausing on a spinner.
      networkMode: 'offlineFirst',
    },
  },
});

// Last results survive reloads and dead zones: a cached "nearest hospital" beats a blank screen.
const persister = createSyncStoragePersister({
  storage: typeof window === 'undefined' ? undefined : window.localStorage,
  key: 'beacon-cache',
  throttleTime: 2000,
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 24 * 60 * 60 * 1000,
        buster: __APP_VERSION__,
        dehydrateOptions: {
          shouldDehydrateQuery: (q) => q.state.status === 'success' && q.queryKey[0] !== 'search',
        },
      }}
    >
      <App />
    </PersistQueryClientProvider>
  </StrictMode>,
);
