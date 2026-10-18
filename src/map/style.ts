import type { LayerSpecification, StyleSpecification } from 'maplibre-gl';
import { MAP_STYLES, NIGHT_LIGHTS_TILES } from '@/config/endpoints';
import { parseColor, tint, type TintOptions } from '@/lib/color';

export type MapTheme = 'dark' | 'light';

interface Palette {
  tint: TintOptions;
  background: string;
  water: string;
  buildings3d: string;
  sky: StyleSpecification['sky'];
}

const PALETTES: Record<MapTheme, Palette> = {
  dark: {
    // Greys become cool ink-navy; road hierarchy is kept because lightness is preserved.
    tint: { hue: 214, saturation: (s) => 0.14 + s * 0.25, lightness: (l) => l * 1.08 },
    background: '#07090c',
    water: '#0a1520',
    buildings3d: '#18202a',
    sky: {
      'sky-color': '#07090c',
      'horizon-color': '#16263a',
      'fog-color': '#0a0f15',
      'sky-horizon-blend': 0.7,
      'horizon-fog-blend': 0.8,
      'fog-ground-blend': 0.75,
      'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 0.7, 9, 0],
    },
  },
  light: {
    tint: { hue: 70, saturation: (s) => 0.05 + s * 0.3 },
    background: '#f2f3ee',
    water: '#c8d4da',
    buildings3d: '#dfe1d9',
    sky: {
      'sky-color': '#cfe0ec',
      'horizon-color': '#ffffff',
      'fog-color': '#f2f3ee',
      'sky-horizon-blend': 0.6,
      'horizon-fog-blend': 0.7,
      'fog-ground-blend': 0.6,
      'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 0.6, 9, 0],
    },
  },
};

/** Recursively re-tint every colour literal inside a paint value (plain or expression). */
function mapColors(value: unknown, fn: (c: string) => string): unknown {
  if (typeof value === 'string') return parseColor(value) ? fn(value) : value;
  if (Array.isArray(value)) return value.map((v) => mapColors(v, fn));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, mapColors(v, fn)]));
  }
  return value;
}

export const BEACON_LAYER_PREFIX = 'beacon-';

/**
 * Index just above the last geometry layer, i.e. where the trailing block of labels begins.
 * Styles interleave some labels early (water names), so "before the first symbol layer" would
 * put our layers underneath every road.
 */
export function labelsStartIndex(layers: readonly { type: string }[]): number {
  for (let i = layers.length - 1; i >= 0; i--) if (layers[i]!.type !== 'symbol') return i + 1;
  return 0;
}

const NUMERIC_COMPARISONS = new Set(['<', '<=', '>', '>=']);
const isGet = (v: unknown): v is ['get', string] =>
  Array.isArray(v) && v.length === 2 && v[0] === 'get' && typeof v[1] === 'string';

/**
 * Upstream filters such as `["<=", ["get", "ref_length"], 6]` hit features that lack the property
 * and MapLibre logs a warning for each one. Coalesce those reads to a value that makes the
 * comparison false — the same outcome, without the console noise.
 */
export function nullSafeComparisons(expr: unknown): unknown {
  if (!Array.isArray(expr)) return expr;
  const [op, left, right] = expr;
  if (
    typeof op === 'string' &&
    NUMERIC_COMPARISONS.has(op) &&
    expr.length === 3 &&
    isGet(left) &&
    typeof right === 'number'
  ) {
    const never = op.startsWith('<') ? Number.MAX_SAFE_INTEGER : -Number.MAX_SAFE_INTEGER;
    return [op, ['coalesce', left, never], right];
  }
  return expr.map(nullSafeComparisons);
}

