import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { AuthProvider, type AuthStatus, type SessionUser } from '@/lib/auth/auth-context';
import { clearSessionExpired, markSessionExpired } from '@/lib/api/auth-token';
import { AuthGate } from './AuthGate';

afterEach(() => clearSessionExpired());

const USER: SessionUser = {
  id: 'u-1',
  name: 'Ahmet Yönetici',
  email: 'super@example.net',
  role: 'super-admin',
};

function renderGate(status: AuthStatus, user: SessionUser | null) {
  const router = createMemoryRouter(
    [
      { path: '/app', element: <AuthGate><div>KORUMALI İÇERİK</div></AuthGate> },
      { path: '/login', element: <div>GİRİŞ SAYFASI</div> },
      { path: '/session-expired', element: <div>OTURUM SÜRESİ DOLDU</div> },
    ],
    { initialEntries: ['/app'] },
  );
  return render(
    <AuthProvider initialState={{ status, user }}>
      <RouterProvider router={router} />
    </AuthProvider>,
  );
}

describe('AuthGate (authentication gate)', () => {
  it('redirects an unauthenticated visitor to /login', () => {
    renderGate('unauthenticated', null);
    expect(screen.getByText('GİRİŞ SAYFASI')).toBeInTheDocument();
    expect(screen.queryByText('KORUMALI İÇERİK')).not.toBeInTheDocument();
  });

  it('routes an expired session to /session-expired', () => {
    markSessionExpired();
    renderGate('unauthenticated', null);
    expect(screen.getByText('OTURUM SÜRESİ DOLDU')).toBeInTheDocument();
    expect(screen.queryByText('GİRİŞ SAYFASI')).not.toBeInTheDocument();
  });

  it('renders the protected tree when authenticated', () => {
    renderGate('authenticated', USER);
    expect(screen.getByText('KORUMALI İÇERİK')).toBeInTheDocument();
  });

  it('shows a boot spinner while the session is loading', () => {
    renderGate('loading', null);
    expect(screen.getByRole('status', { name: 'Oturum doğrulanıyor' })).toBeInTheDocument();
    expect(screen.queryByText('KORUMALI İÇERİK')).not.toBeInTheDocument();
    expect(screen.queryByText('GİRİŞ SAYFASI')).not.toBeInTheDocument();
  });
});
