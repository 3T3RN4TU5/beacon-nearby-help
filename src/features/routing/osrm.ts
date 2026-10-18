import { OSRM_ENDPOINTS, OSRM_PACE_MS, type TravelMode } from '@/config/endpoints';
import { fetchJson, withFailover } from '@/lib/http';
import type { LatLng } from '@/lib/geo';
import { describeStep, type Maneuver } from './instructions';

interface OsrmTableResponse {
  code: string;
  message?: string;
  durations?: (number | null)[][];
  distances?: (number | null)[][];
}

interface OsrmStep {
  distance: number;
  duration: number;
  name: string;
  ref?: string;
  rotary_name?: string;
  maneuver: Maneuver;
}

interface OsrmRouteResponse {
  code: string;
  message?: string;
  routes?: {
    distance: number;
    duration: number;
    geometry: { type: 'LineString'; coordinates: [number, number][] };
    legs: { steps: OsrmStep[] }[];
  }[];
}

export class OsrmError extends Error {
  readonly code: string;
  constructor(code: string, message?: string) {
    super(message ?? code);
    this.name = 'OsrmError';
    this.code = code;
  }
}

export interface TravelTimes {
  /** Seconds per destination, null when the router found no path. */
  durations: (number | null)[];
  /** Metres per destination. */
  distances: (number | null)[];
}

export interface RouteStep {
  instruction: string;
  maneuver: Maneuver;
  distance: number;
  duration: number;
}

export interface Route {
  mode: TravelMode;
  distance: number;
  duration: number;
  /** [lon, lat] pairs. */
  coordinates: [number, number][];
  steps: RouteStep[];
}

const coord = (p: LatLng) => `${p.lon.toFixed(6)},${p.lat.toFixed(6)}`;

/** One request returns road time from the user to every candidate (OSRM Table service). */
export async function fetchTravelTimes(
  mode: TravelMode,
  origin: LatLng,
  destinations: readonly LatLng[],
  signal?: AbortSignal,
): Promise<TravelTimes> {
  if (destinations.length === 0) return { durations: [], distances: [] };
  const path = [origin, ...destinations].map(coord).join(';');
  return withFailover(
    OSRM_ENDPOINTS[mode],
    async (base) => {
      // Profile segment is always "driving": FOSSGIS picks the profile from the base path.
      const res = await fetchJson<OsrmTableResponse>(
        `${base}/table/v1/driving/${path}?sources=0&annotations=duration,distance`,
        { signal, timeoutMs: 15_000, paceMs: OSRM_PACE_MS },
      );
      if (res.code !== 'Ok' || !res.durations?.[0]) throw new OsrmError(res.code, res.message);
      return {
        durations: res.durations[0].slice(1),
        distances: res.distances?.[0]?.slice(1) ?? destinations.map(() => null),
      };
    },
    { signal, rounds: 2 },
  );
}

export async function fetchRoute(
  mode: TravelMode,
  origin: LatLng,
  destination: LatLng,
  signal?: AbortSignal,
): Promise<Route> {
  return withFailover(
    OSRM_ENDPOINTS[mode],
    async (base) => {
      const res = await fetchJson<OsrmRouteResponse>(
        `${base}/route/v1/driving/${coord(origin)};${coord(destination)}?overview=full&geometries=geojson&steps=true&alternatives=false`,
        { signal, timeoutMs: 15_000, paceMs: OSRM_PACE_MS },
      );
      const route = res.routes?.[0];
      if (res.code !== 'Ok' || !route) throw new OsrmError(res.code, res.message);
      const steps = route.legs.flatMap((leg) => leg.steps);
      return {
        mode,
        distance: route.distance,
        duration: route.duration,
        coordinates: route.geometry.coordinates,
        steps: steps.map((s) => ({
          instruction: describeStep(s.maneuver, s.name || s.ref || '', s.rotary_name),
          maneuver: s.maneuver,
          distance: s.distance,
          duration: s.duration,
        })),
      };
    },
    { signal, rounds: 2 },
  );
}

/** Used when the router is unreachable: straight line × typical detour at a conservative speed. */
const FALLBACK_SPEED_KMH: Record<TravelMode, number> = { driving: 28, cycling: 14, walking: 4.8 };
const DETOUR_FACTOR = 1.35;

export function estimateTravel(
  straightLineM: number,
  mode: TravelMode,
): { distance: number; duration: number } {
  const distance = straightLineM * DETOUR_FACTOR;
  return { distance, duration: distance / (FALLBACK_SPEED_KMH[mode] / 3.6) };
}
