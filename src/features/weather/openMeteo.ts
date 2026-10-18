import { OPEN_METEO_AIR, OPEN_METEO_FORECAST } from '@/config/endpoints';
import { fetchJson } from '@/lib/http';
import type { LatLng } from '@/lib/geo';

const CURRENT = [
  'temperature_2m',
  'apparent_temperature',
  'relative_humidity_2m',
  'precipitation',
  'weather_code',
  'cloud_cover',
  'wind_speed_10m',
  'wind_gusts_10m',
  'wind_direction_10m',
  'visibility',
  'is_day',
  'uv_index',
] as const;

const HOURLY = [
  'temperature_2m',
  'apparent_temperature',
  'precipitation_probability',
  'precipitation',
  'weather_code',
  'visibility',
  'wind_speed_10m',
  'wind_gusts_10m',
  'uv_index',
  'is_day',
] as const;

const DAILY = ['sunrise', 'sunset', 'uv_index_max', 'temperature_2m_max', 'temperature_2m_min'] as const;

export interface CurrentWeather {
  time: number;
  temperature: number;
  feelsLike: number;
  humidity: number;
  precipitation: number;
  code: number;
  cloudCover: number;
  windSpeed: number;
  windGusts: number;
  windDirection: number;
  visibility: number;
  isDay: boolean;
  uvIndex: number;
}

export interface HourlyPoint {
  time: number;
  temperature: number;
  feelsLike: number;
  precipitationProbability: number;
  precipitation: number;
  code: number;
  visibility: number;
  windSpeed: number;
  windGusts: number;
  uvIndex: number;
  isDay: boolean;
}

export interface DailyPoint {
  time: number;
  sunrise: number;
  sunset: number;
  uvIndexMax: number;
  max: number;
  min: number;
}

export interface Forecast {
  timezone: string;
  utcOffsetSeconds: number;
  current: CurrentWeather;
  /** Hourly points from the current hour onwards (≈ 24–36 h). */
  hourly: HourlyPoint[];
  daily: DailyPoint[];
}

export interface AirQuality {
  usAqi: number | null;
  pm25: number | null;
  pm10: number | null;
}

type Columns<K extends string> = Record<K, (number | null)[]> & { time: number[] };

interface ForecastResponse {
  timezone: string;
  utc_offset_seconds: number;
  current: Record<(typeof CURRENT)[number], number> & { time: number };
  hourly: Columns<(typeof HOURLY)[number]>;
  daily: Columns<(typeof DAILY)[number]>;
}

const num = (v: number | null | undefined, fallback = NaN) => (typeof v === 'number' ? v : fallback);

export async function fetchForecast({ lat, lon }: LatLng, signal?: AbortSignal): Promise<Forecast> {
  const params = new URLSearchParams({
    latitude: lat.toFixed(3),
    longitude: lon.toFixed(3),
    timezone: 'auto',
    timeformat: 'unixtime',
    forecast_days: '2',
    current: CURRENT.join(','),
    hourly: HOURLY.join(','),
    daily: DAILY.join(','),
  });
  const r = await fetchJson<ForecastResponse>(`${OPEN_METEO_FORECAST}?${params}`, {
    signal,
    timeoutMs: 12_000,
  });
  const c = r.current;
  const currentHour = c.time - (c.time % 3600);

  const hourly: HourlyPoint[] = r.hourly.time
    .map((time, i) => ({
      time,
      temperature: num(r.hourly.temperature_2m[i]),
      feelsLike: num(r.hourly.apparent_temperature[i]),
      precipitationProbability: num(r.hourly.precipitation_probability[i], 0),
      precipitation: num(r.hourly.precipitation[i], 0),
      code: num(r.hourly.weather_code[i], 0),
      visibility: num(r.hourly.visibility[i]),
      windSpeed: num(r.hourly.wind_speed_10m[i], 0),
      windGusts: num(r.hourly.wind_gusts_10m[i], 0),
      uvIndex: num(r.hourly.uv_index[i], 0),
      isDay: r.hourly.is_day[i] === 1,
    }))
    .filter((h) => h.time >= currentHour);

  return {
    timezone: r.timezone,
    utcOffsetSeconds: r.utc_offset_seconds,
    current: {
      time: c.time,
      temperature: c.temperature_2m,
      feelsLike: c.apparent_temperature,
      humidity: c.relative_humidity_2m,
      precipitation: c.precipitation,
      code: c.weather_code,
      cloudCover: c.cloud_cover,
      windSpeed: c.wind_speed_10m,
      windGusts: c.wind_gusts_10m,
      windDirection: c.wind_direction_10m,
      visibility: c.visibility,
      isDay: c.is_day === 1,
      uvIndex: c.uv_index,
    },
    hourly,
    daily: r.daily.time.map((time, i) => ({
      time,
      sunrise: num(r.daily.sunrise[i]),
      sunset: num(r.daily.sunset[i]),
      uvIndexMax: num(r.daily.uv_index_max[i], 0),
      max: num(r.daily.temperature_2m_max[i]),
      min: num(r.daily.temperature_2m_min[i]),
    })),
  };
}

export async function fetchAirQuality({ lat, lon }: LatLng, signal?: AbortSignal): Promise<AirQuality> {
  const params = new URLSearchParams({
    latitude: lat.toFixed(3),
    longitude: lon.toFixed(3),
    timezone: 'auto',
    current: 'us_aqi,pm2_5,pm10',
  });
  const r = await fetchJson<{
    current?: { us_aqi?: number | null; pm2_5?: number | null; pm10?: number | null };
  }>(`${OPEN_METEO_AIR}?${params}`, { signal, timeoutMs: 12_000 });
  return { usAqi: r.current?.us_aqi ?? null, pm25: r.current?.pm2_5 ?? null, pm10: r.current?.pm10 ?? null };
}

/** "HH:MM" wall-clock time at the forecast location for a unix timestamp. */
export function localTimeAt(unixSeconds: number, utcOffsetSeconds: number): string {
  return new Date((unixSeconds + utcOffsetSeconds) * 1000).toISOString().slice(11, 16);
}
