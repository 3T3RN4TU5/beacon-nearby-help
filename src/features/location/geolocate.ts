export type GeoErrorKind = 'unsupported' | 'insecure' | 'denied' | 'unavailable' | 'timeout';

export class GeoError extends Error {
  readonly kind: GeoErrorKind;
  constructor(kind: GeoErrorKind, message: string) {
    super(message);
    this.name = 'GeoError';
    this.kind = kind;
  }
}

export interface Fix {
  lat: number;
  lon: number;
  /** Metres, 95% confidence radius as reported by the device. */
  accuracy: number;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

const toFix = (p: GeolocationPosition): Fix => ({
  lat: p.coords.latitude,
  lon: p.coords.longitude,
  accuracy: p.coords.accuracy,
  heading: Number.isFinite(p.coords.heading) ? p.coords.heading : null,
  speed: Number.isFinite(p.coords.speed) ? p.coords.speed : null,
  timestamp: p.timestamp,
});

const toGeoError = (e: GeolocationPositionError): GeoError => {
  switch (e.code) {
    case e.PERMISSION_DENIED:
      return new GeoError('denied', 'Location permission was denied.');
    case e.TIMEOUT:
      return new GeoError('timeout', 'Getting a location fix took too long.');
    default:
      return new GeoError('unavailable', 'Your device could not determine a location.');
  }
};

function assertAvailable(): void {
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    throw new GeoError('insecure', 'Location only works over HTTPS.');
  }
  if (!('geolocation' in navigator))
    throw new GeoError('unsupported', 'This browser has no location support.');
}

function getFix(options: PositionOptions): Promise<Fix> {
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(
      (p) => resolve(toFix(p)),
      (e) => reject(toGeoError(e)),
      options,
    ),
  );
}

/**
 * GPS first; if the device can't get a satellite fix in time (indoors, cold start), fall back to a
 * coarse Wi-Fi/cell fix rather than failing — a 300 m answer now beats a 5 m answer never.
 */
export async function locate(): Promise<Fix> {
  assertAvailable();
  try {
    return await getFix({ enableHighAccuracy: true, timeout: 12_000, maximumAge: 15_000 });
  } catch (error) {
    if (error instanceof GeoError && error.kind !== 'denied') {
      return getFix({ enableHighAccuracy: false, timeout: 15_000, maximumAge: 120_000 });
    }
    throw error;
  }
}

/** Continuous tracking; returns an unsubscribe function. */
export function watchFix(onFix: (fix: Fix) => void, onError: (error: GeoError) => void): () => void {
  assertAvailable();
  const id = navigator.geolocation.watchPosition(
    (p) => onFix(toFix(p)),
    (e) => onError(toGeoError(e)),
    { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 },
  );
  return () => navigator.geolocation.clearWatch(id);
}

export async function geolocationPermission(): Promise<PermissionState | 'unknown'> {
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' });
    return status.state;
  } catch {
    return 'unknown';
  }
}
