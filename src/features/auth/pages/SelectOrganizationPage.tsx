import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { AuthShell } from '../components/AuthShell';
import { useOrganizations, useSetActiveOrg } from '../api/hooks';
import { safeReturnTo } from './LoginPage';

/**
 * Full-screen organization (tenant) picker. Reached from the shell switcher or
 * directly. Auto-skips (redirects) when the user belongs to a single org.
 */
export function SelectOrganizationPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = safeReturnTo(params.get('returnTo'));
  const orgs = useOrganizations();
  const setActive = useSetActiveOrg();

  if (orgs.isPending) {
    return (
      <AuthShell title="Organizasyonlar" subtitle="Yükleniyor…">
        <div className="flex justify-center py-4" role="status" aria-label="Organizasyonlar yükleniyor">
          <Loader2 className="text-muted-foreground size-6 animate-spin" aria-hidden="true" />
          <span className="sr-only">Yükleniyor…</span>
        </div>
      </AuthShell>
    );
  }

  if (orgs.isError || !orgs.data) {
    return (
      <AuthShell title="Bir sorun oluştu" subtitle="Organizasyonlar yüklenemedi.">
        <Button asChild size="lg" className="w-full" data-action="navigate" data-entity="auth">
          <a href="/">Genel Bakış'a dön</a>
        </Button>
      </AuthShell>
    );
  }

  if (orgs.data.organizations.length <= 1) return <Navigate to={returnTo} replace />;

  const choose = (id: string) =>
    setActive.mutate(id, { onSuccess: () => navigate(returnTo, { replace: true }) });

  return (
    <AuthShell title="Organizasyon seçin" subtitle="Hangi organizasyonda çalışmak istersiniz?">
      <div className="grid gap-2">
        {orgs.data.organizations.map((o) => (
          <Button
            key={o.id}
            variant="outline"
            className="h-11 justify-start gap-2"
            onClick={() => choose(o.id)}
            disabled={setActive.isPending}
            data-action="select-org"
            data-entity="organization"
          >
            <Building2 className="size-4" aria-hidden="true" /> {o.name}
          </Button>
        ))}
      </div>
    </AuthShell>
  );
}
