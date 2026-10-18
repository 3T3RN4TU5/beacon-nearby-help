import { useMemo } from 'react';
import { useForecast } from '@/data/queries';
import { evaluateOpeningHours, localClock, type OpeningStatus } from '@/features/places/openingHours';
import { useApp } from '@/store/app';
import { useNow } from './useEnvironment';

/** Opening status evaluated in the place's own time zone (from the forecast's UTC offset). */
export function useOpeningStatus(spec: string | undefined): OpeningStatus {
  const anchor = useApp((s) => s.anchor);
  const { data } = useForecast(anchor);
  const now = useNow(60_000);
  const offset = data?.utcOffsetSeconds;
  return useMemo(() => evaluateOpeningHours(spec, localClock(offset, new Date(now))), [spec, offset, now]);
}
