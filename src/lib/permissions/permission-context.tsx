import * as React from 'react';

import { canWith, type Permission, type Role } from './permissions';
import { usePermissionMatrix } from './permission-store';
import { useAuthOptional, type SessionUser } from '@/lib/auth/auth-context';

// Canonical user shape lives in lib/auth; re-exported here so existing imports
// (`SessionUser` from permission-context) keep working.
export type { SessionUser };

export interface SessionContextValue {
  user: SessionUser;
  setRole: (role: Role) => void;
}

/**
 * Fallback user used ONLY when no real session is available — i.e. isolated
 * tests/stories that render `SessionProvider` without an `AuthProvider`, or the
 * brief pre-auth window (which the routed `AuthGate` keeps off-screen anyway, so
 * a real unauthenticated user never sees it). In the running app the user comes
 * from `AuthProvider` via `GET /auth/me`.
 */
const DEFAULT_USER: SessionUser = {
  id: 'u-1',
  name: 'Ahmet Yönetici',
  email: 'ahmet@arsam.net',
  role: 'super-admin',
};

const SessionContext = React.createContext<SessionContextValue | null>(null);

export interface SessionProviderProps {
  children: React.ReactNode;
  /** Force a user (tests/stories). Takes precedence over the auth session. */
  initialUser?: Partial<SessionUser>;
}

/**
 * Bridges the authenticated user into the RBAC layer. The `user`/`setRole`
 * surface is unchanged from before real auth landed, so every consumer
 * (`useSession`, nav filtering, `RouteGuard`, `UserMenu`, command surfaces)
 * works untouched. Source of the user, by precedence:
 *   1. `initialUser` prop (tests/stories),
 *   2. the live `AuthProvider` session (the real app),
 *   3. `DEFAULT_USER` (no provider — isolated rendering).
 * `setRole` remains a dev/preview role switch, overlaid on top of the base user.
 */
export function SessionProvider({ children, initialUser }: SessionProviderProps) {
  const auth = useAuthOptional();
  const base = React.useMemo<SessionUser>(() => {
    if (initialUser) return { ...DEFAULT_USER, ...initialUser };
    if (auth?.user) return auth.user;
    return DEFAULT_USER;
  }, [initialUser, auth?.user]);

  const [roleOverride, setRoleOverride] = React.useState<Role | null>(null);

  const value = React.useMemo<SessionContextValue>(() => {
    const user = roleOverride ? { ...base, role: roleOverride } : base;
    return { user, setRole: (role: Role) => setRoleOverride(role) };
  }, [base, roleOverride]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = React.useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}

/** Returns whether the current user holds a permission (or a predicate helper). */
export function usePermission(permission?: Permission): boolean {
  const { user } = useSession();
  const matrix = usePermissionMatrix();
  if (!permission) return true;
  return canWith(matrix, user.role, permission);
}

export interface CanProps {
  permission: Permission;
  children: React.ReactNode;
  /** Rendered when the permission is absent (default: nothing). */
  fallback?: React.ReactNode;
}

/** Conditionally renders children when the current user has `permission`. */
export function Can({ permission, children, fallback = null }: CanProps) {
  const allowed = usePermission(permission);
  return <>{allowed ? children : fallback}</>;
}
