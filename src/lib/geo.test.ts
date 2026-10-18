import {
  bearing,
  boundsOf,
  circleRing,
  compass16,
  compassWord,
  destination,
  formatCoordinates,
  haversine,
} from './geo';

const london = { lat: 51.5074, lon: -0.1278 };
const paris = { lat: 48.8566, lon: 2.3522 };

describe('geo', () => {
  it('computes great-circle distance', () => {
    expect(haversine(london, paris) / 1000).toBeCloseTo(343.5, 0);
    expect(haversine(london, london)).toBe(0);
  });

  it('computes initial bearing and compass names', () => {
    expect(bearing(london, paris)).toBeCloseTo(148.1, 0);
    expect(compass16(148)).toBe('SSE');
    expect(compassWord(0)).toBe('north');
    expect(compassWord(359)).toBe('north');
    expect(compassWord(225)).toBe('southwest');
  });

  it('projects a destination that round-trips through haversine', () => {
    const d = destination(london, 90, 5000);
    expect(haversine(london, d)).toBeCloseTo(5000, 0);
    expect(bearing(london, d)).toBeCloseTo(90, 0);
  });

  it('builds a closed accuracy ring', () => {
    const ring = circleRing(london, 100, 36);
    expect(ring).toHaveLength(37);
    expect(ring[0]![0]).toBeCloseTo(ring[36]![0], 9);
    expect(ring[0]![1]).toBeCloseTo(ring[36]![1], 9);
  });

  it('formats coordinates with hemispheres', () => {
    expect(formatCoordinates({ lat: -33.8688, lon: 151.2093 })).toBe('33.8688° S, 151.2093° E');
    expect(formatCoordinates(london, 2)).toBe('51.51° N, 0.13° W');
  });

  it('computes bounds', () => {
    expect(boundsOf([])).toBeNull();
    expect(boundsOf([london, paris])).toEqual([
      [-0.1278, 48.8566],
      [2.3522, 51.5074],
    ]);
  });
});
