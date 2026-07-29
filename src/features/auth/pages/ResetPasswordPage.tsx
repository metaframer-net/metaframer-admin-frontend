import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CircleCheck, TriangleAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { AuthShell } from '../components/AuthShell';
import { SetPasswordForm } from '../components/SetPasswordForm';
import { authErrorMessage, useResetPassword } from '../api/hooks';

/**
 * Set a new password from a reset link. Handles a missing token (invalid link),
 * a server-rejected token (expired/used → inline error), and success.
 */
export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const reset = useResetPassword();
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <AuthShell title="Geçersiz bağlantı" subtitle="Bu şifre sıfırlama bağlantısı eksik veya hatalı.">
        <div className="text-destructive-tint-foreground flex items-start gap-2 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>Lütfen yeni bir sıfırlama bağlantısı isteyin.</p>
        </div>
        <div className="mt-5 text-center">
          <Link to="/forgot-password" className="text-primary text-sm font-medium hover:underline" data-action="navigate" data-entity="auth">
            Yeni bağlantı iste
          </Link>
        </div>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell title="Şifre güncellendi" subtitle="Artık yeni şifrenizle giriş yapabilirsiniz.">
        <div className="text-success-foreground mb-4 flex items-start gap-2 text-sm">
          <CircleCheck className="text-success mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>Şifreniz başarıyla değiştirildi.</p>
        </div>
        <Button asChild size="lg" className="w-full" data-action="navigate" data-entity="auth">
          <Link to="/login">Girişe git</Link>
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Yeni şifre belirle" subtitle="Hesabınız için yeni bir şifre oluşturun.">
      <SetPasswordForm
        submitLabel="Şifreyi güncelle"
        onSubmit={(v) =>
          reset.mutate({ token, password: v.password }, { onSuccess: () => setDone(true) })
        }
        pending={reset.isPending}
        errorMessage={
          reset.isError
            ? authErrorMessage(reset.error, 'Sıfırlama bağlantısı geçersiz veya süresi dolmuş.')
            : null
        }
      />
      <div className="mt-5 text-center">
        <Link to="/login" className="text-primary text-sm font-medium hover:underline" data-action="navigate" data-entity="auth">
          Girişe dön
        </Link>
      </div>
    </AuthShell>
  );
}
