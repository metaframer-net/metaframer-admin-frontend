import { Badge } from '@/components/ui/badge';
import type { Lead } from '../schemas/lead';
import { LEAD_PRIORITY_LABELS } from '../data/crm';

const VARIANT: Record<Lead['priority'], React.ComponentProps<typeof Badge>['variant']> = {
  low: 'secondary',
  medium: 'outline',
  high: 'warning',
  urgent: 'destructive',
};

interface LeadPriorityBadgeProps {
  priority: Lead['priority'];
}

export function LeadPriorityBadge({ priority }: LeadPriorityBadgeProps) {
  return <Badge variant={VARIANT[priority]}>{LEAD_PRIORITY_LABELS[priority]}</Badge>;
}
