import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Map as MapLibre, setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { useResolvedTheme } from '@/hooks/useEnvironment';
import { initialCenter, initialZoom } from './camera';
import { MapContext } from './context';
import { loadMapStyle } from './style';

setWorkerUrl(workerUrl);

/**
 * Owns the MapLibre instance. The style is fetched and re-tinted before the map is created so the
 * very first frame is already on-brand (no flash of the default palette).
 */
export function MapView({ children }: { children?: ReactNode }) {
  const container = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<MapLibre | null>(null);
  const [error, setError] = useState<string | null>(null);
  const theme = useResolvedTheme();
  const appliedTheme = useRef(theme);

  useEffect(() => {
    let disposed = false;
    let instance: MapLibre | undefined;
    loadMapStyle(appliedTheme.current)
      .then((style) => {
        if (disposed || !container.current) return;
        instance = new MapLibre({
          container: container.current,
          style,
          center: initialCenter(),
          zoom: initialZoom(),
          attributionControl: { compact: true },
          maxPitch: 72,
          fadeDuration: 180,
          dragRotate: true,
          pitchWithRotate: true,
        });
        // 'style.load' (style parsed, sources ready) rather than 'load', which waits for every
        // initial tile — including slow night-light rasters — before the scene could start.
        instance.once('style.load', () => !disposed && setMap(instance!));
        if (import.meta.env.DEV) (window as unknown as { __beaconMap?: MapLibre }).__beaconMap = instance;
        instance.on('error', (e) => {
          const message = e.error?.message ?? '';
          if (/webgl/i.test(message))
            setError('Your browser could not start the 3D map (WebGL2 unavailable).');
          // Registering a listener silences MapLibre's default logging, so report it ourselves.
          console.error('[map]', e.error ?? e);
        });
      })
      .catch(() => !disposed && setError('The map could not be loaded. Results still work below.'));
    return () => {
      disposed = true;
      instance?.remove();
      setMap(null);
    };
  }, []);

  useEffect(() => {
    if (!map || appliedTheme.current === theme) return;
    appliedTheme.current = theme;
    let cancelled = false;
    loadMapStyle(theme)
      .then((style) => !cancelled && map.setStyle(style, { diff: true }))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [map, theme]);

  return (
    <MapContext.Provider value={map}>
      {/* MapLibre's CSS forces `position: relative` on its container, so it gets a sized wrapper. */}
      <div className="absolute inset-0">
        <div ref={container} className="h-full w-full" aria-label="Map" role="region" />
      </div>
      {error && (
        <div className="absolute inset-0 grid place-items-center bg-canvas p-8 text-center text-sm text-muted">
          <p className="max-w-xs">{error}</p>
        </div>
      )}
      {map && children}
    </MapContext.Provider>
  );
}
