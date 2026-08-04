import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { useAuth } from '@/lib/auth/auth-context';
import { wasSessionExpired } from '@/lib/api/auth-token';

/**
 * Authentication gate for the protected route tree. Runs BEFORE the RBAC
 * `RouteGuard` (authentication precedes authorization):
 *  - `loading`  → a centered boot spinner (no flash of login or app),
 *  - `unauthenticated` → redirect to `/login`, preserving the target as
 *    `?returnTo=` so the user lands where they meant to,
 *  - `authenticated` → render the protected tree.
 *
 * Redirects are declarative (off `status`), so an expired-session 401 — which
 * makes `AuthProvider` drop the session — automatically bounces the user here.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div
        className="bg-background grid min-h-svh place-items-center"
        role="status"
        aria-busy="true"
        aria-label="Oturum doğrulanıyor"
      >
        <Loader2 className="text-muted-foreground size-6 animate-spin" aria-hidden="true" />
        <span className="sr-only">Yükleniyor…</span>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    // A tokened 401 (expired/revoked) routes to the dedicated info page; a plain
    // "not signed in" goes to login preserving the target.
    if (wasSessionExpired()) return <Navigate to="/session-expired" replace />;
    const returnTo = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?returnTo=${returnTo}`} replace />;
  }

  return <>{children}</>;
}