export function themeStyle(base: StyleSpecification, theme: MapTheme): StyleSpecification {
  const palette = PALETTES[theme];
  const recolor = (c: string) => tint(c, palette.tint);

  const layers: LayerSpecification[] = base.layers.map((original) => {
    const layer = (
      'filter' in original && original.filter
        ? { ...original, filter: nullSafeComparisons(original.filter) }
        : original
    ) as LayerSpecification;
    if (!('paint' in layer) || !layer.paint) return layer;
    const paint = Object.fromEntries(
      Object.entries(layer.paint).map(([k, v]) => [k, k.endsWith('-color') ? mapColors(v, recolor) : v]),
    );
    if (layer.type === 'background') paint['background-color'] = palette.background;
    if (layer.type === 'fill' && /^water/.test(layer.id)) paint['fill-color'] = palette.water;
    // Calm the globe: country/sea names recede at world zooms and return as you zoom in.
    if (layer.type === 'symbol' && /^(place_(country|continent|state)|water_name)/.test(layer.id)) {
      paint['text-opacity'] = ['interpolate', ['linear'], ['zoom'], 1, 0.3, 4, 0.85];
    }
    return { ...layer, paint } as LayerSpecification;
  });

  const sources = { ...base.sources };

  // NASA Black Marble city lights on the night globe; fades out before street level.
  if (theme === 'dark') {
    sources['beacon-night-lights'] = {
      type: 'raster',
      tiles: [NIGHT_LIGHTS_TILES],
      tileSize: 256,
      maxzoom: 8,
      attribution: 'Night lights: NASA Earth Observatory / GIBS',
    };
    const nightLights: LayerSpecification = {
      id: `${BEACON_LAYER_PREFIX}night-lights`,
      type: 'raster',
      source: 'beacon-night-lights',
      maxzoom: 10,
      paint: {
        'raster-opacity': ['interpolate', ['linear'], ['zoom'], 0, 1, 4, 0.9, 7, 0.35, 9.5, 0],
        // At globe zooms city lights are sub-pixel and average out dim; lift them.
        'raster-contrast': 0.5,
        'raster-brightness-max': 1,
        'raster-saturation': -0.15,
        'raster-fade-duration': 400,
      },
    };
    const firstWater = layers.findIndex((l) => /^water/.test(l.id));
    layers.splice(firstWater >= 0 ? firstWater : 1, 0, nightLights);
  }

  // Extruded buildings that rise as you zoom in (render_height comes from OpenMapTiles).
  const buildings3d: LayerSpecification = {
    id: `${BEACON_LAYER_PREFIX}buildings-3d`,
    type: 'fill-extrusion',
    source: 'openmaptiles',
    'source-layer': 'building',
    minzoom: 14,
    paint: {
      'fill-extrusion-color': palette.buildings3d,
      'fill-extrusion-height': [
        'interpolate',
        ['linear'],
        ['zoom'],
        14,
        0,
        15.5,
        ['coalesce', ['get', 'render_height'], 6],
      ],
      'fill-extrusion-base': [
        'interpolate',
        ['linear'],
        ['zoom'],
        14,
        0,
        15.5,
        ['coalesce', ['get', 'render_min_height'], 0],
      ],
      'fill-extrusion-opacity': 0.82,
      'fill-extrusion-vertical-gradient': true,
    },
  };
  layers.splice(labelsStartIndex(layers), 0, buildings3d);

  return {
    ...base,
    sources,
    layers,
    sky: palette.sky,
    projection: { type: 'globe' },
  };
}

const cache = new Map<MapTheme, Promise<StyleSpecification>>();

export function loadMapStyle(theme: MapTheme): Promise<StyleSpecification> {
  let pending = cache.get(theme);
  if (!pending) {
    pending = fetch(MAP_STYLES[theme])
      .then((r) => {
        if (!r.ok) throw new Error(`Map style failed to load (${r.status})`);
        return r.json() as Promise<StyleSpecification>;
      })
      .then((base) => themeStyle(base, theme));
    pending.catch(() => cache.delete(theme));
    cache.set(theme, pending);
  }
  return pending;
}
