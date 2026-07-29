import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '@/lib/auth/auth-context';
import { AuthShell } from '../components/AuthShell';
import { TwoFactorForm } from '../components/TwoFactorForm';
import { authErrorMessage, useVerify2fa } from '../api/hooks';
import { safeReturnTo } from './LoginPage';

interface TwoFactorState {
  challengeToken?: string;
  returnTo?: string;
}

/**
 * Second factor step. Reached only via `LoginPage` (which passes the challenge
 * token in navigation state). A direct visit with no challenge bounces to login.
 */
export function TwoFactorPage() {
  const { setSession } = useAuth();
  const verify = useVerify2fa();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as TwoFactorState;
  const challengeToken = state.challengeToken;
  const returnTo = safeReturnTo(state.returnTo ?? null);

  if (!challengeToken) return <Navigate to="/login" replace />;

  return (
    <AuthShell
      title="İki adımlı doğrulama"
      subtitle="Hesabınızı korumak için doğrulama kodunu girin."
    >
      <TwoFactorForm
        onSubmit={(code) =>
          verify.mutate(
            { challengeToken, code },
            {
              onSuccess: (res) => {
                if (res.token && res.user) {
                  setSession(res.token, res.user);
                  navigate(returnTo, { replace: true });
                }
              },
            },
          )
        }
        pending={verify.isPending}
        errorMessage={verify.isError ? authErrorMessage(verify.error, 'Doğrulama kodu hatalı.') : null}
      />
      <div className="mt-5 text-center">
        <Link to="/login" className="text-primary text-sm font-medium hover:underline" data-action="navigate" data-entity="auth">
          Girişe dön
        </Link>
      </div>
    </AuthShell>
  );
}
