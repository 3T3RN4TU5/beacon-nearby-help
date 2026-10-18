import { evaluateAlerts, rideConditions } from './alerts';
import type { CurrentWeather, Forecast, HourlyPoint } from './openMeteo';

const NOW = 1_792_323_600; // on the hour
const H = 3600;

const calmCurrent: CurrentWeather = {
  time: NOW,
  temperature: 24,
  feelsLike: 24,
  humidity: 55,
  precipitation: 0,
  code: 1,
  cloudCover: 10,
  windSpeed: 8,
  windGusts: 15,
  windDirection: 270,
  visibility: 20_000,
  isDay: true,
  uvIndex: 4,
};

const hour = (offsetH: number, patch: Partial<HourlyPoint> = {}): HourlyPoint => ({
  time: NOW + offsetH * H,
  temperature: 24,
  feelsLike: 24,
  precipitationProbability: 0,
  precipitation: 0,
  code: 1,
  visibility: 20_000,
  windSpeed: 8,
  windGusts: 15,
  uvIndex: 4,
  isDay: true,
  ...patch,
});

function forecast(
  current: Partial<CurrentWeather> = {},
  hourly: HourlyPoint[] = [],
  sunset = NOW + 6 * H,
): Forecast {
  return {
    timezone: 'UTC',
    utcOffsetSeconds: 0,
    current: { ...calmCurrent, ...current },
    hourly: hourly.length ? hourly : [1, 2, 3, 4, 5, 6].map((h) => hour(h)),
    daily: [{ time: NOW - 12 * H, sunrise: NOW - 6 * H, sunset, uvIndexMax: 6, max: 28, min: 18 }],
  };
}

describe('evaluateAlerts', () => {
  it('stays quiet on a calm day', () => {
    expect(evaluateAlerts(forecast())).toEqual([]);
  });

  it('ranks an active thunderstorm as danger and suppresses the duplicate rain alert', () => {
    const alerts = evaluateAlerts(forecast({ code: 95, precipitation: 9 }));
    expect(alerts[0]).toMatchObject({ kind: 'storm', severity: 'danger', startsAt: null });
    expect(alerts.find((a) => a.kind === 'rain')).toBeUndefined();
  });

  it('warns about an upcoming storm with its onset time', () => {
    const alerts = evaluateAlerts(forecast({}, [hour(1), hour(2), hour(3, { code: 96 })]));
    expect(alerts[0]).toMatchObject({
      kind: 'storm',
      severity: 'warning',
      title: 'Thunderstorm with hail',
      startsAt: NOW + 3 * H,
    });
  });

  it('ignores low-confidence forecast rain', () => {
    const unlikely = evaluateAlerts(
      forecast({}, [hour(1, { precipitation: 10, precipitationProbability: 20 })]),
    );
    expect(unlikely.find((a) => a.kind === 'rain')).toBeUndefined();
    const likely = evaluateAlerts(
      forecast({}, [hour(1, { precipitation: 10, precipitationProbability: 80 })]),
    );
    expect(likely.find((a) => a.kind === 'rain')).toMatchObject({ severity: 'warning', title: 'Heavy rain' });
  });

  it('grades fog by visibility', () => {
    expect(evaluateAlerts(forecast({ visibility: 150, code: 45 }))[0]).toMatchObject({
      kind: 'fog',
      severity: 'danger',
      metric: 'Visibility 150 m',
    });
    expect(evaluateAlerts(forecast({ visibility: 800 }))[0]).toMatchObject({
      kind: 'fog',
      severity: 'advisory',
    });
  });

  it('targets moderate gusts at riders and strong gusts at everyone', () => {
    expect(evaluateAlerts(forecast({ windGusts: 50 }))[0]).toMatchObject({
      kind: 'wind',
      audience: ['riders'],
    });
    expect(evaluateAlerts(forecast({ windGusts: 70 }), { units: 'imperial' })[0]).toMatchObject({
      kind: 'wind',
      severity: 'warning',
      audience: ['everyone'],
      metric: 'Gusts 43 mph',
    });
  });

  it('flags heat, cold and black ice', () => {
    expect(evaluateAlerts(forecast({ feelsLike: 43, temperature: 39 }))[0]).toMatchObject({
      kind: 'heat',
      severity: 'warning',
    });
    const icy = evaluateAlerts(forecast({ feelsLike: -3, temperature: 1, humidity: 95 }));
    expect(icy.map((a) => a.kind)).toEqual(expect.arrayContaining(['ice', 'cold']));
  });

  it('reports darkness and approaching sunset for riders', () => {
    expect(evaluateAlerts(forecast({ isDay: false, uvIndex: 0 }))[0]).toMatchObject({
      kind: 'dark',
      severity: 'info',
    });
    const dusk = evaluateAlerts(forecast({}, [], NOW + 40 * 60));
    expect(dusk[0]).toMatchObject({ kind: 'dark', severity: 'advisory', startsAt: NOW + 40 * 60 });
    expect(dusk[0]?.metric).toContain('40 min');
  });

  it('includes unhealthy air quality', () => {
    const alerts = evaluateAlerts(forecast(), { air: { usAqi: 152, pm25: 37, pm10: 135 } });
    expect(alerts[0]).toMatchObject({ kind: 'air', severity: 'advisory', metric: 'US AQI 152' });
    expect(evaluateAlerts(forecast(), { air: { usAqi: 90, pm25: 20, pm10: 40 } })).toEqual([]);
  });

  it('sorts by severity, then by onset', () => {
    const alerts = evaluateAlerts(forecast({ windGusts: 50, visibility: 300 }, [hour(2, { code: 95 })]));
    expect(alerts.map((a) => a.severity)).toEqual(['warning', 'warning', 'advisory']);
    expect(alerts[0]?.kind).toBe('fog'); // happening now beats a storm in two hours
  });
});

describe('rideConditions', () => {
  it('scores transparently from the alert list', () => {
    expect(rideConditions([])).toEqual({ score: 100, label: 'Good' });
    const alerts = evaluateAlerts(forecast({ code: 95 }));
    expect(rideConditions(alerts)).toMatchObject({ score: 40, label: 'Caution' });
  });
});
