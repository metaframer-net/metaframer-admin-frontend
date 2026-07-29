import * as React from 'react';

import { api } from '@/lib/api/client';
import {
  clearAuthToken,
  getAuthToken,
  setAuthToken,
  UNAUTHORIZED_EVENT,
} from '@/lib/api/auth-token';
import type { Role } from '@/lib/permissions/permissions';

/**
 * The signed-in admin. Canonical shape lives here (lib/auth) so both the RBAC
 * session bridge (permission-context) and the API layer can reference it without
 * a feature-module import. `email` powers the user menu; `role` feeds RBAC.
 */
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  status: AuthStatus;
  user: SessionUser | null;
  /** Persist the token + mark authenticated (called by the login mutation). */
  setSession: (token: string, user: SessionUser) => void;
  /** Drop the token + mark unauthenticated (logout, or an expired-session 401). */
  clearSession: () => void;
  /** Rotate the session token (mock refresh); no-op when signed out. */
  refreshSession: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

interface AuthState {
  status: AuthStatus;
  user: SessionUser | null;
}

export interface AuthProviderProps {
  children: React.ReactNode;
  /**
   * Force an initial state and SKIP the boot fetch — for Storybook/tests that
   * need a deterministic session without a network round-trip. In the real app
   * this is omitted, so the provider boots from the persisted token.
   */
  initialState?: AuthState;
}

/**
 * Owns the authentication lifecycle. On boot: if a token is persisted, it
 * validates it via `GET /auth/me` (restoring the session across reloads);
 * otherwise it settles immediately as `unauthenticated` with no request. It also
 * listens for the client's `UNAUTHORIZED_EVENT` (a 401 on an authenticated
 * request) and drops the session — the routed `AuthGate` reacts by redirecting.
 *
 * This provider owns state ONLY; it performs no navigation (it renders above the
 * router). Redirects are declarative, done by `AuthGate` off `status`.
 */
export function AuthProvider({ children, initialState }: AuthProviderProps) {
  const [state, setState] = React.useState<AuthState>(
    () => initialState ?? { status: getAuthToken() ? 'loading' : 'unauthenticated', user: null },
  );

  const setSession = React.useCallback((token: string, user: SessionUser) => {
    setAuthToken(token);
    setState({ status: 'authenticated', user });
  }, []);

  const clearSession = React.useCallback(() => {
    clearAuthToken();
    setState({ status: 'unauthenticated', user: null });
  }, []);

  const refreshSession = React.useCallback(async () => {
    if (!getAuthToken()) return;
    try {
      const { token } = await api.post<{ token: string }>('/auth/refresh');
      setAuthToken(token);
    } catch {
      // A failed refresh surfaces as a 401 on the next request → UNAUTHORIZED_EVENT.
    }
  }, []);

  // Boot: validate a persisted token exactly once. Skipped when a caller injects
  // `initialState` (stories/tests) or when there is no token to validate.
  React.useEffect(() => {
    if (initialState) return;
    if (!getAuthToken()) return;
    let cancelled = false;
    api
      .get<SessionUser>('/auth/me')
      .then((user) => {
        if (!cancelled) setState({ status: 'authenticated', user });
      })
      .catch(() => {
        if (!cancelled) {
          clearAuthToken();
          setState({ status: 'unauthenticated', user: null });
        }
      });
    return () => {
      cancelled = true;
    };
    // Run once on mount; `initialState` is a static config, not a live input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Drop the session when the client reports an expired/revoked token.
  React.useEffect(() => {
    const onUnauthorized = () => clearSession();
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [clearSession]);

  // Rotate the token when the tab regains focus (session hardening). NOTE: the
  // mock backend revokes the previous token on refresh, so with multiple open
  // tabs the non-focused ones will 401 on their next request and get signed out.
  // The real FastAPI backend (or a `storage`-event sync) would coordinate this;
  // acceptable for the single-admin mock.
  React.useEffect(() => {
    const onVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void refreshSession();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refreshSession]);

  const value = React.useMemo<AuthContextValue>(
    () => ({ status: state.status, user: state.user, setSession, clearSession, refreshSession }),
    [state, setSession, clearSession, refreshSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Auth context; throws outside an `AuthProvider`. */
export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

/**
 * Auth context or `null` when no provider is mounted. Used by the RBAC session
 * bridge, which must also work in isolated tests/stories that render
 * `SessionProvider` without an `AuthProvider`.
 */
export function useAuthOptional(): AuthContextValue | null {
  return React.useContext(AuthContext);
}
