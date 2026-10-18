/**
 * What Beacon searches for, expressed as OpenStreetMap tags.
 * Primary categories form the one-tap summary; secondary ones are useful extras for road trips.
 */

export const CATEGORY_IDS = ['hospital', 'police', 'pharmacy', 'fuel', 'fire', 'ev', 'repair'] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];

export interface TagMatcher {
  key: string;
  value: string;
  /** Human label for places matched by this tag, e.g. "Clinic". */
  subtype: string;
  /** Lower ranks are preferred for the summary card (a hospital beats a clinic). */
  rank: number;
}

export interface CategoryDef {
  id: CategoryId;
  label: string;
  plural: string;
  tier: 'primary' | 'secondary';
  /** Signage colour used on markers, chips and cards. */
  color: string;
  matchers: TagMatcher[];
  /** Furthest radius (m) the tiered search expands to before reporting "none nearby". */
  maxRadius: number;
  /** Fallback name when OSM has none. */
  unnamed: string;
}

export const CATEGORIES: Record<CategoryId, CategoryDef> = {
  hospital: {
    id: 'hospital',
    label: 'Hospital',
    plural: 'Hospitals',
    tier: 'primary',
    color: '#ff4d5e',
    matchers: [
      { key: 'amenity', value: 'hospital', subtype: 'Hospital', rank: 0 },
      { key: 'healthcare', value: 'hospital', subtype: 'Hospital', rank: 0 },
      { key: 'amenity', value: 'clinic', subtype: 'Clinic', rank: 1 },
      { key: 'healthcare', value: 'clinic', subtype: 'Clinic', rank: 1 },
    ],
    maxRadius: 50_000,
    unnamed: 'Unnamed hospital',
  },
  police: {
    id: 'police',
    label: 'Police',
    plural: 'Police stations',
    tier: 'primary',
    color: '#4f86ff',
    matchers: [{ key: 'amenity', value: 'police', subtype: 'Police station', rank: 0 }],
    maxRadius: 50_000,
    unnamed: 'Police station',
  },
  pharmacy: {
    id: 'pharmacy',
    label: 'Pharmacy',
    plural: 'Pharmacies',
    tier: 'primary',
    color: '#2ed47a',
    matchers: [
      { key: 'amenity', value: 'pharmacy', subtype: 'Pharmacy', rank: 0 },
      { key: 'healthcare', value: 'pharmacy', subtype: 'Pharmacy', rank: 0 },
    ],
    maxRadius: 50_000,
    unnamed: 'Pharmacy',
  },
  fuel: {
    id: 'fuel',
    label: 'Fuel',
    plural: 'Fuel stations',
    tier: 'primary',
    color: '#ffb224',
    matchers: [{ key: 'amenity', value: 'fuel', subtype: 'Fuel station', rank: 0 }],
    maxRadius: 50_000,
    unnamed: 'Fuel station',
  },
  fire: {
    id: 'fire',
    label: 'Fire station',
    plural: 'Fire stations',
    tier: 'secondary',
    color: '#ff7a30',
    matchers: [{ key: 'amenity', value: 'fire_station', subtype: 'Fire station', rank: 0 }],
    maxRadius: 25_000,
    unnamed: 'Fire station',
  },
  ev: {
    id: 'ev',
    label: 'EV charging',
    plural: 'EV chargers',
    tier: 'secondary',
    color: '#22d3ee',
    matchers: [{ key: 'amenity', value: 'charging_station', subtype: 'EV charger', rank: 0 }],
    maxRadius: 25_000,
    unnamed: 'EV charging point',
  },
  repair: {
    id: 'repair',
    label: 'Mechanic',
    plural: 'Mechanics & tyres',
    tier: 'secondary',
    color: '#b69cff',
    matchers: [
      { key: 'shop', value: 'motorcycle_repair', subtype: 'Motorbike repair', rank: 0 },
      { key: 'shop', value: 'car_repair', subtype: 'Car repair', rank: 0 },
      { key: 'shop', value: 'tyres', subtype: 'Tyres & puncture', rank: 0 },
    ],
    maxRadius: 15_000,
    unnamed: 'Repair shop',
  },
};

export const PRIMARY_CATEGORIES = CATEGORY_IDS.filter((id) => CATEGORIES[id].tier === 'primary');
export const SECONDARY_CATEGORIES = CATEGORY_IDS.filter((id) => CATEGORIES[id].tier === 'secondary');

/** Radii (m) tried in order; each pass only asks for categories still missing. */
export const SEARCH_TIERS = [3_000, 10_000, 25_000, 50_000] as const;
