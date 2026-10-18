import { useEffect } from 'react';
import { motion } from 'motion/react';
import { Siren as SirenIcon } from 'lucide-react';
import type { Siren } from '@/features/emergency/siren';

/**
 * Full-screen alarm. The background alternates once per second — well under the 3 flashes/second
 * photosensitivity limit (WCAG 2.3.1) — while the siren plays. Any tap stops it.
 */
export function AlarmOverlay({ siren, onStop }: { siren: Siren; onStop: () => void }) {
  useEffect(() => {
    let lock: WakeLockSentinel | undefined;
    void siren.start().catch(() => onStop());
    navigator.wakeLock
      ?.request('screen')
      .then((l) => (lock = l))
      .catch(() => undefined);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onStop();
    window.addEventListener('keydown', onKey);
    return () => {
      siren.stop();
      void lock?.release();
      window.removeEventListener('keydown', onKey);
    };
  }, [siren, onStop]);

  return (
    <motion.button
      type="button"
      onClick={onStop}
      aria-label="Stop alarm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, backgroundColor: ['#ff2238', '#160307', '#ff2238'] }}
      transition={{ backgroundColor: { duration: 2, repeat: Infinity, ease: 'easeInOut' } }}
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-6 text-white"
    >
      <motion.span animate={{ scale: [1, 1.12, 1] }} transition={{ duration: 1, repeat: Infinity }}>
        <SirenIcon size={96} strokeWidth={1.5} />
      </motion.span>
      <span className="text-6xl font-extrabold tracking-tight">ALARM</span>
      <span className="hud text-white/80">Tap anywhere to stop</span>
    </motion.button>
  );
}
