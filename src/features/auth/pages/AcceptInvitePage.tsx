import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, TriangleAlert } from 'lucide-react';

import { ROLE_LABELS } from '@/lib/permissions/permissions';
import { useAuth } from '@/lib/auth/auth-context';
import { AuthShell } from '../components/AuthShell';
import { SetPasswordForm } from '../components/SetPasswordForm';
import { authErrorMessage, useAcceptInvite, useInvite } from '../api/hooks';

/**
 * Accept an admin invite: validate the token, show who the invite is for, let
 * the invitee set a first password, then auto sign-in and land in the app.
 */
export function AcceptInvitePage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const invite = useInvite(token);
  const accept = useAcceptInvite();
  const { setSession } = useAuth();
  const navigate = useNavigate();

  if (!token || invite.isError) {
    return (
      <AuthShell title="Davet geçersiz" subtitle="Bu davet bağlantısı geçersiz veya daha önce kullanılmış.">
        <div className="text-destructive-tint-foreground flex items-start gap-2 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>Yeni bir davet için yöneticinizle iletişime geçin.</p>
        </div>
        <div className="mt-5 text-center">
          <Link to="/login" className="text-primary text-sm font-medium hover:underline" data-action="navigate" data-entity="auth">
            Girişe dön
          </Link>
        </div>
      </AuthShell>
    );
  }

  if (invite.isLoading || !invite.data) {
    return (
      <AuthShell title="Davet kontrol ediliyor" subtitle="Lütfen bekleyin…">
        <div className="flex justify-center py-4" role="status" aria-label="Davet kontrol ediliyor">
          <Loader2 className="text-muted-foreground size-6 animate-spin" aria-hidden="true" />
          <span className="sr-only">Yükleniyor…</span>
        </div>
      </AuthShell>
    );
  }

  const details = invite.data;

  return (
    <AuthShell
      title="Davetini tamamla"
      subtitle={
        <>
          <span className="text-foreground font-medium">{details.name}</span> · {details.email}
          {' · '}
          {ROLE_LABELS[details.role]}
        </>
      }
    >
      <SetPasswordForm
        submitLabel="Hesabı etkinleştir"
        onSubmit={(v) =>
          accept.mutate(
            { token, password: v.password },
            {
              onSuccess: (res) => {
                if (res.token && res.user) {
                  setSession(res.token, res.user);
                  navigate('/', { replace: true });
                }
              },
            },
          )
        }
        pending={accept.isPending}
        errorMessage={accept.isError ? authErrorMessage(accept.error) : null}
      />
    </AuthShell>
  );
}
