import { compassWord } from '@/lib/geo';

/** Subset of the OSRM step maneuver object we rely on. */
export interface Maneuver {
  type: string;
  modifier?: string;
  bearing_after?: number;
  exit?: number;
}

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
};

const onto = (road: string) => (road ? ` onto ${road}` : '');
const on = (road: string) => (road ? ` on ${road}` : '');

function turnPhrase(modifier: string | undefined): string {
  switch (modifier) {
    case 'uturn':
      return 'Make a U-turn';
    case 'straight':
      return 'Continue straight';
    case undefined:
      return 'Turn';
    default:
      return `Turn ${modifier}`;
  }
}

/**
 * Turns an OSRM maneuver into a short English instruction. OSRM ships structured maneuvers,
 * not text, so this mirrors the phrasing of the osrm-text-instructions project in ~60 lines.
 */
export function describeStep(m: Maneuver, road: string, rotaryName?: string): string {
  const mod = m.modifier;
  switch (m.type) {
    case 'depart':
      return `Head ${compassWord(m.bearing_after ?? 0)}${on(road)}`;
    case 'arrive':
      return mod === 'left' || mod === 'right'
        ? `Arrive — destination is on your ${mod}`
        : 'Arrive at destination';
    case 'turn':
      return `${turnPhrase(mod)}${onto(road)}`;
    case 'new name':
      return `Continue${onto(road)}`;
    case 'continue':
      return mod && mod !== 'straight' ? `Keep ${mod}${on(road)}` : `Continue${on(road)}`;
    case 'merge':
      return `Merge${mod ? ` ${mod.replace('slight ', '')}` : ''}${onto(road)}`;
    case 'on ramp':
      return `Take the ramp${mod ? ` on the ${mod.replace('slight ', '')}` : ''}${onto(road)}`;
    case 'off ramp':
      return `Take the exit${mod ? ` on the ${mod.replace('slight ', '')}` : ''}${onto(road)}`;
    case 'fork':
      return `Keep ${mod?.replace('slight ', '') ?? 'straight'} at the fork${onto(road)}`;
    case 'end of road':
      return `${turnPhrase(mod)} at the end of the road${onto(road)}`;
    case 'roundabout':
    case 'rotary': {
      const name = rotaryName ? ` (${rotaryName})` : '';
      return m.exit
        ? `At the roundabout${name}, take the ${ordinal(m.exit)} exit${onto(road)}`
        : `Enter the roundabout${name}`;
    }
    case 'roundabout turn':
      return `At the roundabout, ${turnPhrase(mod).toLowerCase()}${onto(road)}`;
    case 'exit roundabout':
    case 'exit rotary':
      return `Exit the roundabout${onto(road)}`;
    default:
      return `Continue${on(road)}`;
  }
}
