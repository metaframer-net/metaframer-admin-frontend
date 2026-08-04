import * as React from 'react';

import {
  DEFAULT_DASHBOARD_LAYOUT,
  loadDashboardLayout,
  saveDashboardLayout,
  type DashboardLayout,
  type DashPeriod,
  type DashSection,
  type WidgetId,
} from '@/config/dashboard-layout';

export interface UseDashboardLayout {
  layout: DashboardLayout;
  setSection: (section: DashSection) => void;
  setPeriod: (period: DashPeriod) => void;
  /** Hide a widget (across all sections) until re-added. */
  remove: (id: WidgetId) => void;
  /** Restore a hidden widget and move it to the end of the order. */
  add: (id: WidgetId) => void;
  /** Move `id` immediately before `beforeId` in the global order (end if null). */
  move: (id: WidgetId, beforeId: WidgetId | null) => void;
  /**
   * Keyboard-accessible reorder: shift `id` one slot earlier (-1) or later (+1)
   * among the currently visible widgets, preserving global order semantics.
   */
  nudge: (id: WidgetId, dir: -1 | 1, visibleIds: WidgetId[]) => void;
  /** Restore the default layout (order, hidden, section, period). */
  reset: () => void;
}

export interface UseDashboardLayoutOptions {
  /** Skip localStorage persistence (Storybook/tests). */
  persist?: boolean;
  /** Override initial layout (Storybook/tests). */
  initial?: Partial<DashboardLayout>;
}

/**
 * Per-user modular-dashboard state (active section, period, widget order, hidden
 * set) with localStorage persistence — mirrors `LayoutProvider`'s load/effect
 * pattern but scoped to this one page as a hook.
 */
export function useDashboardLayout(options?: UseDashboardLayoutOptions): UseDashboardLayout {
  const persist = options?.persist ?? true;
  const initial = options?.initial;

  const [layout, setLayout] = React.useState<DashboardLayout>(() => ({
    ...(persist ? loadDashboardLayout() : DEFAULT_DASHBOARD_LAYOUT),
    ...initial,
  }));

  React.useEffect(() => {
    if (persist) saveDashboardLayout(layout);
  }, [layout, persist]);

  return React.useMemo<UseDashboardLayout>(() => {
    const move = (id: WidgetId, beforeId: WidgetId | null) =>
      setLayout((l) => {
        const order = l.order.filter((x) => x !== id);
        const idx = beforeId ? order.indexOf(beforeId) : -1;
        const at = idx === -1 ? order.length : idx;
        order.splice(at, 0, id);
        return { ...l, order };
      });

    return {
      layout,
      setSection: (section) => setLayout((l) => ({ ...l, section })),
      setPeriod: (period) => setLayout((l) => ({ ...l, period })),
      remove: (id) =>
        setLayout((l) => (l.hidden.includes(id) ? l : { ...l, hidden: [...l.hidden, id] })),
      add: (id) =>
        setLayout((l) => ({
          ...l,
          hidden: l.hidden.filter((x) => x !== id),
          order: [...l.order.filter((x) => x !== id), id],
        })),
      move,
      nudge: (id, dir, visibleIds) => {
        const j = visibleIds.indexOf(id);
        const k = j + dir;
        if (j === -1 || k < 0 || k >= visibleIds.length) return;
        if (dir === -1) {
          move(id, visibleIds[k] ?? null); // land before the previous visible widget
        } else {
          move(id, visibleIds[k + 1] ?? null); // land before the one after the next → i.e. after it
        }
      },
      reset: () => setLayout(DEFAULT_DASHBOARD_LAYOUT),
    };
  }, [layout]);
}
