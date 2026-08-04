import { Phone, Calendar, Mail, StickyNote, ListTodo, Check } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { Activity } from '../schemas/activity';
import { ACTIVITY_TYPE_LABELS } from '../data/crm';

const ICONS: Record<Activity['type'], LucideIcon> = {
  call: Phone,
  meeting: Calendar,
  email: Mail,
  note: StickyNote,
  task: ListTodo,
};

interface ActivityTimelineProps {
  activities: Activity[];
  onComplete?: (activityId: string) => void;
}

export function ActivityTimeline({ activities, onComplete }: ActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <p className="text-muted-foreground py-6 text-center text-sm">
        Henüz aktivite bulunmuyor.
      </p>
    );
  }

  return (
    <div className="relative space-y-0" role="list" aria-label="Aktivite zaman çizelgesi">
      {activities.map((activity, i) => {
        const Icon = ICONS[activity.type];
        const isCompleted = Boolean(activity.completedAt);
        const isLast = i === activities.length - 1;

        return (
          <div key={activity.id} className="relative flex gap-3 pb-4" role="listitem">
            {/* Timeline line */}
            {!isLast && (
              <div className="bg-border absolute left-[15px] top-8 h-[calc(100%-16px)] w-px" />
            )}

            {/* Icon dot */}
            <div
              className={`relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full ${
                isCompleted
                  ? 'bg-success/15 text-success-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              <Icon className="size-4" />
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className="text-sm font-medium">{activity.subject}</span>
                  <span className="text-muted-foreground ml-2 text-xs">
                    {ACTIVITY_TYPE_LABELS[activity.type]}
                  </span>
                </div>
                <time className="text-muted-foreground shrink-0 text-xs tabular-nums">
                  {new Date(activity.createdAt).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
              </div>

              {activity.description && (
                <p className="text-muted-foreground mt-0.5 text-sm">{activity.description}</p>
              )}

              {!isCompleted && onComplete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1"
                  onClick={() => onComplete(activity.id)}
                  data-action="complete"
                  data-entity="activity"
                >
                  <Check className="size-3" /> Tamamla
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
