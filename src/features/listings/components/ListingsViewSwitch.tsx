import { LayoutGrid, Columns3, Table2, Map } from 'lucide-react';

import { cn } from '@/lib/utils';

export const LISTING_VIEWS = ['table', 'kanban', 'gallery', 'map'] as const;
export type ListingView = (typeof LISTING_VIEWS)[number];

const VIEW_META: Record<ListingView, { label: string; icon: typeof Table2 }> = {
  table: { label: 'Tablo', icon: Table2 },
  kanban: { label: 'Kanban', icon: Columns3 },
  gallery: { label: 'Galeri', icon: LayoutGrid },
  map: { label: 'Harita', icon: Map },
};

export function parseListingView(raw: string | undefined): ListingView {
  return (LISTING_VIEWS as readonly string[]).includes(raw ?? '') ? (raw as ListingView) : 'table';
}

export interface ListingsViewSwitchProps {
  value: ListingView;
  onChange: (view: ListingView) => void;
}

/** Segmented control switching the listings surface between the 4 views (URL `?view=`). */
export function ListingsViewSwitch({ value, onChange }: ListingsViewSwitchProps) {
  return (
    <div
      role="group"
      aria-label="Görünüm"
      className="bg-muted inline-flex gap-0.5 rounded-lg border border-border p-1"
    >
      {LISTING_VIEWS.map((view) => {
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
              'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors',
              active ? 'bg-card text-primary shadow-xs' : 'text-muted-foreground hover:text-foreground',
            )}
            data-action="switch-view"
            data-entity="listing"
          >
            <Icon className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
