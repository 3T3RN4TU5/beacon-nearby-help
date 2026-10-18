/**
 * A deliberately small evaluator for the OSM `opening_hours` syntax.
 *
 * It understands the forms that cover the vast majority of real tags — `24/7`, weekday ranges
 * and lists, multiple time spans, overnight spans and `off` — and returns "unknown" for anything
 * richer (month ranges, sunrise, week numbers) rather than guessing. For an emergency app a
 * wrong "Open" is worse than no answer.
 */

const DAY_CODES = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const;
const DAY = '(?:Mo|Tu|We|Th|Fr|Sa|Su)';
const DAY_TOKEN = `(?:${DAY}(?:\\s*-\\s*${DAY})?|PH|SH)`;
const DAY_SELECTOR = new RegExp(`^(${DAY_TOKEN}(?:\\s*,\\s*${DAY_TOKEN})*)(?:\\s+|$)`);
const SPAN = /^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})\+?$/;

type Interval = readonly [start: number, end: number]; // minutes from local midnight; end may exceed 1440
type Week = Interval[][];

/** Weekday with Monday = 0, minutes since local midnight. */
export interface LocalClock {
  day: number;
  minutes: number;
}

export type OpeningStatus =
  | { state: 'open'; always: boolean; closesAt?: string; closingSoon: boolean }
  | { state: 'closed'; opensAt?: string; opensOn?: string }
  | { state: 'unknown' };

const dayIndex = (code: string) => DAY_CODES.indexOf(code as (typeof DAY_CODES)[number]);

function parseDays(selector: string): number[] | null {
  const days = new Set<number>();
  for (const raw of selector.split(',')) {
    const token = raw.trim();
    if (token === 'PH' || token === 'SH') continue; // public/school holidays: we can't know them, skip
    const [from, to] = token.split('-').map((t) => t.trim());
    const a = dayIndex(from ?? '');
    if (a < 0) return null;
    if (!to) {
      days.add(a);
      continue;
    }
    const b = dayIndex(to);
    if (b < 0) return null;
    for (let d = a; ; d = (d + 1) % 7) {
      days.add(d);
      if (d === b) break;
    }
  }
  return [...days];
}

function parseSpans(text: string): Interval[] | null {
  const spans: Interval[] = [];
  for (const raw of text.split(',')) {
    const m = SPAN.exec(raw.trim());
    if (!m) return null;
    const [h1, m1, h2, m2] = m.slice(1).map(Number) as [number, number, number, number];
    if (h1 > 24 || h2 > 48 || m1 > 59 || m2 > 59) return null;
    const start = h1 * 60 + m1;
    let end = h2 * 60 + m2;
    if (end <= start) end += 1440; // overnight, e.g. 18:00-02:00
    spans.push([start, end]);
  }
  return spans;
}

export function parseOpeningHours(spec: string): Week | 'always' | null {
  const text = spec
    .trim()
    // "Mo-Fr 08:00-12:00, Sa 09:00-11:00" uses a comma as a rule separator; normalise to ';'.
    .replace(/(\d)\s*,\s*(?=(?:Mo|Tu|We|Th|Fr|Sa|Su|PH)\b)/g, '$1;');
  if (!text || text.includes('||')) return null;
  if (/^24\/7$/i.test(text)) return 'always';

  const week: Week = Array.from({ length: 7 }, () => []);
  for (const rawRule of text.split(';')) {
    const rule = rawRule.trim();
    if (!rule) continue;

    let days = [0, 1, 2, 3, 4, 5, 6];
    let rest = rule;
    const sel = DAY_SELECTOR.exec(rule);
    if (sel) {
      const parsed = parseDays(sel[1]!);
      if (!parsed) return null;
      if (parsed.length === 0) continue; // holiday-only rule
      days = parsed;
      rest = rule.slice(sel[0].length).trim();
    }

    let spans: Interval[];
    if (/^(off|closed)$/i.test(rest)) spans = [];
    else if (rest === '' || /^24\/7$/.test(rest) || /^open$/i.test(rest)) spans = [[0, 1440]];
    else {
      const parsed = parseSpans(rest);
      if (!parsed) return null;
      spans = parsed;
    }
    // Later rules replace earlier ones for the days they name (OSM semantics).
    for (const d of days) week[d] = spans;
  }

  const coversWholeWeek = week.every((spans) => spans.some(([s, e]) => s === 0 && e >= 1440));
  return coversWholeWeek ? 'always' : week;
}

const hhmm = (minutes: number) => {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

export function evaluateOpeningHours(spec: string | undefined, now: LocalClock): OpeningStatus {
  if (!spec) return { state: 'unknown' };
  const week = parseOpeningHours(spec);
  if (!week) return { state: 'unknown' };
  if (week === 'always') return { state: 'open', always: true, closingSoon: false };

  // Work in absolute minutes since Monday 00:00. Copies of the week before and after let
  // Sunday-night spans reach into Monday and "next opening" look past the week boundary.
  const t = now.day * 1440 + now.minutes;
  const week0: Interval[] = [];
  for (let d = 0; d < 7; d++) for (const [s, e] of week[d]!) week0.push([d * 1440 + s, d * 1440 + e]);
  const all = [-10080, 0, 10080]
    .flatMap((offset) => week0.map(([s, e]) => [s + offset, e + offset] as Interval))
    .sort((a, b) => a[0] - b[0]);

  const current = all.find(([s, e]) => s <= t && t < e);
  if (current) {
    // Follow back-to-back spans (e.g. 00:00-24:00 then 00:00-02:00) to the real closing time.
    let end = current[1];
    for (const [s, e] of all) if (s <= end && e > end) end = e;
    return { state: 'open', always: false, closesAt: hhmm(end), closingSoon: end - t <= 60 };
  }

  const next = all.find(([s]) => s > t);
  if (!next) return { state: 'closed' };
  const daysAhead = Math.floor(next[0] / 1440) - now.day;
  const opensOn =
    daysAhead === 0 ? 'today' : daysAhead === 1 ? 'tomorrow' : DAY_CODES[Math.floor(next[0] / 1440) % 7];
  return { state: 'closed', opensAt: hhmm(next[0]), opensOn };
}

/** Local wall clock at a place, using the UTC offset Open-Meteo reports for it (falls back to device time). */
export function localClock(utcOffsetSeconds?: number, date = new Date()): LocalClock {
  if (utcOffsetSeconds === undefined) {
    return { day: (date.getDay() + 6) % 7, minutes: date.getHours() * 60 + date.getMinutes() };
  }
  const shifted = new Date(date.getTime() + utcOffsetSeconds * 1000);
  return {
    day: (shifted.getUTCDay() + 6) % 7,
    minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  };
}
