import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';

import { AuthShell } from '../components/AuthShell';
import { ForgotPasswordForm } from '../components/ForgotPasswordForm';
import { authErrorMessage, useForgotPassword } from '../api/hooks';

/**
 * Request a password-reset link. On submit we always show the same neutral
 * confirmation (no account enumeration). In this mock — where no real email is
 * sent — the reset link is surfaced inline for the demo.
 */
export function ForgotPasswordPage() {
  const forgot = useForgotPassword();
  const [sent, setSent] = useState<{ resetToken?: string } | null>(null);

  if (sent) {
    return (
      <AuthShell
        title="Bağlantı gönderildi"
        subtitle="E-posta kutunuzu kontrol edin."
      >
        <div className="text-muted-foreground flex items-start gap-2 text-sm">
          <MailCheck className="text-success mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>Eğer bu e-posta adresi kayıtlıysa, şifre sıfırlama bağlantısı gönderildi.</p>
        </div>

        {sent.resetToken && (
          <div className="border-border bg-muted mt-4 rounded-md border p-3 text-sm">
            <p className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
              Demo — gerçek e-posta gönderilmez
            </p>
            <Link
              to={`/reset-password?token=${sent.resetToken}`}
              className="text-primary break-all font-medium hover:underline"
              data-action="navigate"
              data-entity="auth"
            >
              Şifre sıfırlama bağlantısını aç
            </Link>
          </div>
        )}

        <div className="mt-5 text-center">
          <Link to="/login" className="text-primary text-sm font-medium hover:underline" data-action="navigate" data-entity="auth">
            Girişe dön
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Şifremi unuttum"
      subtitle="E-posta adresinizi girin, size bir sıfırlama bağlantısı gönderelim."
    >
      <ForgotPasswordForm
        onSubmit={(values) =>
          forgot.mutate(values, {
            onSuccess: (res) => setSent(res.resetToken ? { resetToken: res.resetToken } : {}),
          })
        }
        pending={forgot.isPending}
        errorMessage={forgot.isError ? authErrorMessage(forgot.error) : null}
      />
      <div className="mt-5 text-center">
        <Link to="/login" className="text-primary text-sm font-medium hover:underline" data-action="navigate" data-entity="auth">
          Girişe dön
        </Link>
      </div>
    </AuthShell>
  );
}
