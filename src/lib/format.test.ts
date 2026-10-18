import {
  defaultUnits,
  distanceParts,
  durationParts,
  formatDistance,
  formatDuration,
  formatSpeed,
  formatTemperature,
} from './format';

describe('format', () => {
  it('formats metric distances', () => {
    expect(formatDistance(4)).toBe('10 m');
    expect(formatDistance(456)).toBe('460 m');
    expect(formatDistance(1234)).toBe('1.2 km');
    expect(formatDistance(23_456)).toBe('23 km');
    expect(formatDistance(NaN)).toBe('—');
  });

  it('formats imperial distances', () => {
    expect(formatDistance(100, 'imperial')).toBe('330 ft');
    expect(formatDistance(1609.344 * 2.34, 'imperial')).toBe('2.3 mi');
    expect(formatDistance(1609.344 * 42, 'imperial')).toBe('42 mi');
  });

  it('formats durations', () => {
    expect(formatDuration(10)).toBe('1 min');
    expect(formatDuration(14 * 60 + 20)).toBe('14 min');
    expect(formatDuration(3600)).toBe('1 h');
    expect(formatDuration(3900)).toBe('1 h 05 min');
  });

  it('splits values for display typography', () => {
    expect(distanceParts(2400)).toEqual({ value: '2.4', unit: 'km' });
    expect(durationParts(7 * 60)).toEqual({ value: '7', unit: 'min' });
    expect(durationParts(75 * 60)).toEqual({ value: '1:15', unit: 'h' });
  });

  it('converts temperature and speed', () => {
    expect(formatTemperature(30)).toBe('30°C');
    expect(formatTemperature(30, 'imperial')).toBe('86°F');
    expect(formatSpeed(100, 'imperial')).toBe('62 mph');
  });

  it('picks imperial only for the locales that use it', () => {
    expect(defaultUnits('en-US')).toBe('imperial');
    expect(defaultUnits('en-IN')).toBe('metric');
    expect(defaultUnits('en-GB')).toBe('metric');
  });
});
