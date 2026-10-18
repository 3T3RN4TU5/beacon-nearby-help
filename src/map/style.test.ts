import type { StyleSpecification } from 'maplibre-gl';
import { labelsStartIndex, nullSafeComparisons, themeStyle } from './style';

describe('nullSafeComparisons', () => {
  it('coalesces nullable property reads in numeric comparisons', () => {
    const upstream = [
      'all',
      ['<=', ['get', 'ref_length'], 6],
      ['match', ['get', 'network'], ['us-interstate'], true, false],
      ['>', ['get', 'rank'], 2],
    ];
    expect(nullSafeComparisons(upstream)).toEqual([
      'all',
      ['<=', ['coalesce', ['get', 'ref_length'], Number.MAX_SAFE_INTEGER], 6],
      ['match', ['get', 'network'], ['us-interstate'], true, false],
      ['>', ['coalesce', ['get', 'rank'], -Number.MAX_SAFE_INTEGER], 2],
    ]);
  });

  it('leaves other expressions untouched', () => {
    const exprs = [['==', ['get', 'class'], 'motorway'], ['<=', ['zoom'], 6], 'literal', 4];
    for (const e of exprs) expect(nullSafeComparisons(e)).toEqual(e);
  });
});

describe('labelsStartIndex', () => {
  it('points just above the last geometry layer, past early labels', () => {
    const layers = [
      { type: 'background' },
      { type: 'fill' },
      { type: 'symbol' }, // early water label
      { type: 'line' }, // roads come after it
      { type: 'symbol' },
      { type: 'symbol' },
    ];
    expect(labelsStartIndex(layers)).toBe(4);
    expect(labelsStartIndex([{ type: 'symbol' }])).toBe(0);
  });
});

describe('themeStyle', () => {
  const base = {
    version: 8,
    sources: { openmaptiles: { type: 'vector', url: 'https://example.test/planet' } },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': '#ffffff' } },
      {
        id: 'water',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'water',
        paint: { 'fill-color': '#00f' },
      },
      {
        id: 'road',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        paint: { 'line-color': '#888888' },
      },
      {
        id: 'shield',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'transportation_name',
        filter: ['<=', ['get', 'ref_length'], 6],
      },
    ],
  } as unknown as StyleSpecification;

  it('adds globe, sky, night lights and 3D buildings in the right places', () => {
    const style = themeStyle(base, 'dark');
    const ids = style.layers.map((l) => l.id);
    expect(style.projection).toEqual({ type: 'globe' });
    expect(style.sky).toBeDefined();
    expect(ids.indexOf('beacon-night-lights')).toBeLessThan(ids.indexOf('water'));
    expect(ids.indexOf('beacon-buildings-3d')).toBe(ids.indexOf('road') + 1);
    expect(style.layers.find((l) => l.id === 'shield')).toHaveProperty('filter', [
      '<=',
      ['coalesce', ['get', 'ref_length'], Number.MAX_SAFE_INTEGER],
      6,
    ]);
  });

  it('only adds night lights to the dark theme', () => {
    expect(themeStyle(base, 'light').layers.some((l) => l.id === 'beacon-night-lights')).toBe(false);
  });
});
