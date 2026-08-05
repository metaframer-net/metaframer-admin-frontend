import { useMemo } from 'react';

import { navSchema, type NavItem } from '@/config/nav-schema';
import { useSession } from '@/lib/permissions/permission-context';
import { canWith, type PermissionMatrix, type Role } from '@/lib/permissions/permissions';
import { getPermissionMatrix, usePermissionMatrix } from '@/lib/permissions/permission-store';

/** Keep items the role may access; recurse into children. Reads the live matrix. */
export function filterNavByRole(
  items: NavItem[],
  role: Role,
  matrix: PermissionMatrix = getPermissionMatrix(),
): NavItem[] {
  return items
    .filter((item) => !item.permission || canWith(matrix, role, item.permission))
    .map((item) =>
      item.children
        ? { ...item, children: filterNavByRole(item.children, role, matrix) }
        : item,
    );
}

/** The nav schema filtered to the current user's role (both shells + mobile). */
export function usePermittedNav(): NavItem[] {
  const { user } = useSession();
  const matrix = usePermissionMatrix();
  return useMemo(() => filterNavByRole(navSchema, user.role, matrix), [user.role, matrix]);
}

/** Whether a nav item is active for the current pathname (self or descendant route). */
export function isNavItemActive(to: string, pathname: string): boolean {
  if (to === '/') return pathname === '/';
  return pathname === to || pathname.startsWith(`${to}/`);
}

/**
 * The id of the single "current" navigable item for `pathname` — the leaf whose
 * `to` is the LONGEST prefix match. Only leaves (items without children) can be
 * current; group headers are toggles, never the highlighted page. This is what
 * fixes the double-active bug: on `/listings/moderation` only "Moderasyon
 * Kuyruğu" wins, not its parent "İlanlar" (and not sibling "Tüm İlanlar").
 */
export function findActiveItemId(items: NavItem[], pathname: string): string | null {
  let bestId: string | null = null;
  let bestLen = -1;
  const walk = (list: NavItem[]) => {
    for (const it of list) {
      if (!it.children && isNavItemActive(it.to, pathname) && it.to.length > bestLen) {
        bestId = it.id;
        bestLen = it.to.length;
      }
      if (it.children) walk(it.children);
    }
  };
  walk(items);
  return bestId;
}

/** The id of the top-level group that contains the active leaf, or `null`. */
export function findActiveGroupId(items: NavItem[], pathname: string): string | null {
  const activeId = findActiveItemId(items, pathname);
  if (!activeId) return null;
  for (const item of items) {
    if (item.children?.some((c) => c.id === activeId)) return item.id;
  }
  return null;
}

/** Primary items for the mobile bottom nav (<=5). */
export function usePrimaryNav(limit = 5): NavItem[] {
  const nav = usePermittedNav();
  return useMemo(() => nav.filter((i) => i.primary).slice(0, limit), [nav, limit]);
}
