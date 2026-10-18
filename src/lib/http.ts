/**
 * Small, dependency-free HTTP layer for talking to free public APIs.
 *
 * Public OSM infrastructure (Overpass, OSRM demo, Nominatim) is donated capacity with
 * fair-use limits and is regularly "at capacity". Everything here exists so the app degrades
 * gracefully instead of failing: hard timeouts, per-host pacing, mirror failover and
 * exponential backoff that respects cancellation.
 */

export class HttpError extends Error {
  readonly status: number;
  readonly url: string;
  constructor(status: number, url: string, message?: string) {
    super(message ?? `Request failed with ${status}`);
    this.name = 'HttpError';
    this.status = status;
    this.url = url;
  }
}

export class TimeoutError extends Error {
  constructor(url: string, ms: number) {
    super(`Request to ${new URL(url).host} timed out after ${ms} ms`);
    this.name = 'TimeoutError';
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

/** Errors worth retrying on another mirror or after a pause. 4xx (other than 406/408/429) are our fault. */
export function isRetryable(error: unknown): boolean {
  if (error instanceof TimeoutError) return true;
  if (error instanceof HttpError) {
    return error.status >= 500 || error.status === 429 || error.status === 408 || error.status === 406;
  }
  // fetch() rejects with TypeError on network failure / CORS / DNS.
  return error instanceof TypeError;
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
    const id = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(id);
      reject(signal?.reason ?? new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/* ---------------------------------------------------------------- per-host pacing */

const nextSlotByHost = new Map<string, number>();

/**
 * Reserve the next request slot for a host so calls are spaced at least `intervalMs` apart.
 * OSRM's demo server and Nominatim both ask for at most one request per second.
 */
export async function paceHost(host: string, intervalMs: number, signal?: AbortSignal): Promise<void> {
  const now = Date.now();
  const slot = Math.max(now, nextSlotByHost.get(host) ?? 0);
  nextSlotByHost.set(host, slot + intervalMs);
  if (slot > now) await sleep(slot - now, signal);
}

/** Test helper. */
export function resetPacing(): void {
  nextSlotByHost.clear();
}

/* ---------------------------------------------------------------- fetch */

export interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: BodyInit;
  headers?: Record<string, string>;
  timeoutMs?: number;
  signal?: AbortSignal;
  /** Minimum spacing between requests to this URL's host. */
  paceMs?: number;
}

export async function fetchJson<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers, timeoutMs = 15_000, signal, paceMs } = options;
  if (paceMs) await paceHost(new URL(url).host, paceMs, signal);

  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(new TimeoutError(url, timeoutMs)), timeoutMs);
  const onOuterAbort = () => timeout.abort(signal?.reason);
  signal?.addEventListener('abort', onOuterAbort, { once: true });

  try {
    const res = await fetch(url, { method, body, headers, signal: timeout.signal });
    if (!res.ok) throw new HttpError(res.status, url);
    return (await res.json()) as T;
  } catch (error) {
    // Surface our own timeout instead of the generic AbortError it triggers.
    if (timeout.signal.reason instanceof TimeoutError && !signal?.aborted) throw timeout.signal.reason;
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onOuterAbort);
  }
}

/* ---------------------------------------------------------------- hedging */

export interface HedgeOptions {
  signal?: AbortSignal;
  /** Start the next mirror if the current attempt hasn't answered within this time. */
  hedgeAfterMs?: number;
  rounds?: number;
  backoffMs?: number;
  onAttemptFailed?: (endpoint: string, error: unknown) => void;
}

/**
 * Hedged requests: query the preferred mirror; if it is slow, race the next one too, and on a
 * fast failure move on immediately. The first success wins and the losers are aborted. This
 * bounds tail latency without hammering every mirror on every request.
 */
export async function withHedging<T>(
  endpoints: readonly string[],
  run: (endpoint: string, signal: AbortSignal) => Promise<T>,
  { signal, hedgeAfterMs = 6000, rounds = 2, backoffMs = 1500, onAttemptFailed }: HedgeOptions = {},
): Promise<T> {
  if (endpoints.length === 0) throw new Error('withHedging: no endpoints');
  let lastError: unknown;
  for (let round = 0; round < rounds; round++) {
    if (round > 0) await sleep(backoffMs * 2 ** (round - 1), signal);
    try {
      return await hedgeRound(endpoints, run, hedgeAfterMs, signal, onAttemptFailed);
    } catch (error) {
      if (signal?.aborted || !isRetryable(error)) throw error;
      lastError = error;
    }
  }
  throw lastError;
}

function hedgeRound<T>(
  endpoints: readonly string[],
  run: (endpoint: string, signal: AbortSignal) => Promise<T>,
  hedgeAfterMs: number,
  signal: AbortSignal | undefined,
  onAttemptFailed: HedgeOptions['onAttemptFailed'],
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const attempts: AbortController[] = [];
    let next = 0;
    let inFlight = 0;
    let settled = false;
    let lastError: unknown;
    let hedgeTimer: ReturnType<typeof setTimeout> | undefined;

    const settle = () => {
      settled = true;
      clearTimeout(hedgeTimer);
      attempts.forEach((a) => a.abort());
      signal?.removeEventListener('abort', onAbort);
    };
    const onAbort = () => {
      if (settled) return;
      settle();
      reject(signal?.reason ?? new DOMException('Aborted', 'AbortError'));
    };
    if (signal?.aborted) return onAbort();
    signal?.addEventListener('abort', onAbort, { once: true });

    const launch = () => {
      if (settled || next >= endpoints.length) return;
      const endpoint = endpoints[next++]!;
      const attempt = new AbortController();
      attempts.push(attempt);
      inFlight++;
      clearTimeout(hedgeTimer);
      if (next < endpoints.length) hedgeTimer = setTimeout(launch, hedgeAfterMs);

      run(endpoint, attempt.signal).then(
        (value) => {
          if (settled) return;
          settle();
          resolve(value);
        },
        (error: unknown) => {
          inFlight--;
          if (settled) return;
          if (!isRetryable(error)) {
            settle();
            return reject(error);
          }
          lastError = error;
          onAttemptFailed?.(endpoint, error);
          if (next < endpoints.length) launch();
          else if (inFlight === 0) {
            settle();
            reject(lastError);
          }
        },
      );
    };
    launch();
  });
}

/* ---------------------------------------------------------------- failover */

export interface FailoverOptions {
  signal?: AbortSignal;
  /** Full passes over the endpoint list before giving up. */
  rounds?: number;
  /** Base pause between rounds; doubles each round. */
  backoffMs?: number;
  onAttemptFailed?: (endpoint: string, error: unknown) => void;
}

/**
 * Try `run` against each endpoint in order; on a retryable failure move to the next mirror,
 * and after a full pass back off exponentially. Non-retryable errors are thrown immediately.
 */
export async function withFailover<T>(
  endpoints: readonly string[],
  run: (endpoint: string) => Promise<T>,
  { signal, rounds = 2, backoffMs = 1200, onAttemptFailed }: FailoverOptions = {},
): Promise<T> {
  if (endpoints.length === 0) throw new Error('withFailover: no endpoints');
  let lastError: unknown;
  for (let round = 0; round < rounds; round++) {
    if (round > 0) await sleep(backoffMs * 2 ** (round - 1), signal);
    for (const endpoint of endpoints) {
      if (signal?.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError');
      try {
        return await run(endpoint);
      } catch (error) {
        if (isAbortError(error) && signal?.aborted) throw error;
        if (!isRetryable(error)) throw error;
        lastError = error;
        onAttemptFailed?.(endpoint, error);
      }
    }
  }
  throw lastError;
}
