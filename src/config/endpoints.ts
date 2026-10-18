/**
 * Every service Beacon talks to. All are free and key-less; see docs/APIS.md for fair-use limits.
 * Order matters for lists: the first entry is preferred, the rest are failover mirrors.
 */

export const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
] as const;

export type TravelMode = 'driving' | 'cycling' | 'walking';

/**
 * OSRM-compatible routers. The project-osrm.org demo only has a car profile, so bike and foot
 * use the FOSSGIS servers (routing.openstreetmap.de), which expose the same OSRM HTTP API.
 */
export const OSRM_ENDPOINTS: Record<TravelMode, readonly string[]> = {
  driving: ['https://router.project-osrm.org', 'https://routing.openstreetmap.de/routed-car'],
  cycling: ['https://routing.openstreetmap.de/routed-bike'],
  walking: ['https://routing.openstreetmap.de/routed-foot'],
};

/** Both routers ask for at most ~1 request per second from a client. */
export const OSRM_PACE_MS = 1000;

export const OPEN_METEO_FORECAST = 'https://api.open-meteo.com/v1/forecast';
export const OPEN_METEO_AIR = 'https://air-quality-api.open-meteo.com/v1/air-quality';

export const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse';
export const BIGDATACLOUD_REVERSE = 'https://api.bigdatacloud.net/data/reverse-geocode-client';
export const PHOTON_SEARCH = 'https://photon.komoot.io/api/';

export const MAP_STYLES = {
  dark: 'https://tiles.openfreemap.org/styles/dark',
  light: 'https://tiles.openfreemap.org/styles/positron',
} as const;

/** NASA Black Marble (VIIRS city lights) — drawn on the night globe at low zoom. */
export const NIGHT_LIGHTS_TILES =
  'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_Black_Marble/default/2016-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png';
