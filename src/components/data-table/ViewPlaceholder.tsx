import { Columns3, LayoutGrid, Map } from 'lucide-react';

import type { DataView } from './ViewSwitch';

const VIEW_INFO: Record<Exclude<DataView, 'table'>, { label: string; icon: typeof Columns3 }> = {
  kanban: { label: 'Kanban', icon: Columns3 },
  gallery: { label: 'Galeri', icon: LayoutGrid },
  map: { label: 'Harita', icon: Map },
};

interface ViewPlaceholderProps {
  view: Exclude<DataView, 'table'>;
  entityLabel: string;
}

/** Placeholder shown when a non-table view is selected but not yet implemented for that entity. */
export function ViewPlaceholder({ view, entityLabel }: ViewPlaceholderProps) {
  const { label, icon: Icon } = VIEW_INFO[view];
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 py-20">
      <Icon className="size-10 text-muted-foreground" aria-hidden="true" />
      <p className="text-lg font-medium text-foreground">{label} Görünümü</p>
      <p className="text-sm text-muted-foreground">
        {entityLabel} için {label.toLocaleLowerCase('tr')} görünümü yakında eklenecek.
      </p>
    </div>
  );
}
