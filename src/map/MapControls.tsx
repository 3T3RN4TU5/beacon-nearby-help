import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Box, LocateFixed, Minus, Navigation, Plus } from 'lucide-react';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { useMapInsets } from '@/hooks/useScene';
import { cn } from '@/lib/cn';
import { useApp } from '@/store/app';
import { useMap } from './context';

const btn =
  'grid size-10 place-items-center text-muted transition-colors hover:bg-raised hover:text-fg disabled:opacity-40 first:rounded-t-xl last:rounded-b-xl';

export function MapControls() {
  const map = useMap()!;
  const phase = useApp((s) => s.phase);
  const origin = useApp((s) => s.origin);
  const tracking = useApp((s) => s.tracking);
  const setTracking = useApp((s) => s.setTracking);
  const desktop = useIsDesktop();
  const insets = useMapInsets();
  const [pitched, setPitched] = useState(true);

  useEffect(() => {
    const sync = () => setPitched(map.getPitch() > 10);
    map.on('pitchend', sync);
    return () => {
      map.off('pitchend', sync);
    };
  }, [map]);

  if (phase !== 'active') return null;

  const style = desktop ? { top: insets.top + 4, right: 16 } : { right: 12, bottom: insets.bottom + 12 };

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0, transition: { delay: 0.9 } }}
      className="fixed z-10 flex flex-col gap-2"
      style={style}
    >
      <div className="flex flex-col divide-y divide-line rounded-xl border border-line-strong bg-glass shadow-panel backdrop-blur">
        <button type="button" className={btn} aria-label="Zoom in" onClick={() => map.zoomIn()}>
          <Plus size={17} />
        </button>
        <button type="button" className={btn} aria-label="Zoom out" onClick={() => map.zoomOut()}>
          <Minus size={17} />
        </button>
        <button
          type="button"
          className={cn(btn, pitched && 'text-accent-ink')}
          aria-label={pitched ? 'Switch to 2D view' : 'Switch to 3D view'}
          aria-pressed={pitched}
          onClick={() => map.easeTo({ pitch: pitched ? 0 : 55, bearing: pitched ? 0 : -16, duration: 700 })}
        >
          <Box size={17} />
        </button>
      </div>
      <div className="flex flex-col divide-y divide-line rounded-xl border border-line-strong bg-glass shadow-panel backdrop-blur">
        <button
          type="button"
          className={btn}
          aria-label="Centre on my location"
          disabled={!origin}
          onClick={() =>
            origin &&
            map.flyTo({ center: [origin.lon, origin.lat], zoom: Math.max(map.getZoom(), 15), duration: 900 })
          }
        >
          <LocateFixed size={17} />
        </button>
        <button
          type="button"
          className={cn(btn, tracking && 'bg-accent text-accent-fg hover:bg-accent hover:text-accent-fg')}
          aria-label={tracking ? 'Stop following my location' : 'Follow my location live'}
          aria-pressed={tracking}
          onClick={() => setTracking(!tracking)}
        >
          <Navigation size={16} className={tracking ? 'fill-current' : ''} />
        </button>
      </div>
    </motion.div>
  );
}
