import type { ListQuery, Paginated } from './types';
import { emitUnauthorized, getAuthToken } from './auth-token';

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

async function request<T>(path: string, options: RequestOptions): Promise<T> {
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
    // A 401 while a token was attached means the session expired/was revoked.
    // Signal the auth layer to drop it (the routed AuthGate then redirects to
    // /login). Bad-credential 401s on /auth/login carry no token, so they never
    // trip this — they surface to the login mutation as an ApiError instead.
    if (res.status === 401 && token) emitUnauthorized();
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
