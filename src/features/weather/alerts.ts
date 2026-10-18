/**
 * Road-weather rules engine: turns a raw forecast into a short, ranked list of alerts for
 * people on the move. Pure and deterministic so it is fully unit-tested — no AI, just
 * thresholds drawn from common meteorological and road-safety guidance.
 */
import { formatSpeed, formatTemperature, formatVisibility, formatWallClock, type Units } from '@/lib/format';
import type { AirQuality, Forecast } from './openMeteo';
import { localTimeAt } from './openMeteo';
import {
  hasHail,
  impliedRainRate,
  isFogCode,
  isFreezingPrecip,
  isSnow,
  isThunderstorm,
} from './weatherCodes';

export type Severity = 'info' | 'advisory' | 'warning' | 'danger';
export type Audience = 'everyone' | 'riders' | 'drivers';
export type AlertKind =
  'storm' | 'ice' | 'snow' | 'rain' | 'fog' | 'wind' | 'heat' | 'cold' | 'uv' | 'dark' | 'air';

export const SEVERITY_RANK: Record<Severity, number> = { info: 0, advisory: 1, warning: 2, danger: 3 };

export interface WeatherAlert {
  kind: AlertKind;
  severity: Severity;
  audience: Audience[];
  title: string;
  /** The measured value that triggered the alert, already formatted ("Gusts 52 km/h"). */
  metric?: string;
  advice: string;
  /** Unix seconds when it starts; null when it is happening now. */
  startsAt: number | null;
}

export interface RideConditions {
  score: number;
  label: 'Good' | 'Fair' | 'Caution' | 'Poor';
}

interface Sample {
  at: number | null;
  code: number;
  rain: number;
  visibility: number;
  gusts: number;
  feelsLike: number;
  temperature: number;
  uv: number;
  humidity: number;
}

interface Grade {
  severity: Severity;
  value?: number;
}

export interface AlertOptions {
  air?: AirQuality | null;
  /** Unix seconds; defaults to the forecast's current observation time. */
  now?: number;
  units?: Units;
  lookaheadHours?: number;
}

