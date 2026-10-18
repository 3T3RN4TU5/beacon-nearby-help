import { useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { CATEGORIES, CATEGORY_IDS, type CategoryId } from '@/config/categories';
import type { TravelMode } from '@/config/endpoints';
import { reverseGeocode } from '@/features/location/geocode';
import { findNearbyPlaces } from '@/features/places/overpass';
import type { Place } from '@/features/places/types';
import { estimateTravel, fetchRoute, fetchTravelTimes } from '@/features/routing/osrm';
import { fetchAirQuality, fetchForecast } from '@/features/weather/openMeteo';
import { locationKey, type LatLng } from '@/lib/geo';
import { useSearchStatus } from '@/store/app';

const MINUTE = 60_000;

export const userLang = () =>
  typeof navigator === 'undefined' ? 'en' : navigator.language.split('-')[0] || 'en';

export function usePlaces(origin: LatLng | null) {
  const lang = userLang();
  return useQuery({
    queryKey: ['places', origin && locationKey(origin, 3), lang],
    queryFn: async ({ signal }) => {
      try {
        return await findNearbyPlaces(origin!, {
          signal,
          lang,
          onProgress: ({ radius }) => useSearchStatus.getState().set(radius),
        });
      } finally {
        useSearchStatus.getState().set(null);
      }
    },
    enabled: Boolean(origin),
    staleTime: 15 * MINUTE,
    gcTime: 24 * 60 * MINUTE,
    retry: 1,
  });
}

export interface Travel {
  duration: number;
  distance: number;
  /** True when the router was unavailable and we fell back to a straight-line estimate. */
  estimated: boolean;
}

export interface RankedPlace extends Place {
  travel: Travel;
}

export interface CategoryResult {
  id: CategoryId;
  places: RankedPlace[];
  /** Best canonical match by travel time (a hospital is preferred over a clinic). */
  nearest: RankedPlace | null;
  searchedRadius?: number;
}

/** How many straight-line-nearest candidates per category get a real road-time lookup. */
const CANDIDATES_PER_CATEGORY = 5;

function candidatesFor(places: Place[]): Place[] {
  return CATEGORY_IDS.flatMap((id) =>
    places.filter((p) => p.category === id).slice(0, CANDIDATES_PER_CATEGORY),
  );
}

const hashIds = (ids: string[]) => {
  let h = 5381;
  for (const ch of ids.join('|')) h = ((h << 5) + h + ch.charCodeAt(0)) | 0;
  return (h >>> 0).toString(36);
};

export function useTravelTimes(origin: LatLng | null, places: Place[] | undefined, mode: TravelMode) {
  const candidates = useMemo(() => (places ? candidatesFor(places) : []), [places]);
  return useQuery({
    queryKey: ['matrix', mode, origin && locationKey(origin, 3), hashIds(candidates.map((c) => c.id))],
    queryFn: async ({ signal }) => {
      const res = await fetchTravelTimes(mode, origin!, candidates, signal);
      // Plain object (not Map) so the result survives JSON persistence for offline use.
      const byId: TravelTimesById = {};
      candidates.forEach((c, i) => {
        const duration = res.durations[i];
        if (typeof duration === 'number') byId[c.id] = { duration, distance: res.distances[i] ?? c.distance };
      });
      return byId;
    },
    enabled: Boolean(origin) && candidates.length > 0,
    staleTime: 10 * MINUTE,
    placeholderData: keepPreviousData,
    retry: 1,
  });
}

export type TravelTimesById = Record<string, { duration: number; distance: number }>;

export function rankPlaces(
  places: Place[],
  times: TravelTimesById | undefined,
  mode: TravelMode,
  searchedRadius: Partial<Record<CategoryId, number>> = {},
): Record<CategoryId, CategoryResult> {
  const ranked: RankedPlace[] = places.map((p) => {
    const t = times?.[p.id];
    return {
      ...p,
      travel: t ? { ...t, estimated: false } : { ...estimateTravel(p.distance, mode), estimated: true },
    };
  });
  const out = {} as Record<CategoryId, CategoryResult>;
  for (const id of CATEGORY_IDS) {
    const list = ranked
      .filter((p) => p.category === id)
      .sort((a, b) => a.travel.duration - b.travel.duration);
    out[id] = {
      id,
      places: list,
      nearest: list.find((p) => p.rank === 0) ?? list[0] ?? null,
      searchedRadius: searchedRadius[id],
    };
  }
  return out;
}

/** Everything the Nearby panel needs: places ranked per category by road time for the chosen mode. */
export function useNearby(origin: LatLng | null, mode: TravelMode) {
  const places = usePlaces(origin);
  const times = useTravelTimes(origin, places.data?.places, mode);
  const results = useMemo(
    () => (places.data ? rankPlaces(places.data.places, times.data, mode, places.data.searchedRadius) : null),
    [places.data, times.data, mode],
  );
  return {
    results,
    placesQuery: places,
    timesQuery: times,
    /** Ranking is still settling (road times on their way). */
    refining: times.isFetching,
    fetchedAt: places.data?.fetchedAt,
  };
}

export function useRoute(origin: LatLng | null, place: Place | null, mode: TravelMode) {
  return useQuery({
    queryKey: ['route', mode, origin && locationKey(origin, 4), place?.id],
    queryFn: ({ signal }) => fetchRoute(mode, origin!, place!, signal),
    enabled: Boolean(origin && place),
    staleTime: 10 * MINUTE,
    retry: 1,
  });
}

export function useForecast(origin: LatLng | null) {
  return useQuery({
    queryKey: ['forecast', origin && locationKey(origin, 2)],
    queryFn: ({ signal }) => fetchForecast(origin!, signal),
    enabled: Boolean(origin),
    staleTime: 15 * MINUTE,
    refetchInterval: 30 * MINUTE,
  });
}

export function useAirQuality(origin: LatLng | null) {
  return useQuery({
    queryKey: ['air', origin && locationKey(origin, 2)],
    queryFn: ({ signal }) => fetchAirQuality(origin!, signal),
    enabled: Boolean(origin),
    staleTime: 30 * MINUTE,
    retry: 1,
  });
}

export function usePlaceLabel(origin: LatLng | null) {
  const lang = userLang();
  return useQuery({
    queryKey: ['revgeo', origin && locationKey(origin, 4), lang],
    queryFn: ({ signal }) => reverseGeocode(origin!, signal, lang),
    enabled: Boolean(origin),
    staleTime: Infinity,
    retry: 1,
  });
}

export function categoryLabel(id: CategoryId, plural = false) {
  return plural ? CATEGORIES[id].plural : CATEGORIES[id].label;
}
