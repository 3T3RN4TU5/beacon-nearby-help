import type { CategoryId } from '@/config/categories';

export interface Place {
  /** "node/123", "way/456" — unique across OSM. */
  id: string;
  category: CategoryId;
  subtype: string;
  /** From the matching tag; 0 = canonical (hospital), higher = fallback (clinic). */
  rank: number;
  name: string;
  hasName: boolean;
  lat: number;
  lon: number;
  /** Straight-line metres from the search origin. */
  distance: number;
  phone?: string;
  website?: string;
  address?: string;
  openingHours?: string;
  /** Hospital has an emergency department (emergency=yes). */
  emergency?: boolean;
  brand?: string;
  operator?: string;
  wheelchair?: string;
  /** Fuel grades or EV socket types, already humanised. */
  features?: string[];
}

export interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export interface OverpassResponse {
  elements: OverpassElement[];
  remark?: string;
}

export interface PlacesResult {
  places: Place[];
  /** Largest radius searched per category, so the UI can say "none within 25 km". */
  searchedRadius: Partial<Record<CategoryId, number>>;
  fetchedAt: number;
}
