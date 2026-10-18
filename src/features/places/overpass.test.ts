import { buildOverpassQuery, findNearbyPlaces } from './overpass';

const origin = { lat: 28.6139, lon: 77.209 };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('buildOverpassQuery', () => {
  it('emits one statement per tag matcher with an around filter', () => {
    const q = buildOverpassQuery(['police', 'fuel'], origin, 3000);
    expect(q).toBe(
      '[out:json][timeout:25];(nwr["amenity"="police"](around:3000,28.613900,77.209000);nwr["amenity"="fuel"](around:3000,28.613900,77.209000););out tags center;',
    );
  });
});

describe('findNearbyPlaces', () => {
  it('widens the radius only for categories still missing', async () => {
    const queries: string[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      const query = new URLSearchParams(String(init?.body)).get('data')!;
      queries.push(query);
      if (query.includes('around:3000')) {
        return json({
          elements: [
            {
              type: 'node',
              id: 1,
              lat: 28.615,
              lon: 77.21,
              tags: { amenity: 'police', name: 'Parliament St PS' },
            },
            {
              type: 'node',
              id: 2,
              lat: 28.616,
              lon: 77.211,
              tags: { amenity: 'clinic', name: 'Polyclinic' },
            },
            { type: 'node', id: 3, lat: 28.612, lon: 77.205, tags: { amenity: 'fuel' } },
            { type: 'node', id: 4, lat: 28.611, lon: 77.207, tags: { amenity: 'pharmacy' } },
          ],
        });
      }
      return json({
        elements: [
          {
            type: 'way',
            id: 9,
            center: { lat: 28.66, lon: 77.23 },
            tags: { amenity: 'hospital', name: 'District Hospital' },
          },
        ],
      });
    });

    const result = await findNearbyPlaces(origin);

    // Clinic alone doesn't satisfy "hospital", so the second pass must include hospitals but not police.
    expect(queries[1]).toContain('"amenity"="hospital"');
    expect(queries[1]).not.toContain('"amenity"="police"');
    expect(result.places.map((p) => p.id)).toEqual(expect.arrayContaining(['node/1', 'node/2', 'way/9']));
    expect(result.searchedRadius.police).toBe(3000);
    expect(result.searchedRadius.hospital).toBeGreaterThan(3000);
  });

  it('fails over to the next mirror when the first is at capacity', async () => {
    const hosts: string[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      hosts.push(new URL(String(url)).host);
      if (hosts.length === 1) return new Response('busy', { status: 504 });
      return json({ elements: [] });
    });
    await findNearbyPlaces(origin);
    expect(hosts[0]).toBe('overpass-api.de');
    expect(hosts[1]).toBe('maps.mail.ru');
  });
});
