import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '@/lib/auth/auth-context';
import { AuthShell } from '../components/AuthShell';
import { LoginForm } from '../components/LoginForm';
import { authErrorMessage, useLogin } from '../api/hooks';

/**
 * Only allow same-origin, absolute in-app paths as a return target — never an
 * external URL or protocol-relative `//host` (open-redirect guard).
 */
export function safeReturnTo(raw: string | null): string {
  if (!raw) return '/';
  const decoded = decodeURIComponent(raw);
  if (!decoded.startsWith('/') || decoded.startsWith('//')) return '/';
  return decoded;
}

/**
 * Login page — design variant A. On success either persists the session and
 * navigates to the return target, or (for 2FA-enabled accounts) forwards to the
 * `/login/2fa` step with the challenge token. Already-authenticated users are
 * bounced away.
 */
export function LoginPage() {
  const { status, setSession } = useAuth();
  const login = useLogin();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = safeReturnTo(params.get('returnTo'));

  if (status === 'authenticated') return <Navigate to={returnTo} replace />;

  const errorMessage = login.isError
    ? authErrorMessage(login.error, 'E-posta veya şifre hatalı.')
    : null;

  return (
    <AuthShell title="Giriş yap" subtitle="Hesabınızla oturum açın.">
      <LoginForm
        onSubmit={(values) =>
          login.mutate(values, {
            onSuccess: (res) => {
              if (res.requires2fa && res.challengeToken) {
                navigate('/login/2fa', {
                  state: { challengeToken: res.challengeToken, returnTo },
                });
              } else if (res.token && res.user) {
                setSession(res.token, res.user);
                navigate(returnTo, { replace: true });
              }
            },
          })
        }
        pending={login.isPending}
        errorMessage={errorMessage}
      />
    </AuthShell>
  );
}
