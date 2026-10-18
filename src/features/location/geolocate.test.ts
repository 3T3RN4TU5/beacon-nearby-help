import { acquirePosition, type Fix } from './geolocate';

type Ok = (p: GeolocationPosition) => void;
type Fail = (e: GeolocationPositionError) => void;

const position = (lat: number, lon: number, accuracy: number) =>
  ({
    coords: { latitude: lat, longitude: lon, accuracy, heading: null, speed: null },
    timestamp: Date.now(),
  }) as unknown as GeolocationPosition;

const geoError = (code: 1 | 2 | 3) =>
  ({
    code,
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
    message: '',
  }) as GeolocationPositionError;

/** Controllable stand-in for navigator.geolocation. */
function fakeGeolocation() {
  const watches = new Map<number, { ok: Ok; fail: Fail; options?: PositionOptions }>();
  const gets: { ok: Ok; fail: Fail; options?: PositionOptions }[] = [];
  let next = 1;
  const api = {
    watchPosition: vi.fn((ok: Ok, fail: Fail, options?: PositionOptions) => {
      watches.set(next, { ok, fail, options });
      return next++;
    }),
    clearWatch: vi.fn((id: number) => watches.delete(id)),
    getCurrentPosition: vi.fn((ok: Ok, fail: Fail, options?: PositionOptions) =>
      gets.push({ ok, fail, options }),
    ),
  };
  return {
    api,
    gets,
    emit: (lat: number, lon: number, accuracy: number) =>
      watches.forEach((w) => w.ok(position(lat, lon, accuracy))),
    fail: (code: 1 | 2 | 3) => watches.forEach((w) => w.fail(geoError(code))),
    activeWatches: () => watches.size,
  };
}

describe('acquirePosition', () => {
  let gps: ReturnType<typeof fakeGeolocation>;

  beforeEach(() => {
    vi.useFakeTimers();
    gps = fakeGeolocation();
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
    Object.defineProperty(navigator, 'geolocation', { value: gps.api, configurable: true });
  });
  afterEach(() => vi.useRealTimers());

  it('reports the first fix at once, then only more accurate ones, and stops at the target', () => {
    const fixes: Fix[] = [];
    const onDone = vi.fn();
    acquirePosition({ onFix: (f) => fixes.push(f), onDone, onError: vi.fn() }, { targetAccuracy: 25 });

    gps.emit(28.644, 77.224, 1800); // coarse network fix
    gps.emit(28.6325, 77.218, 2000); // worse: ignored
    gps.emit(28.6322, 77.2179, 85);
    expect(onDone).not.toHaveBeenCalled();
    gps.emit(28.6315, 77.2167, 12); // GPS lock

    expect(fixes.map((f) => f.accuracy)).toEqual([1800, 85, 12]);
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ accuracy: 12, lat: 28.6315 }));
    expect(gps.activeWatches()).toBe(0);
  });

  it('asks for fresh high-accuracy positions rather than old cached ones', () => {
    acquirePosition({ onFix: vi.fn(), onDone: vi.fn(), onError: vi.fn() });
    const options = gps.api.watchPosition.mock.calls[0]![2]!;
    expect(options.enableHighAccuracy).toBe(true);
    expect(options.maximumAge).toBeLessThanOrEqual(5000);
  });

  it('falls back to a coarse network fix when GPS stays silent (e.g. indoors)', () => {
    const onFix = vi.fn();
    acquirePosition({ onFix, onDone: vi.fn(), onError: vi.fn() });
    vi.advanceTimersByTime(6000);
    expect(gps.gets).toHaveLength(1);
    expect(gps.gets[0]!.options?.enableHighAccuracy).toBe(false);
    gps.gets[0]!.ok(position(28.63, 77.21, 900));
    expect(onFix).toHaveBeenCalledWith(expect.objectContaining({ accuracy: 900 }));
  });

  it('finishes with the best fix it has when the wait runs out', () => {
    const onDone = vi.fn();
    acquirePosition({ onFix: vi.fn(), onDone, onError: vi.fn() }, { maxWaitMs: 15000 });
    gps.emit(28.63, 77.21, 140);
    vi.advanceTimersByTime(15000);
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ accuracy: 140 }));
    expect(gps.activeWatches()).toBe(0);
  });

  it('reports denial immediately and a timeout when nothing ever arrives', () => {
    const denied = vi.fn();
    acquirePosition({ onFix: vi.fn(), onDone: vi.fn(), onError: denied });
    gps.fail(1);
    expect(denied).toHaveBeenCalledWith(expect.objectContaining({ kind: 'denied' }));
    expect(gps.activeWatches()).toBe(0);

    const timedOut = vi.fn();
    acquirePosition({ onFix: vi.fn(), onDone: vi.fn(), onError: timedOut }, { maxWaitMs: 10000 });
    vi.advanceTimersByTime(10000);
    expect(timedOut).toHaveBeenCalledWith(expect.objectContaining({ kind: 'timeout' }));
  });

  it('keeps listening through a GPS timeout instead of failing early', () => {
    const onError = vi.fn();
    acquirePosition({ onFix: vi.fn(), onDone: vi.fn(), onError });
    gps.fail(3);
    expect(onError).not.toHaveBeenCalled();
    expect(gps.activeWatches()).toBe(1);
  });

  it('can be cancelled', () => {
    const onFix = vi.fn();
    const stop = acquirePosition({ onFix, onDone: vi.fn(), onError: vi.fn() });
    stop();
    gps.emit(28.63, 77.21, 10);
    vi.advanceTimersByTime(30000);
    expect(onFix).not.toHaveBeenCalled();
    expect(gps.activeWatches()).toBe(0);
  });
});
