/**
 * RBAC model — source: docs/PERMISSIONS.md.
 * A user has exactly one primary role; roles map to permission sets.
 */
export type Role = 'super-admin' | 'moderator' | 'support' | 'finance' | 'analyst';

/** `resource.action`, e.g. `listing.approve`. */
export type Permission = `${string}.${string}`;

export type PermissionMatrix = Record<Role, Permission[] | '*'>;

export const matrix: PermissionMatrix = {
  'super-admin': '*',
  moderator: [
    'listing.view',
    'listing.approve',
    'listing.reject',
    'listing.edit',
    'message.moderate',
    'report.view',
  ],
  support: [
    'user.view',
    'user.verify',
    'user.suspend',
    'user.ban',
    'user.unban',
    'agent.verify',
    'message.moderate',
    'listing.view',
  ],
  finance: ['promotion.sell', 'payment.refund', 'report.view', 'listing.view'],
  analyst: ['report.view', 'listing.view', 'audit.view'],
};

/** Pure permission check against an explicit matrix (the runtime-editable copy). */
export function canWith(m: PermissionMatrix, role: Role, permission: Permission): boolean {
  const set = m[role];
  return set === '*' || set.includes(permission);
}

export const ROLES: Role[] = ['super-admin', 'moderator', 'support', 'finance', 'analyst'];

export const ROLE_LABELS: Record<Role, string> = {
  'super-admin': 'Süper Admin',
  moderator: 'Moderatör',
  support: 'Destek',
  finance: 'Finans',
  analyst: 'Analist',
};
