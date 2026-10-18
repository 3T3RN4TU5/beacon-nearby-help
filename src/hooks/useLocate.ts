import { useCallback, useEffect, useRef } from 'react';
import { GeoError, locate, watchFix } from '@/features/location/geolocate';
import { haversine } from '@/lib/geo';
import { useApp } from '@/store/app';

/** One-shot "find me": GPS with coarse fallback, wired into the app state machine. */
export function useLocate() {
  const startLocating = useApp((s) => s.startLocating);
  const setOrigin = useApp((s) => s.setOrigin);
  const failLocating = useApp((s) => s.failLocating);
  const attempt = useRef(0);

  return useCallback(async () => {
    const id = ++attempt.current;
    startLocating();
    try {
      const fix = await locate();
      if (id !== attempt.current || useApp.getState().phase === 'landing') return; // cancelled meanwhile
      setOrigin({
        lat: fix.lat,
        lon: fix.lon,
        accuracy: fix.accuracy,
        heading: fix.heading,
        source: 'gps',
        at: Date.now(),
      });
    } catch (error) {
      if (id !== attempt.current) return;
      failLocating(error instanceof GeoError ? error.kind : 'unavailable');
    }
  }, [startLocating, setOrigin, failLocating]);
}

/**
 * Live tracking while enabled. Small GPS jitter only moves the dot; once the user has travelled
 * far enough to change what is "nearest", the origin update triggers a fresh search.
 */
export function useTracking() {
  const tracking = useApp((s) => s.tracking);
  const updateFix = useApp((s) => s.updateFix);
  const setTracking = useApp((s) => s.setTracking);

  useEffect(() => {
    if (!tracking) return;
    let stop: (() => void) | undefined;
    try {
      stop = watchFix(
        (fix) => {
          const current = useApp.getState().origin;
          if (
            !current ||
            haversine(current, fix) > 25 ||
            (fix.accuracy ?? 0) < (current.accuracy ?? Infinity)
          ) {
            updateFix({ lat: fix.lat, lon: fix.lon, accuracy: fix.accuracy, heading: fix.heading });
          }
        },
        () => setTracking(false),
      );
    } catch {
      setTracking(false);
    }
    return () => stop?.();
  }, [tracking, updateFix, setTracking]);
}
