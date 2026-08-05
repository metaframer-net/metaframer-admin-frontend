import type { ListQuery, Paginated } from './types';
import { emitUnauthorized, getAuthToken, setAuthToken } from './auth-token';

/** Base URL for the REST API. MSW intercepts this prefix in dev/test. */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

function buildUrl(path: string, search?: URLSearchParams): string {
  const base = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const qs = search?.toString();
  return qs ? `${base}?${qs}` : base;
}

interface RequestOptions {
  method: string;
  search?: URLSearchParams | undefined;
  body?: string | undefined;
  headers?: Record<string, string> | undefined;
}

/**
 * Endpoints where a 401 is a credential/challenge check (a wrong password or 2FA
 * code) submitted under a STILL-VALID session — not an expired session. Their
 * 401 must surface to the caller as an ApiError without a silent refresh or a
 * session drop; otherwise a mistyped password/code in the lock modal or the 2FA
 * enable flow would bounce the user out of the app entirely.
 */
const CREDENTIAL_CHALLENGE_PATHS = new Set(['/auth/reauth', '/auth/2fa/enable']);

/**
 * A single in-flight token refresh, shared by every request that hits a 401 at
 * the same time. Deduped so concurrent 401s trigger ONE `/auth/refresh` (each
 * refresh rotates the token, so parallel refreshes would revoke each other).
 */
let refreshInFlight: Promise<boolean> | null = null;

/**
 * Silently rotate the bearer token via `/auth/refresh`. Uses a raw fetch (not the
 * `api` helpers) so it never recurses through the 401 handler. Resolves true when
 * a fresh token was stored, false when refresh is not possible (drop the session).
 */
function refreshAuthToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  const token = getAuthToken();
  if (!token) return Promise.resolve(false);
  refreshInFlight = (async () => {
    try {
      const res = await fetch(buildUrl('/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return false;
      const data = (await res.json()) as { token?: unknown };
      if (typeof data.token !== 'string') return false;
      setAuthToken(data.token);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

async function request<T>(path: string, options: RequestOptions, retried = false): Promise<T> {
  const { search, body, headers, method } = options;
  // Inject the bearer token on every request when a session exists. MSW (and,
  // later, FastAPI) reads it to resolve the current user; unauthenticated
  // requests (e.g. POST /auth/login) simply omit the header.
  const token = getAuthToken();
  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers ?? {}),
    },
  };
  if (body !== undefined) init.body = body;
  const res = await fetch(buildUrl(path, search), init);
  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = undefined;
    }
    // A 401 while a token was attached means the session may have expired/rotated.
    // Try ONE silent refresh + retry before giving up, so a transient token race
    // (e.g. rotation on tab focus) doesn't bounce the user. Only if that also
    // fails do we signal the auth layer to drop the session (the routed AuthGate
    // then redirects to /session-expired). `/auth/refresh` itself is never
    // retried, avoiding a loop. Bad-credential 401s on /auth/login carry no token,
    // so they never trip this — they surface to the login mutation as an ApiError.
    if (res.status === 401 && token && !CREDENTIAL_CHALLENGE_PATHS.has(path)) {
      if (!retried && path !== '/auth/refresh') {
        const refreshed = await refreshAuthToken();
        if (refreshed) return request<T>(path, options, true);
      }
      emitUnauthorized();
    }
    throw new ApiError(res.status, `Request failed: ${res.status} ${res.statusText}`, body);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Encode a `ListQuery` into URL search params per the resource contract. */
export function encodeListQuery(query: ListQuery): URLSearchParams {
  const params = new URLSearchParams();
  params.set('page', String(query.page));
  params.set('pageSize', String(query.pageSize));
  if (query.sort?.length) {
    params.set('sort', query.sort.map((s) => `${s.id}:${s.desc ? 'desc' : 'asc'}`).join(','));
  }
  if (query.filters) {
    for (const [key, value] of Object.entries(query.filters)) {
      if (Array.isArray(value)) {
        for (const v of value) params.append(key, v);
      } else if (value !== '') {
        params.set(key, value);
      }
    }
  }
  return params;
}

export const api = {
  get: <T>(path: string, search?: URLSearchParams) => request<T>(path, { method: 'GET', search }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body === undefined ? undefined : JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  /** List helper returning the paginated envelope. */
  list: <T>(resource: string, query: ListQuery) =>
    request<Paginated<T>>(`/${resource}`, { method: 'GET', search: encodeListQuery(query) }),
} as const;
