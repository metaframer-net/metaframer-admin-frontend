/**
 * Auth token storage — the single source for the bearer token, shared by the
 * API client (request injection + 401 handling) and the auth context (session
 * lifecycle). Kept in `lib/api` so the client never imports a feature module.
 *
 * MOCK NOTE: the token is an opaque mock string minted by the MSW `/auth/login`
 * handler; there is no real JWT until the FastAPI backend lands. It is persisted
 * in `localStorage` so a page reload restores the session (see AuthProvider boot).
 */
const TOKEN_KEY = 'arsam.auth.token';

// In-memory fallback for environments without a usable Storage (some jsdom/test
// setups expose a partial localStorage). The real browser always uses localStorage.
let memoryToken: string | null = null;

/**
 * Return `window.localStorage` only when it is a fully usable Storage (all three
 * methods present); otherwise null so callers fall back to the memory store.
 * Access is wrapped because some environments throw on the property getter.
 */
function safeStorage(): Storage | null {
  try {
    const ls = typeof window !== 'undefined' ? window.localStorage : null;
    if (
      ls &&
      typeof ls.getItem === 'function' &&
      typeof ls.setItem === 'function' &&
      typeof ls.removeItem === 'function'
    ) {
      return ls;
    }
  } catch {
    /* access denied — fall through to memory */
  }
  return null;
}

export function getAuthToken(): string | null {
  const storage = safeStorage();
  return storage ? storage.getItem(TOKEN_KEY) : memoryToken;
}

export function setAuthToken(token: string): void {
  memoryToken = token;
  safeStorage()?.setItem(TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  memoryToken = null;
  safeStorage()?.removeItem(TOKEN_KEY);
}

/**
 * Event dispatched by the API client when an authenticated request is rejected
 * with 401 (an expired/invalid token). The AuthProvider listens and drops the
 * session; the routed AuthGate then redirects to `/login`. Decoupled on purpose
 * so the client (lib) never depends on the router or the auth context.
 */
export const UNAUTHORIZED_EVENT = 'arsam:auth:unauthorized';

// Distinguishes "the session expired" (a tokened 401) from "never signed in", so
// the AuthGate can route to /session-expired vs /login. Consumed by the page.
let sessionExpiredFlag = false;
export function markSessionExpired(): void {
  sessionExpiredFlag = true;
}
export function wasSessionExpired(): boolean {
  return sessionExpiredFlag;
}
export function clearSessionExpired(): void {
  sessionExpiredFlag = false;
}

export function emitUnauthorized(): void {
  markSessionExpired();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }
}
