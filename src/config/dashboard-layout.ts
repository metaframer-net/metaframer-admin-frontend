/**
 * Modular dashboard layout contract — single source of truth for the bento
 * dashboard's per-user personalization (active section, period, widget order,
 * hidden widgets). Persistence is localStorage now; swap to an API later behind
 * this same interface (load/save signatures stay stable), mirroring
 * `src/config/layout.ts`.
 */

/** The four dashboard sections (tabs). */
export const DASH_SECTIONS = ['genel', 'moderasyon', 'gelir', 'trafik'] as const;
export type DashSection = (typeof DASH_SECTIONS)[number];

/** Time window the period-scoped KPIs report over. */
export const DASH_PERIODS = ['today', '7d', '30d'] as const;
export type DashPeriod = (typeof DASH_PERIODS)[number];

/**
 * Canonical widget id registry — the SINGLE source of truth for which widgets
 * exist. The visual registry (`components/widget-registry.tsx`) must supply
 * exactly one definition per id (enforced by a `Record<WidgetId, …>` type), and
 * persisted layouts are filtered against this list so a removed/renamed widget
 * in a stored payload is silently dropped instead of crashing the grid.
 */
export const WIDGET_IDS = [
  // Genel + shared
  'total-listings',
  'pending-moderation',
  'published',
  'revenue',
  'category-breakdown',
  'status-donut',
  'pending-queue',
  'recent-decisions',
  'top-viewed',
  'quick-access',
  // Moderasyon
  'avg-moderation-time',
  'approval-rate',
  'active-moderators',
  'queue-aging',
  'decision-trend',
  'moderator-performance',
  'risk-signals',
  // Gelir
  'arpu',
  'payment-count',
  'paid-conversion',
  'revenue-trend',
  'revenue-breakdown',
  'top-agents',
  'product-mix',
  // Trafik
  'visits',
  'listing-views',
  'unique-visitors',
  'avg-session',
  'traffic-trend',
  'traffic-source',
  'top-searches',
  'device-mix',
] as const;
export type WidgetId = (typeof WIDGET_IDS)[number];

export interface DashboardLayout {
  /** Active section tab. */
  section: DashSection;
  /** Selected reporting period for period-scoped KPIs. */
  period: DashPeriod;
  /** Global widget order (ids). Unknown ids are dropped; missing ids append in registry order. */
  order: WidgetId[];
  /** Widgets the user removed (hidden across all sections until re-added). */
  hidden: WidgetId[];
}

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = {
  section: 'genel',
  period: 'today',
  order: [...WIDGET_IDS],
  hidden: [],
};

export const DASHBOARD_STORAGE_KEY = 'arsam.dashboard.v1';

const WIDGET_ID_SET = new Set<string>(WIDGET_IDS);
function isWidgetId(v: unknown): v is WidgetId {
  return typeof v === 'string' && WIDGET_ID_SET.has(v);
}
function isSection(v: unknown): v is DashSection {
  return DASH_SECTIONS.includes(v as DashSection);
}
function isPeriod(v: unknown): v is DashPeriod {
  return DASH_PERIODS.includes(v as DashPeriod);
}

/**
 * Reconcile a (possibly partial/stale) id list against the registry: keep known
 * ids in their stored order (de-duplicated), then append any registry ids the
 * payload never mentioned — so a build that ADDS a widget shows it immediately
 * for returning users, and one that REMOVES a widget drops it cleanly.
 */
function reconcileOrder(stored: unknown): WidgetId[] {
  const seen = new Set<WidgetId>();
  const out: WidgetId[] = [];
  if (Array.isArray(stored)) {
    for (const v of stored) {
      if (isWidgetId(v) && !seen.has(v)) {
        seen.add(v);
        out.push(v);
      }
    }
  }
  for (const id of WIDGET_IDS) {
    if (!seen.has(id)) out.push(id);
  }
  return out;
}

function parseLayout(raw: string): DashboardLayout {
  const parsed = JSON.parse(raw) as Partial<Record<keyof DashboardLayout, unknown>>;
  const hidden = Array.isArray(parsed.hidden) ? parsed.hidden.filter(isWidgetId) : [];
  return {
    section: isSection(parsed.section) ? parsed.section : DEFAULT_DASHBOARD_LAYOUT.section,
    period: isPeriod(parsed.period) ? parsed.period : DEFAULT_DASHBOARD_LAYOUT.period,
    order: reconcileOrder(parsed.order),
    hidden: [...new Set(hidden)],
  };
}

/** Load persisted dashboard layout, tolerating partial/legacy shapes. */
export function loadDashboardLayout(): DashboardLayout {
  if (typeof window === 'undefined') return DEFAULT_DASHBOARD_LAYOUT;
  try {
    const raw = window.localStorage.getItem(DASHBOARD_STORAGE_KEY);
    if (raw) return parseLayout(raw);
    return DEFAULT_DASHBOARD_LAYOUT;
  } catch {
    return DEFAULT_DASHBOARD_LAYOUT;
  }
}

/** Persist dashboard layout. No-op outside the browser. */
export function saveDashboardLayout(layout: DashboardLayout): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(layout));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}
