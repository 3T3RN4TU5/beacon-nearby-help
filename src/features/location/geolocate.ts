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

// Numeric codes per the Geolocation spec (1 denied, 2 unavailable, 3 timeout).
const toGeoError = (e: GeolocationPositionError): GeoError => {
  switch (e.code) {
    case 1:
      return new GeoError('denied', 'Location permission was denied.');
    case 3:
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

export interface AcquireHandlers {
  /** Called with the first fix and then with every more accurate one. */
  onFix: (fix: Fix) => void;
  /** Called once with the best fix when the target accuracy is reached or the wait runs out. */
  onDone: (best: Fix) => void;
  onError: (error: GeoError) => void;
}

export interface AcquireOptions {
  /** Stop refining once a fix is at least this accurate (metres). */
  targetAccuracy?: number;
  /** Give up refining (or fail, if nothing arrived) after this long. */
  maxWaitMs?: number;
  /** Ask for a coarse Wi-Fi/cell fix if GPS has said nothing by then. */
  coarseFallbackMs?: number;
}

/**
 * Progressive location: a phone's first answer is usually a cached or Wi-Fi/cell estimate that can
 * be kilometres off, and the GPS converges over the next few seconds. Report the first fix at once
 * (so the app can start), keep listening, and report each more accurate fix until the target
 * accuracy is reached. Returns a function that cancels the acquisition.
 */
export function acquirePosition(
  { onFix, onDone, onError }: AcquireHandlers,
  { targetAccuracy = 25, maxWaitMs = 20_000, coarseFallbackMs = 6_000 }: AcquireOptions = {},
): () => void {
  assertAvailable();
  let best: Fix | null = null;
  let finished = false;

  const finish = () => {
    if (finished) return false;
    finished = true;
    navigator.geolocation.clearWatch(watchId);
    clearTimeout(fallbackTimer);
    clearTimeout(deadline);
    return true;
  };

  const consider = (fix: Fix) => {
    if (finished || (best && fix.accuracy >= best.accuracy)) return;
    best = fix;
    onFix(fix);
    if (fix.accuracy <= targetAccuracy && finish()) onDone(fix);
  };

  const watchId = navigator.geolocation.watchPosition(
    (p) => consider(toFix(p)),
    (e) => {
      const error = toGeoError(e);
      // Timeouts and transient failures: keep waiting for GPS or the coarse fallback.
      if (error.kind === 'denied' && finish()) onError(error);
    },
    { enableHighAccuracy: true, maximumAge: 5_000, timeout: maxWaitMs },
  );

  const fallbackTimer = setTimeout(() => {
    if (best || finished) return;
    navigator.geolocation.getCurrentPosition(
      (p) => consider(toFix(p)),
      () => undefined,
      { enableHighAccuracy: false, maximumAge: 30_000, timeout: maxWaitMs },
    );
  }, coarseFallbackMs);

  const deadline = setTimeout(() => {
    const result = best;
    if (!finish()) return;
    if (result) onDone(result);
    else onError(new GeoError('timeout', 'Getting a location fix took too long.'));
  }, maxWaitMs);

  return () => void finish();
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
