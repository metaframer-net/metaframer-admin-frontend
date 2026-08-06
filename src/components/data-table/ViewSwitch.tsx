import { LayoutGrid, Columns3, Table2, Map, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export const DATA_VIEWS = ['table', 'kanban', 'gallery', 'map'] as const;
export type DataView = (typeof DATA_VIEWS)[number];

const VIEW_META: Record<DataView, { label: string; icon: LucideIcon }> = {
  table: { label: 'Tablo', icon: Table2 },
  kanban: { label: 'Kanban', icon: Columns3 },
  gallery: { label: 'Galeri', icon: LayoutGrid },
  map: { label: 'Harita', icon: Map },
};

export function parseDataView(raw: string | undefined, views: readonly DataView[] = DATA_VIEWS): DataView {
  return (views as readonly string[]).includes(raw ?? '') ? (raw as DataView) : views[0]!;
}

export interface ViewSwitchProps {
  /** Currently active view. */
  value: DataView;
  /** Called when the user switches view. */
  onChange: (view: DataView) => void;
  /** Which views to show. Defaults to all four. */
  views?: readonly DataView[] | undefined;
  /** Entity name for data-entity attribute (AI-first). */
  entity?: string | undefined;
}

/** Segmented control for switching data surface between views (URL `?view=`). */
export function ViewSwitch({ value, onChange, views = DATA_VIEWS, entity }: ViewSwitchProps) {
  return (
    <div
      role="group"
      aria-label="Görünüm"
      className="bg-muted inline-flex gap-0.5 rounded-lg border border-border p-1"
    >
      {views.map((view) => {
        const { label, icon: Icon } = VIEW_META[view];
        const active = value === view;
        return (
          <button
            key={view}
            type="button"
            onClick={() => onChange(view)}
            aria-pressed={active}
            aria-label={label}
            className={cn(
              'relative inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors after:absolute after:-inset-1 after:content-[""]',
              active ? 'bg-card text-primary shadow-xs' : 'text-muted-foreground hover:text-foreground',
            )}
            data-action="switch-view"
            data-entity={entity}
          >
            <Icon className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
