import { Badge } from '@/components/ui/badge';
import type { Contact } from '../schemas/contact';
import { CONTACT_STATUS_LABELS } from '../data/crm';

const VARIANT: Record<Contact['status'], React.ComponentProps<typeof Badge>['variant']> = {
  active: 'success',
  inactive: 'secondary',
  vip: 'warning',
  churned: 'destructive',
};

interface ContactStatusBadgeProps {
  status: Contact['status'];
}

export function ContactStatusBadge({ status }: ContactStatusBadgeProps) {
  return <Badge variant={VARIANT[status]}>{CONTACT_STATUS_LABELS[status]}</Badge>;
}
