import { useMemo } from 'react';
import { evaluateAlerts, rideConditions } from '@/features/weather/alerts';
import { useNow } from '@/hooks/useEnvironment';
import type { LatLng } from '@/lib/geo';
import { useAirQuality, useForecast } from './queries';
import { useUnits } from '@/hooks/useUnits';

/** Forecast + air quality folded into ranked road-weather alerts and a riding score. */
export function useRoadWeather(anchor: LatLng | null) {
  const units = useUnits();
  const forecast = useForecast(anchor);
  const air = useAirQuality(anchor);
  // Re-evaluated each minute so "sunset soon" and upcoming hazards roll forward with time.
  const now = useNow(60_000);
  const alerts = useMemo(
    () => (forecast.data ? evaluateAlerts(forecast.data, { air: air.data, units, now: now / 1000 }) : []),
    [forecast.data, air.data, units, now],
  );
  const ride = useMemo(() => rideConditions(alerts), [alerts]);
  return { forecast, air, alerts, ride };
}
