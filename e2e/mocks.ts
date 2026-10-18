import type { Page, Route } from '@playwright/test';

/** Origin used by the tests: Connaught Place, New Delhi. */
export const ORIGIN = { lat: 28.6315, lon: 77.2167 };

/**
 * Two hospitals: the straight-line nearest one is slow by road (across a rail yard), the other is
 * further but faster — the app must rank by travel time, not distance.
 */
export const PLACES = {
  hospitalNearSlow: { lat: 28.6335, lon: 77.2172, name: 'Rail Side Clinic Hospital' },
  hospitalFarFast: { lat: 28.6262, lon: 77.2006, name: 'Ram Manohar Lohia Hospital' },
};

const overpass = {
  elements: [
    {
      type: 'node',
      id: 1,
      lat: PLACES.hospitalNearSlow.lat,
      lon: PLACES.hospitalNearSlow.lon,
      tags: { amenity: 'hospital', name: PLACES.hospitalNearSlow.name },
    },
    {
      type: 'way',
      id: 2,
      center: { lat: PLACES.hospitalFarFast.lat, lon: PLACES.hospitalFarFast.lon },
      tags: {
        amenity: 'hospital',
        name: PLACES.hospitalFarFast.name,
        emergency: 'yes',
        phone: '+91 11 2336 5525',
      },
    },
    {
      type: 'node',
      id: 3,
      lat: 28.6301,
      lon: 77.2185,
      tags: { amenity: 'police', name: 'Connaught Place Police Station' },
    },
    {
      type: 'node',
      id: 4,
      lat: 28.6322,
      lon: 77.2195,
      tags: { amenity: 'pharmacy', name: 'Apollo Pharmacy', opening_hours: '24/7' },
    },
    {
      type: 'node',
      id: 5,
      lat: 28.6288,
      lon: 77.2142,
      tags: { amenity: 'fuel', brand: 'Indian Oil', 'fuel:diesel': 'yes', 'fuel:octane_95': 'yes' },
    },
    {
      type: 'node',
      id: 6,
      lat: 28.6279,
      lon: 77.2253,
      tags: { amenity: 'fire_station', name: 'Barakhamba Fire Station' },
    },
    {
      type: 'node',
      id: 7,
      lat: 28.6311,
      lon: 77.2201,
      tags: { amenity: 'charging_station', name: 'Charge Point CP' },
    },
    {
      type: 'node',
      id: 8,
      lat: 28.6352,
      lon: 77.2144,
      tags: { shop: 'motorcycle_repair', name: 'Sharma Bike Works' },
    },
  ],
};

const json = (route: Route, body: unknown) =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify(body),
  });

function osrmTable(url: string) {
  const coords = decodeURIComponent(new URL(url).pathname.split('/').pop()!).split(';');
  const durations = coords.map((c, i) => {
    if (i === 0) return 0;
    const [lon, lat] = c.split(',').map(Number) as [number, number];
    if (
      Math.abs(lat - PLACES.hospitalNearSlow.lat) < 1e-5 &&
      Math.abs(lon - PLACES.hospitalNearSlow.lon) < 1e-5
    )
      return 900;
    if (Math.abs(lat - PLACES.hospitalFarFast.lat) < 1e-5) return 240;
    return 60 + i * 30;
  });
  return { code: 'Ok', durations: [durations], distances: [durations.map((d) => d * 8)] };
}

function forecast(thunderstorm: boolean) {
  const now = Math.floor(Date.now() / 1000);
  const hour = now - (now % 3600);
  const hours = Array.from({ length: 24 }, (_, i) => hour + i * 3600);
  return {
    timezone: 'Asia/Kolkata',
    utc_offset_seconds: 19800,
    current: {
      time: now,
      temperature_2m: 31,
      apparent_temperature: 33,
      relative_humidity_2m: 60,
      precipitation: thunderstorm ? 6 : 0,
      weather_code: thunderstorm ? 95 : 1,
      cloud_cover: 40,
      wind_speed_10m: 12,
      wind_gusts_10m: 24,
      wind_direction_10m: 270,
      visibility: 12000,
      is_day: 1,
      uv_index: 5,
    },
    hourly: {
      time: hours,
      temperature_2m: hours.map(() => 30),
      apparent_temperature: hours.map(() => 32),
      precipitation_probability: hours.map(() => 10),
      precipitation: hours.map(() => 0),
      weather_code: hours.map(() => 1),
      visibility: hours.map(() => 12000),
      wind_speed_10m: hours.map(() => 10),
      wind_gusts_10m: hours.map(() => 20),
      uv_index: hours.map(() => 4),
      is_day: hours.map(() => 1),
    },
    daily: {
      time: [hour - 12 * 3600, hour + 12 * 3600],
      sunrise: [hour - 6 * 3600, hour + 18 * 3600],
      sunset: [hour + 6 * 3600, hour + 30 * 3600],
      uv_index_max: [7, 7],
      temperature_2m_max: [34, 35],
      temperature_2m_min: [24, 25],
    },
  };
}

export async function mockApis(page: Page, { thunderstorm = true, overpassDown = false } = {}) {
  await page.route('**/api/interpreter', (route) =>
    overpassDown ? route.fulfill({ status: 504, body: 'busy' }) : json(route, overpass),
  );
  await page.route(/\/table\/v1\//, (route) => json(route, osrmTable(route.request().url())));
  await page.route(/\/route\/v1\//, (route) =>
    json(route, {
      code: 'Ok',
      routes: [
        {
          distance: 1900,
          duration: 240,
          geometry: {
            type: 'LineString',
            coordinates: [
              [ORIGIN.lon, ORIGIN.lat],
              [77.2101, 28.6301],
              [PLACES.hospitalFarFast.lon, PLACES.hospitalFarFast.lat],
            ],
          },
          legs: [
            {
              steps: [
                {
                  distance: 800,
                  duration: 100,
                  name: 'Baba Kharak Singh Marg',
                  maneuver: { type: 'depart', bearing_after: 250 },
                },
                {
                  distance: 1100,
                  duration: 140,
                  name: 'Ashoka Road',
                  maneuver: { type: 'turn', modifier: 'left' },
                },
                { distance: 0, duration: 0, name: '', maneuver: { type: 'arrive', modifier: 'right' } },
              ],
            },
          ],
        },
      ],
    }),
  );
  await page.route('https://api.open-meteo.com/**', (route) => json(route, forecast(thunderstorm)));
  await page.route('https://air-quality-api.open-meteo.com/**', (route) =>
    json(route, { current: { us_aqi: 64, pm2_5: 18, pm10: 40 } }),
  );
  await page.route('https://nominatim.openstreetmap.org/**', (route) =>
    json(route, {
      display_name: 'Janpath, Connaught Place, New Delhi, Delhi, India',
      address: { road: 'Janpath', suburb: 'Connaught Place', city: 'New Delhi', country_code: 'in' },
    }),
  );
  await page.route('https://photon.komoot.io/**', (route) =>
    json(route, {
      features: [
        {
          geometry: { coordinates: [72.8777, 19.076] },
          properties: {
            osm_type: 'R',
            osm_id: 1,
            name: 'Mumbai',
            state: 'Maharashtra',
            country: 'India',
            countrycode: 'IN',
          },
        },
      ],
    }),
  );
  // Night-light rasters are decorative and slow; skip them in tests.
  await page.route('https://gibs.earthdata.nasa.gov/**', (route) => route.abort());
}
