import {
  classify,
  composeAddress,
  dedupe,
  parseElements,
  pickFeatures,
  pickPhone,
  pickWebsite,
  toPlace,
} from './parse';
import type { OverpassElement } from './types';

const origin = { lat: 28.6139, lon: 77.209 };

describe('classify', () => {
  it('maps OSM tags to categories with rank', () => {
    expect(classify({ amenity: 'hospital' })).toMatchObject({ category: 'hospital', matcher: { rank: 0 } });
    expect(classify({ amenity: 'clinic' })).toMatchObject({
      category: 'hospital',
      matcher: { rank: 1, subtype: 'Clinic' },
    });
    expect(classify({ shop: 'tyres' })).toMatchObject({
      category: 'repair',
      matcher: { subtype: 'Tyres & puncture' },
    });
    expect(classify({ amenity: 'cafe' })).toBeNull();
  });

  it('respects the requested subset', () => {
    expect(classify({ amenity: 'fuel' }, ['police'])).toBeNull();
  });
});

describe('tag helpers', () => {
  it('takes the first phone of a list', () => {
    expect(pickPhone({ phone: '+91 11 2336 5525; +91 11 2340 4040' })).toBe('+91 11 2336 5525');
    expect(pickPhone({ 'contact:mobile': '98100 00000' })).toBe('98100 00000');
    expect(pickPhone({})).toBeUndefined();
  });

  it('normalises websites', () => {
    expect(pickWebsite({ website: 'example.org' })).toBe('https://example.org');
    expect(pickWebsite({ 'contact:website': 'http://a.b' })).toBe('http://a.b');
  });

  it('composes addresses', () => {
    expect(composeAddress({ 'addr:full': 'Baba Kharak Singh Marg' })).toBe('Baba Kharak Singh Marg');
    expect(composeAddress({ 'addr:housenumber': '12', 'addr:street': 'MG Road', 'addr:city': 'Pune' })).toBe(
      '12 MG Road, Pune',
    );
    expect(composeAddress({})).toBeUndefined();
  });

  it('humanises fuel grades and EV sockets', () => {
    expect(pickFeatures('fuel', { 'fuel:diesel': 'yes', 'fuel:octane_95': 'yes', 'fuel:cng': 'no' })).toEqual(
      ['Diesel', 'Petrol'],
    );
    expect(
      pickFeatures('ev', {
        'socket:type2_combo': '2',
        'socket:type2': 'yes',
        'socket:type2:output': '22 kW',
      }),
    ).toEqual(['CCS2', 'Type 2']);
    expect(pickFeatures('police', { 'fuel:diesel': 'yes' })).toBeUndefined();
  });
});

describe('toPlace', () => {
  it('uses the centroid for ways and flags emergency departments', () => {
    const el: OverpassElement = {
      type: 'way',
      id: 34404757,
      center: { lat: 28.626, lon: 77.2007 },
      tags: {
        amenity: 'hospital',
        name: 'Dr. Ram Manohar Lohia Hospital',
        emergency: 'yes',
        phone: '011 2336 5525',
      },
    };
    const p = toPlace(el, origin)!;
    expect(p).toMatchObject({
      id: 'way/34404757',
      category: 'hospital',
      emergency: true,
      hasName: true,
      phone: '011 2336 5525',
    });
    expect(p.distance).toBeGreaterThan(1000);
    expect(p.distance).toBeLessThan(2000);
  });

  it('prefers a localised name and falls back to brand, then a generic label', () => {
    const base = { type: 'node' as const, id: 1, lat: 28.62, lon: 77.21 };
    expect(
      toPlace(
        { ...base, tags: { amenity: 'fuel', name: 'पेट्रोल पंप', 'name:en': 'Petrol Pump' } },
        origin,
        'en',
      )?.name,
    ).toBe('Petrol Pump');
    expect(toPlace({ ...base, tags: { amenity: 'fuel', brand: 'Indian Oil' } }, origin)?.name).toBe(
      'Indian Oil',
    );
    expect(toPlace({ ...base, tags: { amenity: 'police' } }, origin)).toMatchObject({
      name: 'Police station',
      hasName: false,
    });
  });

  it('drops elements without coordinates or a known category', () => {
    expect(toPlace({ type: 'node', id: 2, tags: { amenity: 'fuel' } }, origin)).toBeNull();
    expect(toPlace({ type: 'node', id: 3, lat: 1, lon: 1, tags: { amenity: 'bench' } }, origin)).toBeNull();
  });
});

describe('dedupe', () => {
  it('merges a node and way for the same named facility, keeping the richer record', () => {
    const els: OverpassElement[] = [
      { type: 'node', id: 1, lat: 28.62, lon: 77.21, tags: { amenity: 'hospital', name: 'City Hospital' } },
      {
        type: 'way',
        id: 2,
        center: { lat: 28.6205, lon: 77.2102 },
        tags: { amenity: 'hospital', name: 'City  Hospital', phone: '123', opening_hours: '24/7' },
      },
      {
        type: 'node',
        id: 3,
        lat: 28.6201,
        lon: 77.2101,
        tags: { amenity: 'pharmacy', name: 'City Hospital' },
      },
    ];
    const places = parseElements(els, origin);
    expect(places).toHaveLength(2);
    expect(places.find((p) => p.category === 'hospital')?.id).toBe('way/2');
  });

  it('keeps distinct unnamed places that are not on top of each other', () => {
    const a = toPlace({ type: 'node', id: 1, lat: 28.62, lon: 77.21, tags: { amenity: 'fuel' } }, origin)!;
    const b = toPlace({ type: 'node', id: 2, lat: 28.63, lon: 77.21, tags: { amenity: 'fuel' } }, origin)!;
    expect(dedupe([a, b])).toHaveLength(2);
  });
});
