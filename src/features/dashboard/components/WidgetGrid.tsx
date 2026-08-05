import { useRef, useState, type DragEvent, type ReactNode } from 'react';

import { EmptyState } from '@/components/feedback/EmptyState';
import type { WidgetId } from '@/config/dashboard-layout';
import type { UseDashboardLayout } from '../lib/use-dashboard-layout';
import { getWidget, type WidgetContext, type WidgetDef } from './widget-registry';
import { WidgetShell } from './WidgetShell';

/** id shared with the section tablist (`aria-controls`) and the error panel. */
export const DASHBOARD_PANEL_ID = 'dashboard-panel';

export interface WidgetGridProps {
  layout: UseDashboardLayout;
  ctx: WidgetContext;
  editing: boolean;
  /** id of the active section tab, for `aria-labelledby` on the tabpanel. */
  labelledBy: string;
}

/**
 * Renders the active section as a uniform KPI band (span-1 tiles) above a 2-up
 * panel grid (span-2 tiles). Splitting by span is what keeps a short KPI from
 * being stranded in a tall panel's row (the old dense single-grid layout mixed
 * them and left ragged gaps). Reordering (pointer drag or keyboard move buttons)
 * is scoped to within each band; outcomes are announced via a polite live region
 * (WCAG 4.1.3) and focus returns to the panel after a removal.
 */
export function WidgetGrid({ layout, ctx, editing, labelledBy }: WidgetGridProps) {
  const { order, hidden, section } = layout.layout;
  const [draggingId, setDraggingId] = useState<WidgetId | null>(null);
  const [overId, setOverId] = useState<WidgetId | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  const hiddenSet = new Set(hidden);
  const visibleDefs = order
    .filter((id) => !hiddenSet.has(id))
    .map(getWidget)
    .filter((def) => def.sections.includes(section));

  const kpiDefs = visibleDefs.filter((d) => d.span === 1);
  const panelDefs = visibleDefs.filter((d) => d.span === 2);

  function reorderOnDrop(sourceId: WidgetId, targetId: WidgetId, groupIds: WidgetId[]) {
    if (sourceId === targetId) return;
    const s = groupIds.indexOf(sourceId);
    const t = groupIds.indexOf(targetId);
    if (s === -1 || t === -1) return; // cross-group drop → ignore
    if (s < t) {
      layout.move(sourceId, groupIds[t + 1] ?? null); // land AFTER target
    } else {
      layout.move(sourceId, targetId); // land BEFORE target
    }
  }

  function cell(def: WidgetDef, index: number, groupIds: WidgetId[]): ReactNode {
    return (
      <WidgetShell
        key={def.id}
        def={def}
        editing={editing}
        dragging={draggingId === def.id}
        dropTarget={overId === def.id && draggingId !== def.id}
        onRemove={() => {
          layout.remove(def.id);
          setAnnouncement(`${def.title} widget'ı kaldırıldı.`);
          rootRef.current?.focus();
        }}
        onMoveEarlier={() => {
          layout.nudge(def.id, -1, groupIds);
          setAnnouncement(`${def.title}, ${index}. sıraya taşındı.`);
        }}
        onMoveLater={() => {
          layout.nudge(def.id, 1, groupIds);
          setAnnouncement(`${def.title}, ${index + 2}. sıraya taşındı.`);
        }}
        canMoveEarlier={index > 0}
        canMoveLater={index < groupIds.length - 1}
        onDragStart={(e: DragEvent) => {
          setDraggingId(def.id);
          e.dataTransfer.effectAllowed = 'move';
          try {
            e.dataTransfer.setData('text/plain', def.id);
          } catch {
            /* ignore (Firefox needs a payload; some environments throw) */
          }
        }}
        onDragEnter={() => {
          if (draggingId && draggingId !== def.id) setOverId(def.id);
        }}
        onDragOver={(e: DragEvent) => {
          if (draggingId) e.preventDefault(); // allow drop
        }}
        onDrop={(e: DragEvent) => {
          e.preventDefault();
          if (draggingId) reorderOnDrop(draggingId, def.id, groupIds);
          setDraggingId(null);
          setOverId(null);
        }}
        onDragEnd={() => {
          setDraggingId(null);
          setOverId(null);
        }}
      >
        {def.render(ctx)}
      </WidgetShell>
    );
  }

  const kpiIds = kpiDefs.map((d) => d.id);
  const panelIds = panelDefs.map((d) => d.id);

  return (
    <div
      ref={rootRef}
      id={DASHBOARD_PANEL_ID}
      role="tabpanel"
      aria-labelledby={labelledBy}
      tabIndex={-1}
      className="focus-visible:outline-none"
    >
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      {visibleDefs.length === 0 ? (
        <EmptyState
          title="Bu görünümde widget yok"
          description="Bir widget kaldırdınız. “Widget ekle” ile geri yükleyin veya başka bir sekme seçin."
        />
      ) : (
        <div className="space-y-4">
          {kpiDefs.length > 0 && (
            <div className="stagger-children grid grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {kpiDefs.map((def, i) => cell(def, i, kpiIds))}
            </div>
          )}
          {panelDefs.length > 0 && (
            // No `items-start`: cells stretch so both panels in a 2-up row share
            // the taller one's height (h-full cards fill it) — no ragged gaps.
            <div className="stagger-children grid grid-cols-1 gap-4 xl:grid-cols-2">
              {panelDefs.map((def, i) => cell(def, i, panelIds))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
