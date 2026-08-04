import type { DragEvent, ReactNode } from 'react';
import { ArrowLeft, ArrowRight, GripVertical, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { WidgetDef } from './widget-registry';

export interface WidgetShellProps {
  def: WidgetDef;
  editing: boolean;
  dragging: boolean;
  dropTarget: boolean;
  onRemove: () => void;
  onMoveEarlier: () => void;
  onMoveLater: () => void;
  canMoveEarlier: boolean;
  canMoveLater: boolean;
  onDragStart: (e: DragEvent) => void;
  onDragEnter: (e: DragEvent) => void;
  onDragOver: (e: DragEvent) => void;
  onDrop: (e: DragEvent) => void;
  onDragEnd: (e: DragEvent) => void;
  children: ReactNode;
}

/**
 * Grid-cell wrapper that carries a widget's column span and, in edit mode, its
 * reorder/remove affordances. Reordering is available BOTH by pointer drag
 * (HTML5 DnD) AND by keyboard via the ←/→ move buttons — drag alone is not
 * keyboard-accessible, so the buttons are the a11y-conformant path.
 */
export function WidgetShell({
  def,
  editing,
  dragging,
  dropTarget,
  onRemove,
  onMoveEarlier,
  onMoveLater,
  canMoveEarlier,
  canMoveLater,
  onDragStart,
  onDragEnter,
  onDragOver,
  onDrop,
  onDragEnd,
  children,
}: WidgetShellProps) {
  return (
    <div
      data-widget-id={def.id}
      data-slot="widget-shell"
      aria-roledescription={editing ? 'Sürüklenebilir widget' : undefined}
      className={cn(
        // Column span is owned by the grouped grids in WidgetGrid (a uniform KPI
        // band + a 2-up panel grid), so the shell itself is span-agnostic — this
        // is what keeps short KPIs from being stranded in tall panel rows.
        'relative h-full',
        editing && 'outline-primary/40 rounded-xl outline-2 outline-dashed outline-offset-2',
        editing && 'cursor-grab active:cursor-grabbing',
        dragging && 'opacity-45',
        dropTarget && 'outline-primary rounded-xl outline-2 outline-offset-2',
      )}
      draggable={editing}
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      {children}

      {editing && (
        // Single centered toolbar. All buttons keep the default `size="icon"`
        // (44px) hit target — only the glyphs are shrunk — so reorder/remove meet
        // the 44px minimum (WCAG 2.5.8). Keyboard move buttons are the accessible
        // counterpart to pointer drag.
        <div className="bg-card border-border absolute -top-3.5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-xl border p-1 shadow-md">
          <span className="text-muted-foreground grid size-8 cursor-grab place-items-center" aria-hidden="true">
            <GripVertical className="size-4" />
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onMoveEarlier}
            disabled={!canMoveEarlier}
            aria-label={`${def.title} widget'ını geri taşı`}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onMoveLater}
            disabled={!canMoveLater}
            aria-label={`${def.title} widget'ını ileri taşı`}
          >
            <ArrowRight className="size-4" />
          </Button>
          <span className="bg-border mx-0.5 h-6 w-px" aria-hidden="true" />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onRemove}
            data-action="remove-widget"
            data-entity="widget"
            aria-label={`${def.title} widget'ını kaldır`}
          >
            <X className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
