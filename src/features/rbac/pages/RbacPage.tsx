import { useEffect } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorState } from '@/components/feedback/ErrorState';
import { getAuditLog } from '@/lib/audit';
import { cloneMatrix, setPermissionMatrix } from '@/lib/permissions/permission-store';
import { AuditTimeline } from '@/features/audit/components/AuditTimeline';
import { matrix as seedMatrix, ROLE_LABELS, type Role } from '@/lib/permissions/permissions';
import { PermissionMatrixEditor } from '../components/PermissionMatrixEditor';
import { useRbacMatrix, useTogglePermission } from '../api/hooks';

/** Render `role:<role>` as its Turkish role label in the audit timeline. */
function renderRoleResource(resource: string) {
  const role = resource.startsWith('role:') ? (resource.slice(5) as Role) : undefined;
  return role && role in ROLE_LABELS ? ROLE_LABELS[role] : resource;
}

export function RbacPage() {
  const { data, isLoading, isError, refetch } = useRbacMatrix();
  const toggle = useTogglePermission();

  // Keep the live permission store in sync with the server matrix while the
  // editor is open (so Can/nav/RouteGuard reflect the current server truth).
  useEffect(() => {
    if (data) setPermissionMatrix(data.matrix);
  }, [data]);

  // RBAC changes are audited under `role:<role>` — surface them all here.
  const rbacAudit = getAuditLog().filter((e) => e.resource.startsWith('role:'));

  return (
    <div className="space-y-6" data-entity="rbac">
      <header className="animate-fade-in">
        <h1 className="text-xl font-semibold sm:text-2xl">Roller & İzinler</h1>
        <p className="text-muted-foreground text-sm">
          Her rolün <code>resource.action</code> izinlerini düzenleyin. Değişiklikler anında uygulanır ve
          denetim kaydına yazılır. Süper Admin tüm izinlere sahiptir ve değiştirilemez.
        </p>
      </header>

      {isError ? (
        <ErrorState
          title="Matris yüklenemedi"
          description="Rol/izin matrisi alınamadı. Lütfen tekrar deneyin."
          onRetry={() => void refetch()}
        />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>İzin matrisi</CardTitle>
            </CardHeader>
            <CardContent>
              <PermissionMatrixEditor
                roles={data?.roles ?? []}
                catalog={data?.catalog ?? []}
                // Seed fallback keeps the prop type-valid while loading (editor shows a skeleton).
                matrix={data?.matrix ?? cloneMatrix(seedMatrix)}
                loading={isLoading}
                disabled={toggle.isPending}
                onToggle={(role, permission, granted) => toggle.mutate({ role, permission, granted })}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Değişiklik geçmişi</CardTitle>
            </CardHeader>
            <CardContent>
              <AuditTimeline
                entries={rbacAudit}
                renderResource={renderRoleResource}
                emptyMessage="Henüz izin değişikliği yok."
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
