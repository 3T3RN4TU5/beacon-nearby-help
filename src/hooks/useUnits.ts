import { usePlaceLabel } from '@/data/queries';
import { guessCountryCode } from '@/features/emergency/numbers';
import { unitsFor, type Units } from '@/lib/format';
import { useApp } from '@/store/app';

// Many phones in metric countries report an en-US locale; the time zone is a better first guess.
const GUESSED_COUNTRY = guessCountryCode();

/** Effective display units: the user's explicit choice, else those of the country they are in. */
export function useUnits(): Units {
  const pref = useApp((s) => s.units);
  const anchor = useApp((s) => s.anchor);
  const { data } = usePlaceLabel(pref === 'auto' ? anchor : null);
  // Until reverse geocoding names the country, use the guess so units don't flip mid-load.
  return unitsFor(pref, data?.countryCode ?? GUESSED_COUNTRY);
}
