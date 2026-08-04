import { Loader2 } from 'lucide-react';

import { useSession } from '@/lib/permissions/permission-context';
import type { Role } from '@/lib/permissions/permissions';
import { use2faPolicy, useUpdate2faPolicy } from '../api/hooks';
import { TwoFactorPolicyForm } from './TwoFactorPolicyForm';

/**
 * Org-wide 2FA policy editor. Super-admins can change which roles must use 2FA;
 * everyone else sees a read-only view. Lives in Settings → Güvenlik.
 */
export function TwoFactorPolicySection() {
  const { user } = useSession();
  const canEdit = user.role === 'super-admin';
  const policy = use2faPolicy();
  const update = useUpdate2faPolicy();

  if (policy.isPending) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-sm" role="status">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Yükleniyor…
      </div>
    );
  }
  if (policy.isError || !policy.data) {
    return (
      <p className="text-destructive-tint-foreground text-sm" role="alert">
        2FA politikası yüklenemedi.
      </p>
    );
  }

  const required = policy.data.requiredRoles;
  const toggle = (role: Role, on: boolean) => {
    const next = on ? [...new Set([...required, role])] : required.filter((r) => r !== role);
    update.mutate({ requiredRoles: next });
  };

  return (
    <TwoFactorPolicyForm
      requiredRoles={required}
      onToggle={toggle}
      disabled={update.isPending}
      readOnly={!canEdit}
    />
  );
}
