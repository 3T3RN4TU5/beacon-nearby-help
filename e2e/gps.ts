import type { BrowserContext } from '@playwright/test';

export interface FakeFix {
  /** Milliseconds after location is first requested. */
  at: number;
  lat: number;
  lon: number;
  accuracy: number;
}

/** A phone: Wi-Fi/cell estimate first (1.4 km off), GPS converging over the next seconds. */
export const PHONE_GPS: FakeFix[] = [
  { at: 0, lat: 28.644, lon: 77.224, accuracy: 1800 },
  { at: 1500, lat: 28.6322, lon: 77.2179, accuracy: 85 },
  { at: 3000, lat: 28.6315, lon: 77.2167, accuracy: 12 },
];

/** A laptop: one IP/Wi-Fi estimate that never improves. */
export const LAPTOP_GPS: FakeFix[] = [{ at: 0, lat: 28.644, lon: 77.224, accuracy: 1800 }];

/**
 * Replaces navigator.geolocation with a scripted device so tests can reproduce real GPS
 * behaviour (coarse first fix, then convergence) deterministically.
 */
export async function useFakeGps(context: BrowserContext, fixes: FakeFix[]) {
  await context.addInitScript((script: FakeFix[]) => {
    let t0: number | null = null;
    const since = () => {
      t0 ??= performance.now();
      return performance.now() - t0;
    };
    const toPosition = (f: FakeFix) =>
      ({
        coords: { latitude: f.lat, longitude: f.lon, accuracy: f.accuracy, heading: null, speed: null },
        timestamp: Date.now(),
      }) as unknown as GeolocationPosition;
    const timers = new Map<number, ReturnType<typeof setTimeout>[]>();
    let nextId = 1;
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition(ok: PositionCallback) {
          const now = since();
          const latest = script.filter((f) => f.at <= now).pop() ?? script[0]!;
          setTimeout(() => ok(toPosition(latest)), 100);
        },
        watchPosition(ok: PositionCallback) {
          const id = nextId++;
          const now = since();
          timers.set(
            id,
            script.map((f) => setTimeout(() => ok(toPosition(f)), Math.max(50, f.at - now))),
          );
          return id;
        },
        clearWatch(id: number) {
          timers.get(id)?.forEach(clearTimeout);
          timers.delete(id);
        },
      },
    });
  }, fixes);
}
