import type { ExpressionSpecification, GeoJSONSource, Map as MapLibre } from 'maplibre-gl';
import { circleRing, type LatLng } from '@/lib/geo';
import { labelsStartIndex, type MapTheme } from './style';

const ACCURACY = 'beacon-accuracy';
const ROUTE = 'beacon-route';
const TAIL = 'beacon-route-tail';
const EMPTY: Parameters<GeoJSONSource['setData']>[0] = { type: 'FeatureCollection', features: [] };
const ACCENT = '#d6ff3d';

/** Above all roads and buildings, below the trailing labels. */
const overlayBeforeId = (map: MapLibre) => {
  const layers = map.getStyle().layers;
  return layers[labelsStartIndex(layers)]?.id;
};

/** Adds Beacon's own sources/layers if the current style lacks them. Returns true when (re)created. */
export function ensureOverlays(map: MapLibre, theme: MapTheme): boolean {
  if (map.getSource(ACCURACY)) return false;
  const before = overlayBeforeId(map);

  map.addSource(ACCURACY, { type: 'geojson', data: EMPTY });
  map.addLayer(
    {
      id: `${ACCURACY}-fill`,
      type: 'fill',
      source: ACCURACY,
      paint: { 'fill-color': ACCENT, 'fill-opacity': 0.07 },
    },
    before,
  );
  map.addLayer(
    {
      id: `${ACCURACY}-line`,
      type: 'line',
      source: ACCURACY,
      paint: { 'line-color': ACCENT, 'line-opacity': 0.5, 'line-width': 1.25, 'line-dasharray': [2, 2] },
    },
    before,
  );

  map.addSource(ROUTE, { type: 'geojson', data: EMPTY, lineMetrics: true });
  map.addSource(TAIL, { type: 'geojson', data: EMPTY });
  const lineLayout = { 'line-cap': 'round', 'line-join': 'round' } as const;
  // Routers stop at the nearest road; a dashed tail shows the last few metres to the door.
  map.addLayer(
    {
      id: `${TAIL}-line`,
      type: 'line',
      source: TAIL,
      layout: { 'line-cap': 'round' },
      paint: { 'line-color': ACCENT, 'line-width': 2.5, 'line-dasharray': [0.5, 2], 'line-opacity': 0.9 },
    },
    before,
  );
  map.addLayer(
    {
      id: `${ROUTE}-glow`,
      type: 'line',
      source: ROUTE,
      layout: lineLayout,
      paint: { 'line-color': ACCENT, 'line-width': 18, 'line-blur': 12, 'line-opacity': 0.28 },
    },
    before,
  );
  map.addLayer(
    {
      id: `${ROUTE}-casing`,
      type: 'line',
      source: ROUTE,
      layout: lineLayout,
      paint: { 'line-color': theme === 'dark' ? '#05070a' : '#ffffff', 'line-width': 9.5 },
    },
    before,
  );
  map.addLayer(
    {
      id: `${ROUTE}-line`,
      type: 'line',
      source: ROUTE,
      layout: lineLayout,
      paint: { 'line-width': 5, 'line-gradient': progressGradient(ACCENT, 1) },
    },
    before,
  );
  return true;
}

export function setAccuracy(map: MapLibre, origin: (LatLng & { accuracy?: number }) | null): void {
  const source = map.getSource<GeoJSONSource>(ACCURACY);
  if (!source) return;
  if (!origin?.accuracy || origin.accuracy < 8) return void source.setData(EMPTY);
  source.setData({
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [circleRing(origin, Math.min(origin.accuracy, 5000))] },
  });
}

/** Colour up to `progress` (0–1) of the line, transparent beyond: drives the "drawing" animation. */
function progressGradient(color: string, progress: number): ExpressionSpecification {
  if (progress >= 1) return ['interpolate', ['linear'], ['line-progress'], 0, color, 1, color];
  return ['step', ['line-progress'], color, Math.max(0.0001, progress), 'rgba(0,0,0,0)'];
}

/** Sets the route geometry and animates it drawing from origin to destination. Returns a cancel fn. */
export function showRoute(
  map: MapLibre,
  coordinates: [number, number][] | null,
  color: string,
  {
    animate = true,
    duration = 1100,
    destination,
  }: { animate?: boolean; duration?: number; destination?: LatLng } = {},
): () => void {
  const source = map.getSource<GeoJSONSource>(ROUTE);
  const tail = map.getSource<GeoJSONSource>(TAIL);
  if (!source) return () => undefined;
  if (!coordinates || coordinates.length < 2) {
    source.setData(EMPTY);
    tail?.setData(EMPTY);
    return () => undefined;
  }
  source.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } });
  const end = coordinates[coordinates.length - 1]!;
  tail?.setData(
    destination
      ? {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: [end, [destination.lon, destination.lat]] },
        }
      : EMPTY,
  );
  map.setPaintProperty(`${ROUTE}-glow`, 'line-color', color);
  map.setPaintProperty(`${TAIL}-line`, 'line-color', color);

  if (!animate) {
    map.setPaintProperty(`${ROUTE}-line`, 'line-gradient', progressGradient(color, 1));
    return () => undefined;
  }
  let raf = 0;
  const start = performance.now();
  const frame = (t: number) => {
    const p = Math.min(1, (t - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    if (map.getLayer(`${ROUTE}-line`))
      map.setPaintProperty(`${ROUTE}-line`, 'line-gradient', progressGradient(color, eased));
    if (p < 1) raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}

export function setRouteTheme(map: MapLibre, theme: MapTheme): void {
  if (map.getLayer(`${ROUTE}-casing`)) {
    map.setPaintProperty(`${ROUTE}-casing`, 'line-color', theme === 'dark' ? '#05070a' : '#ffffff');
  }
}