export function evaluateAlerts(forecast: Forecast, options: AlertOptions = {}): WeatherAlert[] {
  const { current, utcOffsetSeconds } = forecast;
  const { air, units = 'metric', lookaheadHours = 6 } = options;
  const now = options.now ?? current.time;
  const clock = (unix: number) => formatWallClock(localTimeAt(unix, utcOffsetSeconds));

  const samples: Sample[] = [
    {
      at: null,
      code: current.code,
      rain: current.precipitation,
      visibility: current.visibility,
      gusts: current.windGusts,
      feelsLike: current.feelsLike,
      temperature: current.temperature,
      uv: current.isDay ? current.uvIndex : 0,
      humidity: current.humidity,
    },
    ...forecast.hourly
      .filter((h) => h.time > now && h.time <= now + lookaheadHours * 3600)
      .map((h) => ({
        at: h.time,
        code: h.code,
        // Only count forecast rain the model is reasonably confident about.
        rain: h.precipitationProbability >= 40 ? h.precipitation : 0,
        visibility: h.visibility,
        gusts: h.windGusts,
        feelsLike: h.feelsLike,
        temperature: h.temperature,
        uv: h.isDay ? h.uvIndex : 0,
        humidity: current.humidity,
      })),
  ];

  /** Worst grade across now + lookahead; ties resolve to the earliest sample. */
  const peak = (grade: (s: Sample) => Grade | null) => {
    let best: (Grade & { at: number | null }) | null = null;
    for (const s of samples) {
      const g = grade(s);
      if (g && (!best || SEVERITY_RANK[g.severity] > SEVERITY_RANK[best.severity])) best = { ...g, at: s.at };
    }
    return best;
  };

  const alerts: WeatherAlert[] = [];
  const push = (alert: WeatherAlert) => alerts.push(alert);

  // Thunderstorms
  const storm = peak((s) =>
    isThunderstorm(s.code) ? { severity: s.at === null ? 'danger' : 'warning', value: s.code } : null,
  );
  if (storm) {
    push({
      kind: 'storm',
      severity: storm.severity,
      audience: ['everyone'],
      title: hasHail(storm.value ?? 0) ? 'Thunderstorm with hail' : 'Thunderstorm',
      advice:
        'Lightning and sudden gusts. Riders: stop and shelter inside a building — not under trees or flyovers. Drivers: slow down and stay in the vehicle.',
      startsAt: storm.at,
    });
  }

  // Ice: freezing precipitation, or near-freezing air with moisture
  const ice = peak((s) => {
    if (isFreezingPrecip(s.code)) return { severity: 'danger' };
    if (s.temperature <= 2 && (s.rain > 0 || s.humidity >= 90 || isSnow(s.code)))
      return { severity: 'warning', value: s.temperature };
    return null;
  });
  if (ice) {
    push({
      kind: 'ice',
      severity: ice.severity,
      audience: ['riders', 'drivers'],
      title: ice.severity === 'danger' ? 'Freezing rain — icy roads' : 'Black ice possible',
      metric: ice.value !== undefined ? `Air ${formatTemperature(ice.value, units)}` : undefined,
      advice:
        'Bridges and shaded bends freeze first. Riders should avoid travel; drivers brake gently and double the gap.',
      startsAt: ice.at,
    });
  }

  // Snow
  const snow = peak((s) => (isSnow(s.code) ? { severity: 'warning' } : null));
  if (snow) {
    push({
      kind: 'snow',
      severity: snow.severity,
      audience: ['riders', 'drivers'],
      title: 'Snowfall',
      advice:
        'Grip and visibility drop fast. Riders should avoid travel; drivers use low gears and keep long gaps.',
      startsAt: snow.at,
    });
  }

  // Rain (skipped when a thunderstorm already covers it)
  if (!storm) {
    const rain = peak((s) => {
      const rate = Math.max(s.rain, impliedRainRate(s.code));
      if (rate >= 7.6) return { severity: 'warning', value: rate };
      if (rate >= 2.5) return { severity: 'advisory', value: rate };
      if (rate >= 0.5) return { severity: 'info', value: rate };
      return null;
    });
    if (rain) {
      const label =
        rain.severity === 'warning' ? 'Heavy rain' : rain.severity === 'advisory' ? 'Rain' : 'Light rain';
      push({
        kind: 'rain',
        severity: rain.severity,
        audience: rain.severity === 'info' ? ['riders'] : ['riders', 'drivers'],
        title: label,
        metric: rain.value !== undefined ? `${rain.value.toFixed(1)} mm/h` : undefined,
        advice:
          'Braking distances grow on wet roads and underpasses can flood. Riders: avoid painted lines and metal covers, and brake upright.',
        startsAt: rain.at,
      });
    }
  }

  // Fog / visibility
  const fog = peak((s) => {
    const v = s.visibility;
    if (v < 200) return { severity: 'danger', value: v };
    if (v < 500) return { severity: 'warning', value: v };
    if (v < 1000) return { severity: 'advisory', value: v };
    if (isFogCode(s.code)) return { severity: 'advisory', value: v };
    return null;
  });
  if (fog) {
    push({
      kind: 'fog',
      severity: fog.severity,
      audience: ['riders', 'drivers'],
      title: fog.severity === 'danger' ? 'Dense fog' : fog.severity === 'warning' ? 'Fog' : 'Poor visibility',
      metric:
        fog.value !== undefined && Number.isFinite(fog.value)
          ? `Visibility ${formatVisibility(fog.value, units)}`
          : undefined,
      advice:
        'Use low beams and fog lamps — high beams reflect back. Slow down and keep at least a 4-second gap.',
      startsAt: fog.at,
    });
  }

  // Wind gusts
  const wind = peak((s) => {
    if (s.gusts >= 90) return { severity: 'danger', value: s.gusts };
    if (s.gusts >= 65) return { severity: 'warning', value: s.gusts };
    if (s.gusts >= 45) return { severity: 'advisory', value: s.gusts };
    return null;
  });
  if (wind) {
    push({
      kind: 'wind',
      severity: wind.severity,
      audience: wind.severity === 'advisory' ? ['riders'] : ['everyone'],
      title: wind.severity === 'danger' ? 'Damaging gusts' : 'Strong crosswinds',
      metric: `Gusts ${formatSpeed(wind.value ?? 0, units)}`,
      advice:
        'Expect sudden pushes on bridges, flyovers and open highways. Riders: relax your grip, lean into gusts and give trucks extra room.',
      startsAt: wind.at,
    });
  }

  // Heat
  const heat = peak((s) => {
    if (s.feelsLike >= 46) return { severity: 'danger', value: s.feelsLike };
    if (s.feelsLike >= 41) return { severity: 'warning', value: s.feelsLike };
    if (s.feelsLike >= 35) return { severity: 'advisory', value: s.feelsLike };
    return null;
  });
  if (heat) {
    push({
      kind: 'heat',
      severity: heat.severity,
      audience: heat.severity === 'advisory' ? ['riders'] : ['everyone'],
      title:
        heat.severity === 'danger'
          ? 'Extreme heat'
          : heat.severity === 'warning'
            ? 'Heat stress'
            : 'Hot riding conditions',
      metric: `Feels like ${formatTemperature(heat.value ?? 0, units)}`,
      advice:
        'Drink water before you set off, wear ventilated gear and take shade breaks. Never leave children or pets in a parked car.',
      startsAt: heat.at,
    });
  }

  // Cold
  const cold = peak((s) => {
    if (s.feelsLike <= -10) return { severity: 'warning', value: s.feelsLike };
    if (s.feelsLike <= 0) return { severity: 'advisory', value: s.feelsLike };
    return null;
  });
  if (cold) {
    push({
      kind: 'cold',
      severity: cold.severity,
      audience: ['riders'],
      title: cold.severity === 'warning' ? 'Severe cold' : 'Freezing temperatures',
      metric: `Feels like ${formatTemperature(cold.value ?? 0, units)}`,
      advice:
        'Wind chill at riding speed is far lower than this. Layer up, cover your neck and fingers, and stop to warm up.',
      startsAt: cold.at,
    });
  }

  // UV
  const uv = peak((s) => {
    if (s.uv >= 11) return { severity: 'warning', value: s.uv };
    if (s.uv >= 8) return { severity: 'advisory', value: s.uv };
    return null;
  });
  if (uv) {
    push({
      kind: 'uv',
      severity: uv.severity,
      audience: ['riders'],
      title: uv.severity === 'warning' ? 'Extreme UV' : 'Very high UV',
      metric: `UV index ${Math.round(uv.value ?? 0)}`,
      advice: 'Cover exposed skin, use a tinted visor or sunglasses and reapply sunscreen at stops.',
      startsAt: uv.at,
    });
  }

  // Daylight
  const nextSunrise = forecast.daily.map((d) => d.sunrise).find((t) => t > now);
  const nextSunset = forecast.daily.map((d) => d.sunset).find((t) => t > now);
  if (!current.isDay) {
    push({
      kind: 'dark',
      severity: 'info',
      audience: ['riders'],
      title: 'Riding after dark',
      metric: nextSunrise ? `Sunrise ${clock(nextSunrise)}` : undefined,
      advice:
        'Wear reflective gear, keep lights on and assume drivers cannot see you. Watch for unlit potholes and animals.',
      startsAt: null,
    });
  } else if (nextSunset && nextSunset - now <= 3600) {
    const minutes = Math.max(1, Math.round((nextSunset - now) / 60));
    push({
      kind: 'dark',
      severity: 'advisory',
      audience: ['riders'],
      title: 'Sunset soon',
      metric: `Sunset ${clock(nextSunset)} · ${minutes} min of light`,
      advice: 'Plan to reach your stop before dark, clean your visor and switch on lights early.',
      startsAt: nextSunset,
    });
  }

  // Air quality
  const aqi = air?.usAqi;
  if (typeof aqi === 'number' && aqi >= 151) {
    const severity: Severity = aqi >= 301 ? 'danger' : aqi >= 201 ? 'warning' : 'advisory';
    push({
      kind: 'air',
      severity,
      audience: ['everyone'],
      title:
        severity === 'danger'
          ? 'Hazardous air'
          : severity === 'warning'
            ? 'Very unhealthy air'
            : 'Unhealthy air',
      metric: `US AQI ${Math.round(aqi)}`,
      advice:
        'Riders: wear an N95 mask under the helmet. Drivers: keep windows up and recirculate cabin air.',
      startsAt: null,
    });
  }

  return alerts.sort(
    (a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || (a.startsAt ?? 0) - (b.startsAt ?? 0),
  );
}

const RIDE_PENALTY: Record<Severity, number> = { danger: 60, warning: 35, advisory: 15, info: 5 };

/** A transparent 0–100 riding-conditions score: start at 100, subtract per alert that affects riders. */
export function rideConditions(alerts: WeatherAlert[]): RideConditions {
  const score = Math.max(
    0,
    alerts
      .filter((a) => a.audience.includes('riders') || a.audience.includes('everyone'))
      .reduce((s, a) => s - RIDE_PENALTY[a.severity], 100),
  );
  const label = score >= 80 ? 'Good' : score >= 55 ? 'Fair' : score >= 30 ? 'Caution' : 'Poor';
  return { score, label };
}
