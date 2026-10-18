/** WMO weather interpretation codes as used by Open-Meteo. */

export type WeatherGlyph =
  'clear' | 'partly' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'freezing' | 'snow' | 'storm';

interface CodeInfo {
  label: string;
  glyph: WeatherGlyph;
}

const CODES: Record<number, CodeInfo> = {
  0: { label: 'Clear sky', glyph: 'clear' },
  1: { label: 'Mainly clear', glyph: 'clear' },
  2: { label: 'Partly cloudy', glyph: 'partly' },
  3: { label: 'Overcast', glyph: 'cloudy' },
  45: { label: 'Fog', glyph: 'fog' },
  48: { label: 'Freezing fog', glyph: 'fog' },
  51: { label: 'Light drizzle', glyph: 'drizzle' },
  53: { label: 'Drizzle', glyph: 'drizzle' },
  55: { label: 'Dense drizzle', glyph: 'drizzle' },
  56: { label: 'Freezing drizzle', glyph: 'freezing' },
  57: { label: 'Heavy freezing drizzle', glyph: 'freezing' },
  61: { label: 'Light rain', glyph: 'rain' },
  63: { label: 'Rain', glyph: 'rain' },
  65: { label: 'Heavy rain', glyph: 'rain' },
  66: { label: 'Freezing rain', glyph: 'freezing' },
  67: { label: 'Heavy freezing rain', glyph: 'freezing' },
  71: { label: 'Light snow', glyph: 'snow' },
  73: { label: 'Snow', glyph: 'snow' },
  75: { label: 'Heavy snow', glyph: 'snow' },
  77: { label: 'Snow grains', glyph: 'snow' },
  80: { label: 'Light showers', glyph: 'rain' },
  81: { label: 'Showers', glyph: 'rain' },
  82: { label: 'Violent showers', glyph: 'rain' },
  85: { label: 'Snow showers', glyph: 'snow' },
  86: { label: 'Heavy snow showers', glyph: 'snow' },
  95: { label: 'Thunderstorm', glyph: 'storm' },
  96: { label: 'Thunderstorm, hail', glyph: 'storm' },
  99: { label: 'Severe thunderstorm, hail', glyph: 'storm' },
};

export function describeWeatherCode(code: number): CodeInfo {
  return CODES[code] ?? { label: 'Unknown', glyph: 'cloudy' };
}

export const isThunderstorm = (code: number) => code >= 95;
export const hasHail = (code: number) => code === 96 || code === 99;
export const isFreezingPrecip = (code: number) => [56, 57, 66, 67].includes(code);
export const isSnow = (code: number) => (code >= 71 && code <= 77) || code === 85 || code === 86;
export const isFogCode = (code: number) => code === 45 || code === 48;

/** Rough rain intensity implied by the code alone (mm/h), used alongside measured precipitation. */
export function impliedRainRate(code: number): number {
  if (code === 65 || code === 82) return 8;
  if (code === 63 || code === 81) return 3;
  if (code === 61 || code === 80 || (code >= 51 && code <= 55)) return 0.6;
  return 0;
}
