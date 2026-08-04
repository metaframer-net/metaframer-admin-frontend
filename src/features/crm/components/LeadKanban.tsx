import { useCallback, useMemo, useRef, useState } from 'react';

import { Card, CardContent } from '@/components/ui/card';
import type { Lead } from '../schemas/lead';
import { LEAD_STAGE_LABELS } from '../data/crm';
import { LeadPriorityBadge } from './LeadPriorityBadge';

const PIPELINE_STAGES = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'] as const;

const STAGE_COLORS: Record<string, string> = {
  new: 'border-t-chart-1',
  contacted: 'border-t-chart-2',
  qualified: 'border-t-chart-3',
  proposal: 'border-t-chart-4',
  negotiation: 'border-t-chart-5',
  won: 'border-t-success',
  lost: 'border-t-destructive',
};

interface LeadKanbanProps {
  leads: Lead[];
  onStageChange?: (leadId: string, newStage: Lead['stage']) => void;
}

export function LeadKanban({ leads, onStageChange }: LeadKanbanProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [kbSelectedId, setKbSelectedId] = useState<string | null>(null);
  const dragCounter = useRef<Record<string, number>>({});

  const grouped = useMemo(
    () =>
      PIPELINE_STAGES.map((stage) => {
        const items = leads.filter((l) => l.stage === stage);
        const total = items.reduce((sum, l) => sum + l.value, 0);
        return { stage, label: LEAD_STAGE_LABELS[stage], items, total };
      }),
    [leads],
  );

  const handleDragStart = useCallback((e: React.DragEvent, leadId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', leadId);
    setDraggedId(leadId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setDropTarget(null);
    dragCounter.current = {};
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent, stage: string) => {
    e.preventDefault();
    dragCounter.current[stage] = (dragCounter.current[stage] ?? 0) + 1;
    setDropTarget(stage);
  }, []);

  const handleDragLeave = useCallback((_e: React.DragEvent, stage: string) => {
    dragCounter.current[stage] = (dragCounter.current[stage] ?? 0) - 1;
    if ((dragCounter.current[stage] ?? 0) <= 0) {
      dragCounter.current[stage] = 0;
      setDropTarget((prev) => (prev === stage ? null : prev));
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, stage: string) => {
      e.preventDefault();
      const leadId = e.dataTransfer.getData('text/plain');
      if (leadId && onStageChange) {
        const lead = leads.find((l) => l.id === leadId);
        if (lead && lead.stage !== stage) {
          onStageChange(leadId, stage as Lead['stage']);
        }
      }
      setDraggedId(null);
      setDropTarget(null);
      dragCounter.current = {};
    },
    [leads, onStageChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, lead: Lead) => {
      if (!onStageChange) return;
      const stageIdx = PIPELINE_STAGES.indexOf(lead.stage);

      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setKbSelectedId((prev) => (prev === lead.id ? null : lead.id));
        return;
      }

      if (kbSelectedId !== lead.id) return;

      if (e.key === 'ArrowRight' && stageIdx < PIPELINE_STAGES.length - 1) {
        e.preventDefault();
        const next = PIPELINE_STAGES[stageIdx + 1];
        if (next) {
          onStageChange(lead.id, next);
          setKbSelectedId(null);
        }
      } else if (e.key === 'ArrowLeft' && stageIdx > 0) {
        e.preventDefault();
        const prev = PIPELINE_STAGES[stageIdx - 1];
        if (prev) {
          onStageChange(lead.id, prev);
          setKbSelectedId(null);
        }
      } else if (e.key === 'Escape') {
        setKbSelectedId(null);
      }
    },
    [onStageChange, kbSelectedId],
  );

  return (
    <div className="flex gap-3 overflow-x-auto pb-4" role="region" aria-label="Lead pipeline kanban">
      {grouped.map((col) => (
        <div
          key={col.stage}
          className={`flex w-64 shrink-0 flex-col gap-2 xl:w-auto xl:flex-1 ${
            dropTarget === col.stage && draggedId ? 'rounded-lg ring-2 ring-primary/40' : ''
          }`}
          onDragEnter={(e) => handleDragEnter(e, col.stage)}
          onDragLeave={(e) => handleDragLeave(e, col.stage)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, col.stage)}
          aria-label={`${col.label} aşaması`}
        >
          {/* Column header */}
          <div className={`rounded-lg border border-t-4 ${STAGE_COLORS[col.stage] ?? ''} bg-card p-3`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{col.label}</span>
              <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs tabular-nums">
                {col.items.length}
              </span>
            </div>
            <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">
              ₺{col.total.toLocaleString('tr-TR')}
            </p>
          </div>

          {/* Cards */}
          <div className="flex min-h-[60px] flex-col gap-2">
            {col.items.map((lead) => (
              <Card
                key={lead.id}
                tabIndex={onStageChange ? 0 : undefined}
                draggable={Boolean(onStageChange)}
                onDragStart={(e) => handleDragStart(e, lead.id)}
                onDragEnd={handleDragEnd}
                onKeyDown={(e) => handleKeyDown(e, lead)}
                aria-roledescription={onStageChange ? 'sürüklenebilir kart' : undefined}
                aria-pressed={kbSelectedId === lead.id}
                aria-label={`${lead.title}, ${LEAD_STAGE_LABELS[lead.stage]}, ₺${lead.value.toLocaleString('tr-TR')}`}
                className={`motion-safe:transition-shadow focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none ${
                  onStageChange ? 'cursor-grab active:cursor-grabbing' : ''
                } ${draggedId === lead.id ? 'opacity-40' : 'hover:shadow-md'} ${
                  kbSelectedId === lead.id ? 'ring-primary ring-2' : ''
                }`}
                data-action="drag"
                data-entity="lead"
              >
                <CardContent className="space-y-2 p-3">
                  <p className="text-sm font-medium leading-tight">{lead.title}</p>
                  <p className="text-muted-foreground text-xs">{lead.contactName}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold tabular-nums">
                      ₺{lead.value.toLocaleString('tr-TR')}
                    </span>
                    <LeadPriorityBadge priority={lead.priority} />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground tabular-nums">{lead.probability}%</span>
                    {lead.assigneeName && (
                      <span className="text-muted-foreground">{lead.assigneeName}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {col.items.length === 0 && (
              <div className={`rounded-lg border border-dashed p-4 text-center ${
                dropTarget === col.stage && draggedId ? 'border-primary bg-primary/5' : 'border-border'
              }`}>
                <p className="text-muted-foreground text-xs">
                  {dropTarget === col.stage && draggedId ? 'Buraya bırak' : 'Boş'}
                </p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
