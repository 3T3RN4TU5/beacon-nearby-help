import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CategoryId } from '@/config/categories';
import type { TravelMode } from '@/config/endpoints';
import type { GeoErrorKind } from '@/features/location/geolocate';
import type { UnitsPref } from '@/lib/format';
import { haversine, type LatLng } from '@/lib/geo';

export type Phase = 'landing' | 'locating' | 'active';
export type Panel = 'nearby' | 'weather' | 'sos';
export type ThemePref = 'system' | 'dark' | 'light';
export type SheetSnap = 'peek' | 'half' | 'full';

export interface Origin extends LatLng {
  source: 'gps' | 'search';
  accuracy?: number;
  heading?: number | null;
  /** Label from a search result; GPS origins get theirs from reverse geocoding. */
  label?: string;
  at: number;
}

export type View =
  | { kind: 'overview' }
  | { kind: 'category'; category: CategoryId }
  | { kind: 'place'; placeId: string; from?: CategoryId };

export interface MedicalInfo {
  name: string;
  bloodGroup: string;
  allergies: string;
  conditions: string;
  medications: string;
  notes: string;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
}

const EMPTY_MEDICAL: MedicalInfo = {
  name: '',
  bloodGroup: '',
  allergies: '',
  conditions: '',
  medications: '',
  notes: '',
};

/** Re-run searches only after moving this far, so live tracking doesn't hammer free APIs. */
const ANCHOR_SHIFT_M = 800;

interface AppState {
  phase: Phase;
  /** Live position of the user's dot. */
  origin: Origin | null;
  /** Centre the searches, routes and weather are computed for; trails `origin` by up to 800 m. */
  anchor: Origin | null;
  lastOrigin: Origin | null;
  geoError: GeoErrorKind | null;
  tracking: boolean;
  panel: Panel;
  view: View;
  mode: TravelMode;
  sheet: SheetSnap;
  theme: ThemePref;
  /** 'auto' follows the country the user is in; resolve with useUnits(). */
  units: UnitsPref;
  medical: MedicalInfo;
  contacts: Contact[];

  startLocating: () => void;
  cancelLocating: () => void;
  failLocating: (kind: GeoErrorKind) => void;
  setOrigin: (origin: Origin) => void;
  updateFix: (fix: Pick<Origin, 'lat' | 'lon' | 'accuracy' | 'heading'>) => void;
  setTracking: (on: boolean) => void;
  goHome: () => void;

  setPanel: (panel: Panel) => void;
  openCategory: (category: CategoryId) => void;
  openPlace: (placeId: string, from?: CategoryId) => void;
  back: () => void;
  setMode: (mode: TravelMode) => void;
  setSheet: (snap: SheetSnap) => void;

  setTheme: (theme: ThemePref) => void;
  setUnits: (units: UnitsPref) => void;
  setMedical: (medical: MedicalInfo) => void;
  addContact: (contact: Omit<Contact, 'id'>) => void;
  removeContact: (id: string) => void;
  clearLocalData: () => void;
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      phase: 'landing',
      origin: null,
      anchor: null,
      lastOrigin: null,
      geoError: null,
      tracking: false,
      panel: 'nearby',
      view: { kind: 'overview' },
      mode: 'driving',
      sheet: 'half',
      theme: 'system',
      units: 'auto',
      medical: EMPTY_MEDICAL,
      contacts: [],

      startLocating: () => set({ phase: get().origin ? 'active' : 'locating', geoError: null }),
      cancelLocating: () => set((s) => ({ phase: s.origin ? 'active' : 'landing' })),
      failLocating: (kind) => set((s) => ({ phase: s.origin ? 'active' : 'landing', geoError: kind })),
      setOrigin: (origin) =>
        set({
          origin,
          anchor: origin,
          lastOrigin: origin,
          phase: 'active',
          geoError: null,
          view: { kind: 'overview' },
          sheet: 'half',
        }),
      updateFix: (fix) =>
        set((s) => {
          if (!s.origin) return {};
          const origin: Origin = { ...s.origin, ...fix, source: 'gps', label: undefined, at: Date.now() };
          const moved = !s.anchor || haversine(s.anchor, origin) > ANCHOR_SHIFT_M;
          return moved ? { origin, anchor: origin, lastOrigin: origin } : { origin };
        }),
      setTracking: (tracking) => set({ tracking }),
      goHome: () =>
        set({
          phase: 'landing',
          origin: null,
          anchor: null,
          tracking: false,
          view: { kind: 'overview' },
          panel: 'nearby',
        }),

      setPanel: (panel) => set({ panel }),
      openCategory: (category) => set({ panel: 'nearby', view: { kind: 'category', category } }),
      openPlace: (placeId, from) => set({ panel: 'nearby', view: { kind: 'place', placeId, from } }),
      back: () =>
        set((s) => {
          if (s.view.kind === 'place' && s.view.from)
            return { view: { kind: 'category', category: s.view.from } };
          return { view: { kind: 'overview' } };
        }),
      setMode: (mode) => set({ mode }),
      setSheet: (sheet) => set({ sheet }),

      setTheme: (theme) => set({ theme }),
      setUnits: (units) => set({ units }),
      setMedical: (medical) => set({ medical }),
      addContact: (contact) =>
        set((s) => ({ contacts: [...s.contacts, { ...contact, id: crypto.randomUUID() }].slice(0, 5) })),
      removeContact: (id) => set((s) => ({ contacts: s.contacts.filter((c) => c.id !== id) })),
      clearLocalData: () =>
        set({
          lastOrigin: null,
          medical: EMPTY_MEDICAL,
          contacts: [],
          origin: null,
          anchor: null,
          phase: 'landing',
          tracking: false,
        }),
    }),
    {
      name: 'beacon-prefs',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      // v1 stored locale-derived units; v2 defaults to following the user's country.
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as Record<string, unknown>;
        return (version < 2 ? { ...state, units: 'auto' } : state) as unknown as AppState;
      },
      // Only durable preferences and the user's own safety info; never transient UI state.
      partialize: (s) => ({
        theme: s.theme,
        units: s.units,
        mode: s.mode,
        medical: s.medical,
        contacts: s.contacts,
        lastOrigin: s.lastOrigin,
      }),
    },
  ),
);

/** Live status line for the tiered place search ("Scanning 10 km…"). Not persisted. */
export const useSearchStatus = create<{ radius: number | null; set: (radius: number | null) => void }>(
  (set) => ({
    radius: null,
    set: (radius) => set({ radius }),
  }),
);
