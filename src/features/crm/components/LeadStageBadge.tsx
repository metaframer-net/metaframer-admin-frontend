import { Badge } from '@/components/ui/badge';
import type { Lead } from '../schemas/lead';
import { LEAD_STAGE_LABELS } from '../data/crm';

const VARIANT: Record<Lead['stage'], React.ComponentProps<typeof Badge>['variant']> = {
  new: 'outline',
  contacted: 'secondary',
  qualified: 'default',
  proposal: 'warning',
  negotiation: 'warning',
  won: 'success',
  lost: 'destructive',
};

interface LeadStageBadgeProps {
  stage: Lead['stage'];
}

export function LeadStageBadge({ stage }: LeadStageBadgeProps) {
  return <Badge variant={VARIANT[stage]}>{LEAD_STAGE_LABELS[stage]}</Badge>;
}
