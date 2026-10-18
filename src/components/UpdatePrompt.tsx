import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CloudOff, RefreshCw } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from './ui/Button';

/** Service-worker lifecycle: tell the user when Beacon works offline, and when an update is ready. */
export function UpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Check for a new version every hour for long-lived tabs.
      if (registration) setInterval(() => void registration.update(), 60 * 60 * 1000);
    },
  });

  useEffect(() => {
    if (!offlineReady) return;
    const t = setTimeout(() => setOfflineReady(false), 5000);
    return () => clearTimeout(t);
  }, [offlineReady, setOfflineReady]);

  const show = offlineReady || needRefresh;
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="fixed top-[76px] left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-line-strong bg-surface px-4 py-2.5 shadow-panel"
        >
          {needRefresh ? (
            <>
              <RefreshCw size={16} className="text-accent-ink" />
              <span className="text-sm">A new version of Beacon is ready.</span>
              <Button variant="primary" size="sm" onClick={() => void updateServiceWorker(true)}>
                Reload
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setNeedRefresh(false)}>
                Later
              </Button>
            </>
          ) : (
            <>
              <CloudOff size={16} className="text-ok" />
              <span className="text-sm">Beacon is ready to work offline.</span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
