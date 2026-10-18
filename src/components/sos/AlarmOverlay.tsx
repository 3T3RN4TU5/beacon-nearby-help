import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Siren as SirenIcon, VolumeX } from 'lucide-react';
import type { Siren } from '@/features/emergency/siren';

/**
 * Full-screen alarm. The background alternates once per second — well under the 3 flashes/second
 * photosensitivity limit (WCAG 2.3.1) — while the siren plays. Any tap stops it.
 *
 * The visual alarm never depends on audio: if the browser refuses to play sound (some iPhones,
 * audio-less environments), the screen keeps flashing and says so.
 */
export function AlarmOverlay({ siren, onStop }: { siren: Siren; onStop: () => void }) {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    let lock: WakeLockSentinel | undefined;
    void siren.start().catch(() => setMuted(true));
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
      {muted && (
        <span className="flex items-center gap-2 rounded-full bg-black/30 px-3 py-1.5 text-sm">
          <VolumeX size={16} /> Sound unavailable on this device — screen alarm only
        </span>
      )}
      <span className="rounded-full bg-black/35 px-3 py-1 hud text-white">Tap anywhere to stop</span>
    </motion.button>
  );
}
