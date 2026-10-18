import { CATEGORIES, CATEGORY_IDS, type CategoryId, type TagMatcher } from '@/config/categories';
import { haversine, type LatLng } from '@/lib/geo';
import type { OverpassElement, Place } from './types';

interface Classification {
  category: CategoryId;
  matcher: TagMatcher;
}

/** First category (in CATEGORY_IDS priority order) whose tag matchers fit the element. */
export function classify(
  tags: Record<string, string>,
  among: readonly CategoryId[] = CATEGORY_IDS,
): Classification | null {
  for (const id of among) {
    for (const matcher of CATEGORIES[id].matchers) {
      if (tags[matcher.key] === matcher.value) return { category: id, matcher };
    }
  }
  return null;
}

const firstValue = (raw: string | undefined) =>
  raw
    ?.split(/[;,]/)
    .map((s) => s.trim())
    .find(Boolean);

export function pickPhone(tags: Record<string, string>): string | undefined {
  return firstValue(tags.phone ?? tags['contact:phone'] ?? tags['contact:mobile'] ?? tags.mobile);
}

export function pickWebsite(tags: Record<string, string>): string | undefined {
  const raw = firstValue(tags.website ?? tags['contact:website'] ?? tags.url);
  if (!raw) return undefined;
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

export function composeAddress(tags: Record<string, string>): string | undefined {
  if (tags['addr:full']) return tags['addr:full'];
  const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
  const parts = [
    street || tags['addr:place'],
    tags['addr:suburb'] ?? tags['addr:neighbourhood'],
    tags['addr:city'] ?? tags['addr:district'],
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : undefined;
}

const FUEL_LABELS: Record<string, string> = {
  diesel: 'Diesel',
  octane_91: 'Petrol',
  octane_92: 'Petrol',
  octane_95: 'Petrol',
  octane_98: 'Premium',
  octane_100: 'Premium',
  e10: 'E10',
  e20: 'E20',
  cng: 'CNG',
  lpg: 'LPG',
  adblue: 'AdBlue',
};

const SOCKET_LABELS: Record<string, string> = {
  type2: 'Type 2',
  type2_combo: 'CCS2',
  type1: 'Type 1',
  type1_combo: 'CCS1',
  chademo: 'CHAdeMO',
  tesla_supercharger: 'Tesla',
  gb_dc: 'GB/T DC',
  gb_ac: 'GB/T AC',
  schuko: 'Schuko',
  bs1363: '3-pin',
  as3112: 'Type I',
};

export function pickFeatures(category: CategoryId, tags: Record<string, string>): string[] | undefined {
  const out = new Set<string>();
  const yes = (v: string | undefined) => v !== undefined && v !== 'no' && v !== '0';
  if (category === 'fuel') {
    for (const [key, label] of Object.entries(FUEL_LABELS)) if (yes(tags[`fuel:${key}`])) out.add(label);
  } else if (category === 'ev') {
    for (const [key, value] of Object.entries(tags)) {
      const m = /^socket:([a-z0-9_]+)$/.exec(key);
      if (m && yes(value)) out.add(SOCKET_LABELS[m[1]!] ?? m[1]!);
    }
  }
  return out.size ? [...out] : undefined;
}

function displayName(tags: Record<string, string>, lang: string): string | undefined {
  return tags[`name:${lang}`] ?? tags.name ?? tags.brand ?? tags.operator;
}

export function toPlace(
  el: OverpassElement,
  origin: LatLng,
  lang = 'en',
  among?: readonly CategoryId[],
): Place | null {
  const tags = el.tags;
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (!tags || lat === undefined || lon === undefined) return null;

  const match = classify(tags, among);
  if (!match) return null;
  const { category, matcher } = match;
  const name = displayName(tags, lang);

  return {
    id: `${el.type}/${el.id}`,
    category,
    subtype: matcher.subtype,
    rank: matcher.rank,
    name: name ?? CATEGORIES[category].unnamed,
    hasName: Boolean(name),
    lat,
    lon,
    distance: haversine(origin, { lat, lon }),
    phone: pickPhone(tags),
    website: pickWebsite(tags),
    address: composeAddress(tags),
    openingHours: tags.opening_hours,
    emergency: category === 'hospital' ? tags.emergency === 'yes' : undefined,
    brand: tags.brand,
    operator: tags.operator,
    wheelchair: tags.wheelchair,
    features: pickFeatures(category, tags),
  };
}

const normalise = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

/**
 * OSM often maps one facility twice (a node for the entrance + a way for the building).
 * Keep the richer record when two places share a category and name and sit close together.
 */
export function dedupe(places: Place[]): Place[] {
  const richness = (p: Place) =>
    (p.hasName ? 4 : 0) +
    (p.phone ? 2 : 0) +
    (p.openingHours ? 2 : 0) +
    (p.address ? 1 : 0) +
    (p.website ? 1 : 0);
  const sorted = [...places].sort((a, b) => richness(b) - richness(a));
  const kept: Place[] = [];
  for (const p of sorted) {
    const key = normalise(p.name);
    const duplicate = kept.some((k) => {
      if (k.category !== p.category) return false;
      const d = haversine(k, p);
      return p.hasName && k.hasName ? normalise(k.name) === key && d < 150 : d < 25;
    });
    if (!duplicate) kept.push(p);
  }
  return kept.sort((a, b) => a.distance - b.distance);
}

export function parseElements(
  elements: OverpassElement[],
  origin: LatLng,
  lang = 'en',
  among?: readonly CategoryId[],
): Place[] {
  const places: Place[] = [];
  for (const el of elements) {
    const place = toPlace(el, origin, lang, among);
    if (place) places.push(place);
  }
  return dedupe(places);
}
