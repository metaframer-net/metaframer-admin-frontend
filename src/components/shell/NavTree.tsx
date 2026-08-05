import { useId, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'motion/react';

import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { NavItem } from '@/config/nav-schema';
import { findActiveGroupId, findActiveItemId, isNavItemActive } from './nav-utils';

/** Shared easing — matches the approved mockup's "easy-easy" feel. */
const EASE = [0.32, 0.72, 0, 1] as const;

export interface NavTreeProps {
  items: NavItem[];
  /** Collapsed sidebar: icon-only with tooltips (no accordion). */
  collapsed?: boolean;
  /** Called after navigating (e.g., close the mobile drawer). */
  onNavigate?: () => void;
}

/**
 * Vertical navigation shared by the sidebar and the mobile drawer.
 *
 * - Single-open accordion: opening a group closes the others; the group holding
 *   the active route auto-opens on navigation.
 * - Exactly ONE row is "current" (the longest-prefix leaf match), so the parent
 *   group header never lights up as a page — it only shows a primary dot.
 * - The active pill is a single shared element (`layoutId`) that SLIDES between
 *   rows; a unique id per instance keeps the sidebar/drawer pills independent.
 */
export function NavTree({ items, collapsed = false, onNavigate }: NavTreeProps) {
  const { pathname } = useLocation();
  const uid = useId();
  const pillId = `${uid}-nav-pill`;

  const activeItemId = findActiveItemId(items, pathname);
  const activeGroupId = findActiveGroupId(items, pathname);
  const [openId, setOpenId] = useState<string | null>(activeGroupId);

  // Follow navigation: auto-open the active section (and close the rest). Adjust
  // state during render on change — React's sanctioned alternative to a
  // setState-in-effect, with no cascading-render lint warning.
  const [prevGroup, setPrevGroup] = useState(activeGroupId);
  if (prevGroup !== activeGroupId) {
    setPrevGroup(activeGroupId);
    setOpenId(activeGroupId);
  }

  return (
    // LayoutGroup lets the shared pill re-measure against the accordion's
    // height changes, so the slide stays in sync when a section expands.
    <LayoutGroup id={uid}>
      <nav className="flex flex-col gap-1" aria-label="Ana gezinme">
        {items.map((item) => (
          <NavGroup
            key={item.id}
            item={item}
            collapsed={collapsed}
            activeItemId={activeItemId}
            pathname={pathname}
            open={openId === item.id}
            onToggle={() => setOpenId((prev) => (prev === item.id ? null : item.id))}
            pillId={pillId}
            onNavigate={onNavigate}
          />
        ))}
      </nav>
    </LayoutGroup>
  );
}

function NavGroup({
  item,
  collapsed,
  activeItemId,
  pathname,
  open,
  onToggle,
  pillId,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  activeItemId: string | null;
  pathname: string;
  open: boolean;
  onToggle: () => void;
  pillId: string;
  onNavigate: (() => void) | undefined;
}) {
  const reduce = useReducedMotion();
  // Local narrowing (not a `!` assertion): collapsed sidebars render every item
  // as a flat icon link, so children only matter when expanded.
  const children = collapsed ? undefined : item.children;

  // A leaf / top-level item (or any item while collapsed): plain nav row.
  if (!children || children.length === 0) {
    const current = collapsed ? isNavItemActive(item.to, pathname) : activeItemId === item.id;
    return <NavRow item={item} collapsed={collapsed} current={current} pillId={pillId} onNavigate={onNavigate} />;
  }

  const hasActiveChild = children.some((c) => c.id === activeItemId);
  const Icon = item.icon;
  const panelId = `${item.id}-panel`;

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        data-action="toggle-nav-group"
        data-entity={item.aiEntity ?? 'module'}
        className={cn(
          'group flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium outline-none transition-colors',
          'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          'focus-visible:ring-sidebar-ring focus-visible:ring-2',
          hasActiveChild && 'text-sidebar-primary hover:text-sidebar-primary',
        )}
      >
        <Icon className={cn('size-4 shrink-0', hasActiveChild && 'text-sidebar-primary')} aria-hidden="true" />
        <span className="flex-1 truncate text-left">{item.label}</span>
        {hasActiveChild && <span className="bg-sidebar-primary size-1.5 shrink-0 rounded-full" aria-hidden="true" />}
        <ChevronDown
          className={cn(
            'text-sidebar-primary size-4 shrink-0 transition-transform duration-200',
            !open && '-rotate-90',
          )}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="children"
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={reduce ? { duration: 0 } : { duration: 0.3, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="border-sidebar-border mt-1 ml-4 flex flex-col gap-0.5 border-l pl-3">
              {children.map((child) => (
                <NavRow
                  key={child.id}
                  item={child}
                  collapsed={false}
                  current={activeItemId === child.id}
                  pillId={pillId}
                  onNavigate={onNavigate}
                  nested
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavRow({
  item,
  collapsed,
  current,
  pillId,
  onNavigate,
  nested = false,
}: {
  item: NavItem;
  collapsed: boolean;
  current: boolean;
  pillId: string;
  onNavigate: (() => void) | undefined;
  nested?: boolean;
}) {
  const reduce = useReducedMotion();
  const Icon = item.icon;
  const link = (
    // Plain Link (not NavLink): active state comes from our longest-prefix
    // best-match, so aria-current lands on exactly one row — NavLink's built-in
    // prefix matching would also flag the parent-equivalent leaf.
    <Link
      to={item.to}
      onClick={onNavigate}
      // Collapsed rows show only an aria-hidden icon, so the label must come
      // from aria-label — the Tooltip supplies a description, not a name.
      aria-label={collapsed ? item.label : undefined}
      aria-current={current ? 'page' : undefined}
      data-action="navigate"
      data-entity={item.aiEntity ?? 'module'}
      className={cn(
        'group relative flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium outline-none transition-colors',
        'focus-visible:ring-sidebar-ring focus-visible:ring-2',
        current
          ? 'text-sidebar-primary-foreground'
          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        collapsed && 'justify-center px-0',
        nested && 'h-9 text-[0.8125rem] font-normal',
      )}
    >
      {current && (
        <motion.span
          layoutId={pillId}
          aria-hidden="true"
          className="bg-sidebar-primary absolute inset-0 z-0 rounded-md"
          transition={reduce ? { duration: 0 } : { type: 'tween', duration: 0.28, ease: EASE }}
        />
      )}
      <Icon className={cn('relative z-10 size-4 shrink-0', nested && 'size-3.5')} aria-hidden="true" />
      {!collapsed && <span className="relative z-10 truncate">{item.label}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }
  return link;
}
