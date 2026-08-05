import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { Check, Pencil, Plus, RotateCcw } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/feedback/ErrorState';
import { getAuditLog } from '@/lib/audit';
import type { DashPeriod, DashSection } from '@/config/dashboard-layout';
import type { TableQuery } from '@/components/data-table/types';
import { useListings } from '@/features/listings/api/queries';
import { useDashboardInsights, useDashboardStats } from '../api/queries';
import { useDashboardLayout } from '../lib/use-dashboard-layout';
import { WidgetGrid, DASHBOARD_PANEL_ID } from '../components/WidgetGrid';
import { AddWidgetDialog } from '../components/AddWidgetDialog';
import {
  PERIOD_LABEL,
  SECTION_LABEL,
  SECTION_META,
  type WidgetContext,
} from '../components/widget-registry';

const PENDING_QUERY: TableQuery = {
  page: 1,
  pageSize: 5,
  sort: [{ id: 'createdAt', desc: true }],
  filters: { status: 'pending' },
  q: '',
};

const PERIOD_OPTIONS: { value: DashPeriod; label: string }[] = [
  { value: 'today', label: PERIOD_LABEL.today },
  { value: '7d', label: PERIOD_LABEL['7d'] },
  { value: '30d', label: PERIOD_LABEL['30d'] },
];

interface SegOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

/**
 * Segmented control with two ARIA modes:
 * - `toggle` (default): a `role="group"` of `aria-pressed` buttons — for the
 *   period filter, which narrows data without switching the region.
 * - `tabs`: a `role="tablist"` with roving tabindex + arrow-key navigation and
 *   `aria-controls` → the grid `tabpanel` — for the section switch, which swaps
 *   the whole widget set (APG automatic-activation tabs pattern).
 * Buttons meet the 44px touch-target minimum (`min-h-11`); the selected state is
 * never color-only (the active button also raises with a shadow).
 */
function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  action,
  as = 'toggle',
  panelId,
}: {
  value: T;
  onChange: (value: T) => void;
  options: SegOption<T>[];
  ariaLabel: string;
  action: string;
  as?: 'toggle' | 'tabs';
  panelId?: string;
}) {
  const isTabs = as === 'tabs';
  const refs = useRef<Partial<Record<T, HTMLButtonElement | null>>>({});

  function onKeyDown(e: KeyboardEvent) {
    if (!isTabs) return;
    const idx = options.findIndex((o) => o.value === value);
    let next: number;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = (idx + 1) % options.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = (idx - 1 + options.length) % options.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = options.length - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    const opt = options[next];
    if (opt) {
      onChange(opt.value);
      refs.current[opt.value]?.focus();
    }
  }

  return (
    <div
      role={isTabs ? 'tablist' : 'group'}
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className="bg-muted inline-flex flex-wrap gap-0.5 rounded-lg p-0.5"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[o.value] = el;
            }}
            type="button"
            role={isTabs ? 'tab' : undefined}
            id={isTabs ? `dash-tab-${o.value}` : undefined}
            aria-selected={isTabs ? active : undefined}
            aria-pressed={isTabs ? undefined : active}
            aria-controls={isTabs ? panelId : undefined}
            tabIndex={isTabs ? (active ? 0 : -1) : undefined}
            onClick={() => onChange(o.value)}
            data-action={action}
            data-entity="dashboard"
            className={cn(
              'inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors',
              'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
              active ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {o.icon && <o.icon className="size-4" aria-hidden="true" />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function DashboardPage() {
  const dash = useDashboardLayout();
  const [editing, setEditing] = useState(false);
  const [libOpen, setLibOpen] = useState(false);

  const { data: stats, isLoading: statsLoading, isError: statsError, refetch: refetchStats } = useDashboardStats();
  const {
    data: insights,
    isLoading: insightsLoading,
    isError: insightsError,
    refetch: refetchInsights,
  } = useDashboardInsights();
  const pendingQuery = useMemo(() => PENDING_QUERY, []);
  const { data: pending, isLoading: pendingLoading } = useListings(pendingQuery);
  const audit = getAuditLog().slice(0, 6);

  const loading = statsLoading || insightsLoading || pendingLoading;
  // Either core source failing replaces the whole board with a retry state —
  // most widgets read from `insights`, so gating on `stats` alone would let an
  // insights failure render confident zeroes (the worst failure for an overview).
  const isError = statsError || insightsError;
  const period = dash.layout.period;
  const section = dash.layout.section;

  const ctx: WidgetContext = {
    stats,
    insights,
    kpi: insights?.periods[period],
    pending: pending?.items ?? [],
    audit,
    period,
    loading,
  };

  const sectionOptions: SegOption<DashSection>[] = SECTION_META.map((s) => ({
    value: s.id,
    label: s.label,
    icon: s.icon,
  }));

  return (
    <div className="space-y-5">
      <header className="animate-fade-in flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Genel Bakış</h1>
          <p className="text-muted-foreground text-sm">
            Kişisel panonuz · {SECTION_LABEL[section]} görünümü
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            value={period}
            onChange={dash.setPeriod}
            options={PERIOD_OPTIONS}
            ariaLabel="Raporlama dönemi"
            action="select-period"
          />
          {editing && (
            <>
              <Button variant="outline" size="sm" onClick={() => setLibOpen(true)} data-action="open-widget-library" data-entity="dashboard">
                <Plus className="size-4" /> Widget ekle
                {dash.layout.hidden.length > 0 && (
                  <span className="bg-primary/10 text-primary ml-0.5 rounded-full px-1.5 text-xs font-semibold tabular-nums">
                    {dash.layout.hidden.length}
                  </span>
                )}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => dash.reset()} data-action="reset-layout" data-entity="dashboard">
                <RotateCcw className="size-4" /> Sıfırla
              </Button>
            </>
          )}
          <Button
            variant={editing ? 'default' : 'outline'}
            size="sm"
            onClick={() => setEditing((e) => !e)}
            aria-pressed={editing}
            data-action="toggle-edit"
            data-entity="dashboard"
          >
            {editing ? <Check className="size-4" /> : <Pencil className="size-4" />}
            {editing ? 'Bitir' : 'Düzenle'}
          </Button>
          <Button asChild size="sm">
            <Link to="/listings/create" data-action="create" data-entity="listing">
              <Plus className="size-4" /> Yeni ilan
            </Link>
          </Button>
        </div>
      </header>

      <Segmented
        value={section}
        onChange={dash.setSection}
        options={sectionOptions}
        ariaLabel="Pano bölümü"
        action="select-section"
        as="tabs"
        panelId={DASHBOARD_PANEL_ID}
      />

      {isError ? (
        <div id={DASHBOARD_PANEL_ID} role="tabpanel" aria-labelledby={`dash-tab-${section}`}>
          <ErrorState
            title="Panel yüklenemedi"
            description="Genel bakış verileri alınamadı. Lütfen tekrar deneyin."
            onRetry={() => {
              void refetchStats();
              void refetchInsights();
            }}
          />
        </div>
      ) : (
        <WidgetGrid layout={dash} ctx={ctx} editing={editing} labelledBy={`dash-tab-${section}`} />
      )}

      <AddWidgetDialog
        open={libOpen}
        onOpenChange={setLibOpen}
        hidden={dash.layout.hidden}
        activeSection={section}
        onAdd={dash.add}
      />
    </div>
  );
}
