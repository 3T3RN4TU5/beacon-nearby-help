export type Units = 'metric' | 'imperial';

const METRES_PER_MILE = 1609.344;
const METRES_PER_FOOT = 0.3048;

export function formatDistance(metres: number, units: Units = 'metric'): string {
  if (!Number.isFinite(metres)) return '—';
  if (units === 'imperial') {
    const miles = metres / METRES_PER_MILE;
    if (miles < 0.1) return `${Math.round(metres / METRES_PER_FOOT / 10) * 10} ft`;
    return `${miles < 10 ? miles.toFixed(1) : Math.round(miles)} mi`;
  }
  if (metres < 1000) return `${Math.max(10, Math.round(metres / 10) * 10)} m`;
  const km = metres / 1000;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

/** Splits a distance into a big number and a unit, for display typography. */
export function distanceParts(metres: number, units: Units = 'metric'): { value: string; unit: string } {
  const [value = '—', unit = ''] = formatDistance(metres, units).split(' ');
  return { value, unit };
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return '—';
  const mins = Math.max(1, Math.round(seconds / 60));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')} min`;
}

export function durationParts(seconds: number): { value: string; unit: string } {
  if (!Number.isFinite(seconds)) return { value: '—', unit: '' };
  const mins = Math.max(1, Math.round(seconds / 60));
  if (mins < 60) return { value: String(mins), unit: 'min' };
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return { value: `${h}:${String(m).padStart(2, '0')}`, unit: 'h' };
}

export function formatTemperature(celsius: number, units: Units = 'metric'): string {
  if (!Number.isFinite(celsius)) return '—';
  return units === 'imperial' ? `${Math.round((celsius * 9) / 5 + 32)}°F` : `${Math.round(celsius)}°C`;
}

export function formatSpeed(kmh: number, units: Units = 'metric'): string {
  if (!Number.isFinite(kmh)) return '—';
  return units === 'imperial' ? `${Math.round(kmh / 1.609344)} mph` : `${Math.round(kmh)} km/h`;
}

export function formatVisibility(metres: number, units: Units = 'metric'): string {
  if (!Number.isFinite(metres)) return '—';
  if (metres >= 20_000) return units === 'imperial' ? '12+ mi' : '20+ km';
  return formatDistance(metres, units);
}

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto', style: 'short' });

export function formatRelativeTime(timestamp: number, now = Date.now()): string {
  const diff = Math.round((timestamp - now) / 1000);
  const abs = Math.abs(diff);
  if (abs < 45) return 'just now';
  if (abs < 3600) return relative.format(Math.round(diff / 60), 'minute');
  if (abs < 86_400) return relative.format(Math.round(diff / 3600), 'hour');
  return relative.format(Math.round(diff / 86_400), 'day');
}

export type UnitsPref = 'auto' | Units;

const IMPERIAL_COUNTRIES = new Set(['US', 'LR', 'MM']);

/** Locales whose users expect miles / Fahrenheit by default. */
export function defaultUnits(locale = typeof navigator === 'undefined' ? 'en' : navigator.language): Units {
  return /-(US|LR|MM)$/i.test(locale) ? 'imperial' : 'metric';
}

/**
 * Units follow the country the user is standing in (road signs there use them), falling back to the
 * locale. Many phones in metric countries ship with an en-US locale, so the country wins.
 */
export function unitsFor(pref: UnitsPref, countryCode?: string, locale?: string): Units {
  if (pref !== 'auto') return pref;
  if (countryCode) return IMPERIAL_COUNTRIES.has(countryCode.toUpperCase()) ? 'imperial' : 'metric';
  return defaultUnits(locale);
}

/** "16:05" or "4:05 PM" according to the user's locale, for a wall-clock "HH:MM" at the destination. */
export function formatWallClock(hhmm: string): string {
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  const d = new Date(2000, 0, 1, h, m);
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(d);
}
