import { CATEGORIES, CATEGORY_IDS, SEARCH_TIERS, type CategoryId } from '@/config/categories';
import { OVERPASS_ENDPOINTS } from '@/config/endpoints';
import { HttpError, fetchJson, withHedging } from '@/lib/http';
import type { LatLng } from '@/lib/geo';
import { dedupe, parseElements } from './parse';
import type { OverpassElement, OverpassResponse, Place, PlacesResult } from './types';

export function buildOverpassQuery(
  categories: readonly CategoryId[],
  center: LatLng,
  radius: number,
): string {
  const around = `(around:${Math.round(radius)},${center.lat.toFixed(6)},${center.lon.toFixed(6)})`;
  const statements = categories.flatMap((id) =>
    CATEGORIES[id].matchers.map((m) => `nwr["${m.key}"="${m.value}"]${around};`),
  );
  // `out tags center` returns tags plus a single coordinate per element (centroid for ways/relations).
  return `[out:json][timeout:25];(${statements.join('')});out tags center;`;
}

export async function runOverpass(query: string, signal?: AbortSignal): Promise<OverpassElement[]> {
  // Public Overpass mirrors are often at capacity; hedge across them to bound waiting time.
  return withHedging(
    OVERPASS_ENDPOINTS,
    async (endpoint, attemptSignal) => {
      // Form-encoded POST keeps this a CORS "simple request" (no preflight round-trip).
      const res = await fetchJson<OverpassResponse>(endpoint, {
        method: 'POST',
        body: new URLSearchParams({ data: query }),
        timeoutMs: 25_000,
        signal: attemptSignal,
      });
      // Overpass reports server-side timeouts as 200 + remark; treat that as a retryable failure.
      if (res.remark && /error|timed out|out of memory/i.test(res.remark) && res.elements.length === 0) {
        throw new HttpError(504, endpoint, res.remark);
      }
      return res.elements;
    },
    { signal, hedgeAfterMs: 6000, rounds: 2, backoffMs: 1500 },
  );
}

export interface SearchProgress {
  radius: number;
  categories: CategoryId[];
}

/**
 * Tiered search: ask for every category within 3 km, then widen only for the categories that
 * are still missing (or only have fallbacks, e.g. clinics but no hospital). In a city this is a
 * single request; on a highway it expands up to each category's max radius.
 */
export async function findNearbyPlaces(
  origin: LatLng,
  {
    signal,
    lang = 'en',
    onProgress,
  }: { signal?: AbortSignal; lang?: string; onProgress?: (p: SearchProgress) => void } = {},
): Promise<PlacesResult> {
  const byId = new Map<string, Place>();
  const searchedRadius: PlacesResult['searchedRadius'] = {};
  let pending: CategoryId[] = [...CATEGORY_IDS];

  for (const radius of SEARCH_TIERS) {
    const ask = pending.filter((id) => CATEGORIES[id].maxRadius >= radius);
    if (ask.length === 0) break;
    onProgress?.({ radius, categories: ask });

    const elements = await runOverpass(buildOverpassQuery(ask, origin, radius), signal);
    const found = parseElements(elements, origin, lang, ask);
    for (const place of found) if (!byId.has(place.id)) byId.set(place.id, place);
    for (const id of ask) searchedRadius[id] = radius;

    // A category is satisfied once it has at least one canonical (rank 0) result.
    pending = pending.filter((id) => !found.some((p) => p.category === id && p.rank === 0));
  }

  // Tiers can return the same facility as both node and way; dedupe across the merged set.
  return { places: dedupe([...byId.values()]), searchedRadius, fetchedAt: Date.now() };
}
