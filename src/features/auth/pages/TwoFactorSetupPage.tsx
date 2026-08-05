import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '@/lib/auth/auth-context';
import { AuthShell } from '../components/AuthShell';
import { TwoFactorForm } from '../components/TwoFactorForm';
import { RecoveryCodes } from '../components/RecoveryCodes';
import { authErrorMessage, use2faSetup, useSetup2faComplete } from '../api/hooks';
import { safeReturnTo } from './LoginPage';

interface SetupState {
  setupToken?: string;
  returnTo?: string;
}

/**
 * Mandatory 2FA enrollment at login. Reached only when a user whose ROLE requires
 * 2FA (policy) signs in without having enrolled — `LoginPage` forwards here with a
 * `setupToken`. After the code is verified the session is issued and the one-time
 * recovery codes are shown before entering the app.
 */
export function TwoFactorSetupPage() {
  const { setSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as SetupState;
  const setupToken = state.setupToken;
  const returnTo = safeReturnTo(state.returnTo ?? null);

  const setup = use2faSetup(Boolean(setupToken), setupToken);
  const complete = useSetup2faComplete();
  const [codes, setCodes] = useState<string[] | null>(null);

  if (!setupToken) return <Navigate to="/login" replace />;

  if (codes) {
    return (
      <AuthShell title="Kurtarma kodlarınız" subtitle="Devam etmeden önce bu kodları güvenli bir yere kaydedin.">
        <RecoveryCodes codes={codes} onDone={() => navigate(returnTo, { replace: true })} />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="İki adımlı doğrulama kurulumu"
      subtitle="Rol politikanız gereği iki adımlı doğrulama zorunludur. Devam etmek için kurun."
    >
      {setup.data && (
        <div className="border-border bg-muted mb-4 rounded-md border p-3 text-sm">
          <p className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
            Gizli anahtar (demo)
          </p>
          <code className="font-mono break-all">{setup.data.secret}</code>
          <p className="text-muted-foreground mt-1.5 text-xs">
            Authenticator uygulamanıza ekleyin, ürettiği kodu aşağıya girin.
          </p>
        </div>
      )}

      <TwoFactorForm
        submitLabel="Kur ve devam et"
        onSubmit={(code) =>
          complete.mutate(
            { setupToken, code },
            {
              onSuccess: (res) => {
                if (res.token && res.user) {
                  setSession(res.token, res.user);
                  setCodes(res.recoveryCodes);
                }
              },
            },
          )
        }
        pending={complete.isPending}
        errorMessage={complete.isError ? authErrorMessage(complete.error, 'Doğrulama kodu hatalı.') : null}
      />

      <div className="mt-5 text-center">
        <Link to="/login" className="text-primary text-sm font-medium hover:underline" data-action="navigate" data-entity="auth">
          Girişe dön
        </Link>
      </div>
    </AuthShell>
  );
}
