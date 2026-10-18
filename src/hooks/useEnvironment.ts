import { useEffect, useState, useSyncExternalStore } from 'react';
import { useApp } from '@/store/app';
import { useMediaQuery } from './useMediaQuery';

/** The concrete theme in effect (system preference resolved), kept in sync with <html data-theme>. */
export function useResolvedTheme(): 'dark' | 'light' {
  const pref = useApp((s) => s.theme);
  const systemLight = useMediaQuery('(prefers-color-scheme: light)');
  const theme = pref === 'system' ? (systemLight ? 'light' : 'dark') : pref;
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#07090c' : '#f2f3ee');
  }, [theme]);
  return theme;
}

/** Re-renders every `intervalMs` so relative times and opening hours stay current. */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function useOnline(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener('online', onChange);
      window.addEventListener('offline', onChange);
      return () => {
        window.removeEventListener('online', onChange);
        window.removeEventListener('offline', onChange);
      };
    },
    () => navigator.onLine,
    () => true,
  );
}
