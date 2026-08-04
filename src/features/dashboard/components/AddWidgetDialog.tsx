import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { DashSection, WidgetId } from '@/config/dashboard-layout';
import { getWidget, SECTION_LABEL } from './widget-registry';

export interface AddWidgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Currently hidden widget ids (the library's contents). */
  hidden: WidgetId[];
  activeSection: DashSection;
  onAdd: (id: WidgetId) => void;
}

/** Widget library — re-add previously removed widgets. Stays open for batch adds. */
export function AddWidgetDialog({ open, onOpenChange, hidden, activeSection, onAdd }: AddWidgetDialogProps) {
  const items = hidden.map(getWidget);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Widget ekle</DialogTitle>
          <DialogDescription>Kaldırdığınız widget'ları panonuza geri ekleyin.</DialogDescription>
        </DialogHeader>

        {items.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            Tüm widget'lar zaten ekli. Kaldırdığınız widget'lar burada listelenir.
          </p>
        ) : (
          <ul className="-mx-2 max-h-[60vh] space-y-1 overflow-auto px-2">
            {items.map((def) => {
              const inSection = def.sections.includes(activeSection);
              const Icon = def.icon;
              return (
                <li key={def.id} className="hover:bg-muted flex items-center gap-3 rounded-lg p-2">
                  <span className="bg-muted text-muted-foreground grid size-9 shrink-0 place-items-center rounded-md">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{def.title}</p>
                    <p className="text-muted-foreground text-xs">
                      {inSection
                        ? 'Bu görünüme eklenir'
                        : `${SECTION_LABEL[def.sections[0] ?? activeSection]} sekmesinde görünür`}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onAdd(def.id)}
                    data-action="add-widget"
                    data-entity="widget"
                  >
                    <Plus className="size-3.5" /> Ekle
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
