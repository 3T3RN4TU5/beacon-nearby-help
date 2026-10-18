import { usePlaceLabel } from '@/data/queries';
import { unitsFor, type Units } from '@/lib/format';
import { useApp } from '@/store/app';

/** Effective display units: the user's explicit choice, else those of the country they are in. */
export function useUnits(): Units {
  const pref = useApp((s) => s.units);
  const anchor = useApp((s) => s.anchor);
  const { data } = usePlaceLabel(pref === 'auto' ? anchor : null);
  return unitsFor(pref, data?.countryCode);
}
