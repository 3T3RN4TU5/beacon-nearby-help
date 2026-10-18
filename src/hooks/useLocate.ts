import { useEffect } from 'react';
import { locateMe } from '@/features/location/controller';
import { watchFix } from '@/features/location/geolocate';
import { haversine } from '@/lib/geo';
import { useApp } from '@/store/app';

/** "Find me": first fix at once, then GPS refinement (see features/location/controller). */
export function useLocate() {
  return locateMe;
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
