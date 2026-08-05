import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ROLE_LABELS, ROLES, type Role } from '@/lib/permissions/permissions';

export interface TwoFactorPolicyFormProps {
  /** Roles that currently must use 2FA. */
  requiredRoles: Role[];
  onToggle: (role: Role, required: boolean) => void;
  disabled?: boolean;
  /** Read-only view for non-super-admins. */
  readOnly?: boolean;
}

/**
 * Presentational editor for the org-wide 2FA policy: which roles must use 2FA.
 * Container-free so it can be exercised in Storybook with no network.
 */
export function TwoFactorPolicyForm({
  requiredRoles,
  onToggle,
  disabled = false,
  readOnly = false,
}: TwoFactorPolicyFormProps) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground mb-3 text-sm">
        Seçili rollerdeki yöneticiler girişte iki adımlı doğrulama kurmak zorundadır; diğerleri isteğe
        bağlı olarak açabilir.
      </p>
      <ul className="divide-border divide-y">
        {ROLES.map((role) => {
          const required = requiredRoles.includes(role);
          return (
            <li key={role} className="flex items-center gap-3 py-2.5">
              {readOnly ? (
                <Badge variant={required ? 'secondary' : 'outline'}>
                  {required ? 'Zorunlu' : 'İsteğe bağlı'}
                </Badge>
              ) : (
                <Checkbox
                  id={`twofa-${role}`}
                  checked={required}
                  onCheckedChange={(v) => onToggle(role, v === true)}
                  disabled={disabled}
                  data-action="toggle-2fa-required"
                  data-entity="auth"
                />
              )}
              <Label htmlFor={`twofa-${role}`} className="font-normal">
                {ROLE_LABELS[role]}
              </Label>
            </li>
          );
        })}
      </ul>
      {readOnly && (
        <p className="text-muted-foreground pt-2 text-xs">
          Bu politikayı yalnızca süper admin değiştirebilir.
        </p>
      )}
    </div>
  );
}
