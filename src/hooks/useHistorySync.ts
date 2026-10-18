import { useEffect, useRef } from 'react';
import { useApp, type View } from '@/store/app';

const viewLevel = (view: View) => (view.kind === 'overview' ? 0 : view.kind === 'category' ? 1 : 2);

/**
 * Makes the system Back button (Android, browser) step back inside Beacon — place → list →
 * overview, and out of pin-adjust mode — instead of leaving the app.
 *
 * Each step deeper pushes a history entry. A system Back pops one and we mirror it in the store;
 * an in-app Back (or Home) lowers the level and we consume the matching entries ourselves.
 */
export function useHistorySync() {
  const view = useApp((s) => s.view);
  const adjusting = useApp((s) => s.adjusting);
  const level = viewLevel(view) + (adjusting ? 1 : 0);

  const pushed = useRef(0);
  const prevLevel = useRef(level);
  const ignorePops = useRef(0);

  useEffect(() => {
    const prev = prevLevel.current;
    prevLevel.current = level;
    if (level > prev) {
      for (let i = prev; i < level; i++) window.history.pushState({ beacon: true }, '');
      pushed.current += level - prev;
    } else if (level < prev && pushed.current > 0) {
      const n = Math.min(prev - level, pushed.current);
      pushed.current -= n;
      ignorePops.current += 1;
      window.history.go(-n);
    }
  }, [level]);

  useEffect(() => {
    const onPop = () => {
      if (ignorePops.current > 0) {
        ignorePops.current -= 1;
        return;
      }
      if (pushed.current === 0) return;
      pushed.current -= 1;
      // This entry is already gone; tell the level effect not to pop another one.
      prevLevel.current = Math.max(0, prevLevel.current - 1);
      const s = useApp.getState();
      if (s.adjusting) s.setAdjusting(false);
      else s.back();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
}
