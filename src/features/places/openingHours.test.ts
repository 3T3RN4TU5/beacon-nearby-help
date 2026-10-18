import { evaluateOpeningHours, localClock, parseOpeningHours } from './openingHours';

// Monday = 0
const at = (day: number, hh: number, mm = 0) => ({ day, minutes: hh * 60 + mm });

describe('parseOpeningHours', () => {
  it('recognises always-open forms', () => {
    expect(parseOpeningHours('24/7')).toBe('always');
    expect(parseOpeningHours('Mo-Su 00:00-24:00')).toBe('always');
    expect(parseOpeningHours('24/7; PH off')).not.toBeNull();
  });

  it('rejects syntax it does not understand rather than guessing', () => {
    expect(parseOpeningHours('Jan-Mar Mo-Fr 08:00-12:00')).toBeNull();
    expect(parseOpeningHours('Mo-Fr sunrise-sunset')).toBeNull();
    expect(parseOpeningHours('Mo-Fr 08:00-12:00 || "by appointment"')).toBeNull();
  });
});

describe('evaluateOpeningHours', () => {
  it('returns unknown without data', () => {
    expect(evaluateOpeningHours(undefined, at(0, 10))).toEqual({ state: 'unknown' });
    expect(evaluateOpeningHours('sunrise-sunset', at(0, 10))).toEqual({ state: 'unknown' });
  });

  it('handles 24/7', () => {
    expect(evaluateOpeningHours('24/7', at(3, 3))).toMatchObject({ state: 'open', always: true });
  });

  it('handles weekday ranges and closing times', () => {
    const spec = 'Mo-Fr 09:00-18:00; Sa 10:00-14:00';
    expect(evaluateOpeningHours(spec, at(0, 10))).toMatchObject({
      state: 'open',
      closesAt: '18:00',
      closingSoon: false,
    });
    expect(evaluateOpeningHours(spec, at(4, 17, 30))).toMatchObject({ state: 'open', closingSoon: true });
    expect(evaluateOpeningHours(spec, at(5, 15))).toMatchObject({
      state: 'closed',
      opensAt: '09:00',
      opensOn: 'Mo',
    });
    expect(evaluateOpeningHours(spec, at(0, 7))).toMatchObject({
      state: 'closed',
      opensAt: '09:00',
      opensOn: 'today',
    });
    expect(evaluateOpeningHours(spec, at(2, 19))).toMatchObject({
      state: 'closed',
      opensAt: '09:00',
      opensOn: 'tomorrow',
    });
  });

  it('handles split shifts', () => {
    const spec = 'Mo-Sa 08:00-13:00,16:00-21:00';
    expect(evaluateOpeningHours(spec, at(1, 14))).toMatchObject({
      state: 'closed',
      opensAt: '16:00',
      opensOn: 'today',
    });
    expect(evaluateOpeningHours(spec, at(1, 17))).toMatchObject({ state: 'open', closesAt: '21:00' });
  });

  it('handles overnight spans, including across the week boundary', () => {
    const spec = 'Fr-Su 18:00-02:00';
    expect(evaluateOpeningHours(spec, at(5, 1))).toMatchObject({ state: 'open', closesAt: '02:00' }); // Saturday 01:00
    expect(evaluateOpeningHours(spec, at(0, 1, 30))).toMatchObject({ state: 'open', closesAt: '02:00' }); // Monday 01:30 (Sunday night)
    expect(evaluateOpeningHours(spec, at(0, 3))).toMatchObject({ state: 'closed', opensOn: 'Fr' });
  });

  it('lets later rules override earlier ones and supports off', () => {
    const spec = 'Mo-Su 08:00-22:00; Su off';
    expect(evaluateOpeningHours(spec, at(6, 12))).toMatchObject({ state: 'closed', opensOn: 'tomorrow' });
    expect(evaluateOpeningHours(spec, at(5, 12))).toMatchObject({ state: 'open' });
  });

  it('accepts comma-separated rules and day lists', () => {
    expect(evaluateOpeningHours('Mo-Fr 08:00-12:00, Sa 09:00-11:00', at(5, 10))).toMatchObject({
      state: 'open',
    });
    expect(evaluateOpeningHours('Sa,Su 10:00-16:00', at(6, 11))).toMatchObject({ state: 'open' });
    expect(evaluateOpeningHours('Sa,Su 10:00-16:00', at(2, 11))).toMatchObject({
      state: 'closed',
      opensOn: 'Sa',
    });
  });

  it('chains back-to-back spans to the real closing time', () => {
    expect(evaluateOpeningHours('Mo 00:00-24:00; Tu 00:00-06:00', at(0, 22))).toMatchObject({
      state: 'open',
      closesAt: '06:00',
    });
  });
});

describe('localClock', () => {
  it('uses the location offset rather than the device zone', () => {
    // 2026-10-19T00:30:00Z is a Monday; IST (+05:30) makes it 06:00 Monday.
    const date = new Date('2026-10-19T00:30:00Z');
    expect(localClock(19_800, date)).toEqual({ day: 0, minutes: 360 });
    // UTC-5 makes it 19:30 on Sunday.
    expect(localClock(-18_000, date)).toEqual({ day: 6, minutes: 19 * 60 + 30 });
  });
});
