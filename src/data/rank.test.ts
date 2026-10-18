import type { Place } from '@/features/places/types';
import { rankPlaces } from './queries';

const place = (id: string, patch: Partial<Place>): Place => ({
  id,
  category: 'hospital',
  subtype: 'Hospital',
  rank: 0,
  name: id,
  hasName: true,
  lat: 0,
  lon: 0,
  distance: 1000,
  ...patch,
});

describe('rankPlaces', () => {
  it('orders by road time, not straight-line distance', () => {
    const near = place('near-but-across-river', { distance: 800 });
    const far = place('far-but-direct', { distance: 1500 });
    const times = {
      [near.id]: { duration: 900, distance: 6000 },
      [far.id]: { duration: 300, distance: 1700 },
    };
    const { hospital } = rankPlaces([near, far], times, 'driving');
    expect(hospital.places.map((p) => p.id)).toEqual(['far-but-direct', 'near-but-across-river']);
    expect(hospital.nearest?.travel).toEqual({ duration: 300, distance: 1700, estimated: false });
  });

  it('prefers a real hospital over a quicker clinic for the summary', () => {
    const clinic = place('clinic', { rank: 1, subtype: 'Clinic', distance: 200 });
    const hospital = place('hospital', { distance: 3000 });
    const ranked = rankPlaces([clinic, hospital], undefined, 'driving');
    expect(ranked.hospital.places[0]?.id).toBe('clinic');
    expect(ranked.hospital.nearest?.id).toBe('hospital');
  });

  it('falls back to estimates when the router is unavailable', () => {
    const ranked = rankPlaces([place('p', { category: 'fuel', distance: 1000 })], undefined, 'walking');
    expect(ranked.fuel.nearest?.travel.estimated).toBe(true);
    expect(ranked.fuel.nearest?.travel.distance).toBeCloseTo(1350);
    expect(ranked.police.nearest).toBeNull();
  });
});
