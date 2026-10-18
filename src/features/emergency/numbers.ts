/**
 * Emergency numbers by ISO country code. Curated from national government sources; the UI always
 * reminds people to verify locally. 112 is the fallback because GSM phones route it to the local
 * emergency service in most of the world, even without a SIM in many countries.
 */

export type LineKind =
  'general' | 'police' | 'ambulance' | 'fire' | 'women' | 'road' | 'crisis' | 'tourist' | 'other';

export interface EmergencyLine {
  number: string;
  label: string;
  kind: LineKind;
}

const g = (number: string, label = 'Emergency'): EmergencyLine => ({ number, label, kind: 'general' });
const p = (number: string, label = 'Police'): EmergencyLine => ({ number, label, kind: 'police' });
const a = (number: string, label = 'Ambulance'): EmergencyLine => ({ number, label, kind: 'ambulance' });
const f = (number: string, label = 'Fire'): EmergencyLine => ({ number, label, kind: 'fire' });

const TABLE: Record<string, EmergencyLine[]> = {
  IN: [
    g('112', 'All emergencies'),
    p('100'),
    a('108'),
    f('101'),
    a('102', 'Ambulance (maternity & child)'),
    { number: '1091', label: 'Women helpline', kind: 'women' },
    { number: '1033', label: 'Highway helpline (NHAI)', kind: 'road' },
  ],
  US: [g('911'), { number: '988', label: 'Suicide & crisis line', kind: 'crisis' }],
  CA: [g('911'), { number: '988', label: 'Suicide & crisis line', kind: 'crisis' }],
  GB: [
    g('999'),
    g('112', 'Emergency (alt.)'),
    { number: '111', label: 'NHS non-emergency', kind: 'other' },
    p('101', 'Police non-emergency'),
  ],
  IE: [g('112'), g('999', 'Emergency (alt.)')],
  AU: [g('000'), g('112', 'Emergency from mobile'), p('131444', 'Police assistance')],
  NZ: [g('111')],
  DE: [g('112', 'Fire & ambulance'), p('110')],
  FR: [g('112'), a('15', 'Medical (SAMU)'), p('17'), f('18')],
  ES: [g('112'), p('091', 'National police')],
  IT: [g('112'), p('113'), a('118'), f('115')],
  AT: [g('112'), p('133'), a('144'), f('122')],
  CH: [g('112'), p('117'), a('144'), f('118')],
  NO: [p('112'), a('113'), f('110')],
  PL: [g('112'), p('997'), a('999'), f('998')],
  GR: [g('112'), p('100'), a('166'), f('199')],
  RU: [g('112'), p('102'), a('103'), f('101')],
  TR: [g('112')],
  IL: [p('100'), a('101', 'Ambulance (MDA)'), f('102')],
  JP: [p('110'), a('119', 'Fire & ambulance')],
  CN: [p('110'), a('120'), f('119'), { number: '122', label: 'Traffic accidents', kind: 'road' }],
  KR: [p('112'), a('119', 'Fire & ambulance')],
  SG: [p('999'), a('995', 'Ambulance & fire')],
  MY: [g('999'), g('112', 'Emergency from mobile')],
  TH: [p('191'), a('1669'), f('199'), { number: '1155', label: 'Tourist police', kind: 'tourist' }],
  ID: [g('112'), p('110'), a('118'), f('113')],
  PH: [g('911')],
  VN: [p('113'), a('115'), f('114')],
  AE: [p('999'), a('998'), f('997')],
  SA: [g('911'), p('999'), a('997'), f('998')],
  QA: [g('999')],
  KW: [g('112')],
  OM: [g('9999')],
  BH: [g('999')],
  PK: [p('15'), a('1122', 'Rescue (ambulance & fire)'), a('115', 'Edhi ambulance'), f('16')],
  BD: [g('999')],
  NP: [p('100'), a('102'), f('101'), { number: '1144', label: 'Tourist police', kind: 'tourist' }],
  LK: [p('119'), a('1990', 'Ambulance (Suwa Seriya)'), f('110')],
  ZA: [p('10111'), a('10177'), g('112', 'Emergency from mobile')],
  NG: [g('112')],
  KE: [g('999'), g('112', 'Emergency (alt.)')],
  EG: [p('122'), a('123'), f('180')],
  BR: [p('190'), a('192'), f('193')],
  MX: [g('911')],
  AR: [g('911'), a('107'), f('100')],
  CL: [p('133'), a('131'), f('132')],
  CO: [g('123')],
};

/** EU/EEA members without a specific entry above all answer on 112. */
const EU_112 = new Set([
  'BE',
  'BG',
  'HR',
  'CY',
  'CZ',
  'DK',
  'EE',
  'FI',
  'HU',
  'IS',
  'LV',
  'LI',
  'LT',
  'LU',
  'MT',
  'NL',
  'PT',
  'RO',
  'SK',
  'SI',
  'SE',
]);

export function emergencyLines(countryCode?: string | null): { lines: EmergencyLine[]; known: boolean } {
  const cc = countryCode?.toUpperCase();
  if (cc && TABLE[cc]) return { lines: TABLE[cc], known: true };
  if (cc && EU_112.has(cc)) return { lines: [g('112')], known: true };
  return { lines: [g('112', 'Emergency (international)')], known: false };
}

const TZ_COUNTRY: [RegExp, string][] = [
  [/^Asia\/(Kolkata|Calcutta)$/, 'IN'],
  [/^Asia\/Karachi$/, 'PK'],
  [/^Asia\/Dhaka$/, 'BD'],
  [/^Asia\/Kathmandu$/, 'NP'],
  [/^Asia\/Colombo$/, 'LK'],
  [/^Asia\/Dubai$/, 'AE'],
  [/^Asia\/Singapore$/, 'SG'],
  [/^Asia\/Tokyo$/, 'JP'],
  [/^Europe\/London$/, 'GB'],
  [/^Australia\//, 'AU'],
];

/**
 * Best guess at the user's country before we have a location, from the locale region ("en-IN")
 * or the time zone. Used only to pre-fill the landing screen's emergency number.
 */
export function guessCountryCode(
  locale = typeof navigator === 'undefined' ? '' : navigator.language,
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '',
): string | undefined {
  const region = /-([A-Z]{2})\b/i.exec(locale)?.[1]?.toUpperCase();
  const byZone = TZ_COUNTRY.find(([re]) => re.test(timeZone))?.[1];
  // Time zone wins: many devices report en-US regardless of where they are.
  return byZone ?? region;
}

/** The number to put on the big SOS button. */
export function primaryLine(countryCode?: string | null): EmergencyLine {
  const { lines } = emergencyLines(countryCode);
  return lines.find((l) => l.kind === 'general') ?? lines[0]!;
}
