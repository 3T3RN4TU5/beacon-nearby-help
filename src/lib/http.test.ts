import {
  HttpError,
  TimeoutError,
  fetchJson,
  isRetryable,
  paceHost,
  resetPacing,
  withFailover,
  withHedging,
} from './http';

describe('isRetryable', () => {
  it('retries capacity and network problems but not client errors', () => {
    expect(isRetryable(new HttpError(502, 'https://a'))).toBe(true);
    expect(isRetryable(new HttpError(429, 'https://a'))).toBe(true);
    expect(isRetryable(new TypeError('Failed to fetch'))).toBe(true);
    expect(isRetryable(new TimeoutError('https://a.test/x', 10))).toBe(true);
    expect(isRetryable(new HttpError(400, 'https://a'))).toBe(false);
    expect(isRetryable(new Error('boom'))).toBe(false);
  });
});

describe('withFailover', () => {
  it('moves through mirrors and returns the first success', async () => {
    const seen: string[] = [];
    const result = await withFailover(['a', 'b', 'c'], async (e) => {
      seen.push(e);
      if (e !== 'c') throw new HttpError(503, e);
      return 'ok';
    });
    expect(result).toBe('ok');
    expect(seen).toEqual(['a', 'b', 'c']);
  });

  it('throws non-retryable errors immediately', async () => {
    const run = vi.fn(async () => {
      throw new HttpError(400, 'x');
    });
    await expect(withFailover(['a', 'b'], run)).rejects.toBeInstanceOf(HttpError);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('backs off between rounds and gives up with the last error', async () => {
    vi.useFakeTimers();
    const run = vi.fn(async (e: string) => {
      throw new HttpError(502, e);
    });
    const promise = withFailover(['a'], run, { rounds: 3, backoffMs: 100 });
    const assertion = expect(promise).rejects.toMatchObject({ status: 502 });
    await vi.advanceTimersByTimeAsync(100 + 200);
    await assertion;
    expect(run).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });
});

describe('withHedging', () => {
  const deferred = <T>() => {
    let resolve!: (v: T) => void;
    let reject!: (e: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };

  it('races the next mirror when the first is slow, and aborts the loser', async () => {
    vi.useFakeTimers();
    const slow = deferred<string>();
    const signals: Record<string, AbortSignal> = {};
    const run = vi.fn((e: string, signal: AbortSignal) => {
      signals[e] = signal;
      return e === 'a' ? slow.promise : Promise.resolve(`from ${e}`);
    });
    const result = withHedging(['a', 'b', 'c'], run, { hedgeAfterMs: 1000 });
    await vi.advanceTimersByTimeAsync(999);
    expect(run).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await expect(result).resolves.toBe('from b');
    expect(signals.a!.aborted).toBe(true);
    expect(run).toHaveBeenCalledTimes(2); // c never needed
    vi.useRealTimers();
  });

  it('moves on immediately after a fast retryable failure', async () => {
    const run = vi.fn(async (e: string) => {
      if (e === 'a') throw new HttpError(429, e);
      return e;
    });
    await expect(withHedging(['a', 'b'], run, { hedgeAfterMs: 60_000 })).resolves.toBe('b');
  });

  it('rejects at once on a non-retryable error', async () => {
    const run = vi.fn(async (e: string) => {
      throw new HttpError(400, e);
    });
    await expect(withHedging(['a', 'b'], run)).rejects.toMatchObject({ status: 400 });
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('retries a whole round after backoff when every mirror fails', async () => {
    vi.useFakeTimers();
    let calls = 0;
    const run = vi.fn(async (e: string) => {
      calls++;
      if (calls <= 2) throw new HttpError(504, e);
      return 'ok';
    });
    const result = withHedging(['a', 'b'], run, { rounds: 2, backoffMs: 500 });
    await vi.advanceTimersByTimeAsync(500);
    await expect(result).resolves.toBe('ok');
    expect(calls).toBe(3);
    vi.useRealTimers();
  });

  it('honours cancellation', async () => {
    const controller = new AbortController();
    const run = vi.fn(() => new Promise<string>(() => undefined));
    const result = withHedging(['a'], run, { signal: controller.signal });
    controller.abort();
    await expect(result).rejects.toBeDefined();
  });
});

describe('fetchJson', () => {
  it('raises HttpError on non-2xx', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('nope', { status: 404 }));
    await expect(fetchJson('https://api.test/x')).rejects.toMatchObject({ name: 'HttpError', status: 404 });
  });

  it('times out slow requests with a TimeoutError', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      (_u, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        }),
    );
    await expect(fetchJson('https://slow.test/x', { timeoutMs: 20 })).rejects.toBeInstanceOf(TimeoutError);
  });
});

describe('paceHost', () => {
  it('spaces requests to the same host', async () => {
    resetPacing();
    vi.useFakeTimers();
    const order: number[] = [];
    const start = Date.now();
    const a = paceHost('osrm', 1000).then(() => order.push(Date.now() - start));
    const b = paceHost('osrm', 1000).then(() => order.push(Date.now() - start));
    const c = paceHost('other', 1000).then(() => order.push(Date.now() - start));
    await vi.advanceTimersByTimeAsync(1000);
    await Promise.all([a, b, c]);
    expect(order).toEqual([0, 0, 1000]);
    vi.useRealTimers();
  });
});
