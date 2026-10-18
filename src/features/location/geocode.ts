import { BIGDATACLOUD_REVERSE, NOMINATIM_REVERSE, PHOTON_SEARCH } from '@/config/endpoints';
import { fetchJson, isAbortError } from '@/lib/http';
import type { LatLng } from '@/lib/geo';

export interface PlaceLabel {
  /** Short, human label: "Connaught Place, New Delhi". */
  label: string;
  /** Longer address for sharing. */
  full?: string;
  countryCode?: string;
}

interface NominatimReverse {
  display_name?: string;
  address?: Record<string, string | undefined>;
  error?: string;
}

interface BigDataCloudReverse {
  locality?: string;
  city?: string;
  principalSubdivision?: string;
  countryCode?: string;
  countryName?: string;
}

const unique = (parts: (string | undefined)[]) =>
  parts.filter((p, i, arr): p is string => Boolean(p) && arr.indexOf(p) === i);

/** Nominatim (OSM) first for street-level detail; BigDataCloud's free client API as a fallback. */
export async function reverseGeocode(point: LatLng, signal?: AbortSignal, lang = 'en'): Promise<PlaceLabel> {
  try {
    const params = new URLSearchParams({
      format: 'jsonv2',
      lat: point.lat.toFixed(6),
      lon: point.lon.toFixed(6),
      zoom: '16',
      addressdetails: '1',
      'accept-language': lang,
    });
    const r = await fetchJson<NominatimReverse>(`${NOMINATIM_REVERSE}?${params}`, {
      signal,
      timeoutMs: 8_000,
      paceMs: 1_100, // Nominatim usage policy: max 1 request/second
    });
    if (r.error || !r.address) throw new Error(r.error ?? 'No address');
    const a = r.address;
    const local = a.road ?? a.neighbourhood ?? a.suburb ?? a.hamlet ?? a.quarter;
    const area = a.city ?? a.town ?? a.village ?? a.municipality ?? a.county ?? a.state_district ?? a.state;
    return {
      label:
        unique([local, area]).join(', ') ||
        r.display_name?.split(',').slice(0, 2).join(',') ||
        'Unknown area',
      full: r.display_name,
      countryCode: a.country_code?.toUpperCase(),
    };
  } catch (error) {
    if (isAbortError(error)) throw error;
    const params = new URLSearchParams({
      latitude: String(point.lat),
      longitude: String(point.lon),
      localityLanguage: lang,
    });
    const r = await fetchJson<BigDataCloudReverse>(`${BIGDATACLOUD_REVERSE}?${params}`, {
      signal,
      timeoutMs: 8_000,
    });
    return {
      label:
        unique([r.locality, r.city, r.principalSubdivision]).slice(0, 2).join(', ') ||
        r.countryName ||
        'Unknown area',
      countryCode: r.countryCode?.toUpperCase(),
    };
  }
}

export interface SearchResult {
  id: string;
  name: string;
  detail: string;
  lat: number;
  lon: number;
  countryCode?: string;
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: Record<string, string | number | undefined>;
}

const PHOTON_LANGS = new Set(['en', 'de', 'fr', 'it']);

export async function searchPlaces(
  query: string,
  { bias, signal, lang = 'en' }: { bias?: LatLng | null; signal?: AbortSignal; lang?: string } = {},
): Promise<SearchResult[]> {
  const params = new URLSearchParams({ q: query, limit: '6', lang: PHOTON_LANGS.has(lang) ? lang : 'en' });
  if (bias) {
    params.set('lat', bias.lat.toFixed(3));
    params.set('lon', bias.lon.toFixed(3));
  }
  const r = await fetchJson<{ features: PhotonFeature[] }>(`${PHOTON_SEARCH}?${params}`, {
    signal,
    timeoutMs: 8_000,
  });
  return r.features.map((f) => {
    const p = f.properties;
    const str = (k: string) => (typeof p[k] === 'string' ? (p[k] as string) : undefined);
    const street = unique([str('housenumber'), str('street')]).join(' ');
    return {
      id: `${str('osm_type') ?? 'X'}${p.osm_id ?? `${f.geometry.coordinates.join(',')}`}`,
      name: str('name') ?? (street || 'Unnamed place'),
      detail: unique([
        str('name') ? street : undefined,
        str('district'),
        str('city'),
        str('state'),
        str('country'),
      ]).join(', '),
      lon: f.geometry.coordinates[0],
      lat: f.geometry.coordinates[1],
      countryCode: str('countrycode')?.toUpperCase(),
    };
  });
}
