import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useViewport } from '@/hooks/useMediaQuery';
import { useMapInsets } from '@/hooks/useScene';
import { useApp } from '@/store/app';
import { useMap } from './context';

/**
 * Manual location correction, ride-hailing style: the pin stays fixed at the centre of the visible
 * map and the user drags the map underneath it. Far more precise on a phone than dragging a dot.
 */
export function AdjustOverlay() {
  const map = useMap()!;
  const adjusting = useApp((s) => s.adjusting);
  const setAdjusting = useApp((s) => s.setAdjusting);
  const setOrigin = useApp((s) => s.setOrigin);
  const insets = useMapInsets();
  const { width, height } = useViewport();

  // The camera centre is the middle of the area the UI leaves uncovered; the pin's tip sits there.
  const cx = insets.left + (width - insets.left - insets.right) / 2;
  const cy = insets.top + (height - insets.top - insets.bottom) / 2;

  useEffect(() => {
    if (!adjusting) return;
    const { origin } = useApp.getState();
    if (origin) {
      // Flat and close in, so street-level detail is visible while placing the pin.
      map.easeTo({
        center: [origin.lon, origin.lat],
        zoom: Math.max(map.getZoom(), 16.5),
        pitch: 0,
        bearing: 0,
        padding: insets,
        duration: 700,
      });
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setAdjusting(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // Only on entering/leaving the mode; insets are read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adjusting, map, setAdjusting]);

  const confirm = () => {
    // Read the coordinate under the pin's tip itself, so it's exact even if the camera
    // padding is still animating.
    const p = map.unproject([cx, cy]);
    setOrigin({ lat: p.lat, lon: p.lng, source: 'pin', at: Date.now() });
  };

  return (
    <AnimatePresence>
      {adjusting && (
        <>
          <motion.div
            key="pin"
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="pointer-events-none fixed z-[15] -translate-x-1/2 -translate-y-full"
            style={{ left: cx, top: cy }}
            aria-hidden
          >
            <svg
              width="40"
              height="52"
              viewBox="0 0 40 52"
              className="drop-shadow-[0_8px_12px_rgb(0_0_0/0.5)]"
            >
              <path
                d="M20 51C20 51 37 32.5 37 19A17 17 0 0 0 3 19C3 32.5 20 51 20 51Z"
                fill="#d6ff3d"
                stroke="#07090c"
                strokeWidth="2.5"
              />
              <circle cx="20" cy="19" r="6.5" fill="#07090c" />
            </svg>
          </motion.div>
          <motion.span
            key="shadow"
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed z-[14] h-2 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/40 blur-[1px]"
            style={{ left: cx, top: cy }}
          />
          <motion.div
            key="bar"
            role="dialog"
            aria-label="Set your exact location"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed z-30 flex w-[min(calc(100vw-24px),420px)] -translate-x-1/2 flex-col gap-3 rounded-2xl border border-line-strong bg-glass p-3.5 shadow-panel backdrop-blur-xl"
            style={{ left: cx, top: Math.max(insets.top + 8, 72) }}
          >
            <p className="text-sm leading-snug">
              <span className="font-semibold">Move the map</span>{' '}
              <span className="text-muted">until the pin sits exactly where you are.</span>
            </p>
            <div className="grid grid-cols-[auto_1fr] gap-2">
              <Button variant="outline" size="md" onClick={() => setAdjusting(false)}>
                <X size={15} /> Cancel
              </Button>
              <Button variant="primary" size="md" onClick={confirm}>
                <Check size={16} strokeWidth={2.6} /> Set my location here
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
