import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { api } from '@/lib/api/client';
import { clearAuthToken, emitUnauthorized, setAuthToken } from '@/lib/api/auth-token';
import { DEMO_PASSWORD } from '@/features/auth/data/auth';
import { resetAuthDb } from '@/features/auth/api/handlers';
import type { LoginResponse } from '@/features/auth/schemas/auth';
import { AuthProvider, useAuth, type SessionUser } from './auth-context';

function Probe() {
  const { status, user } = useAuth();
  return <div data-testid="probe">{`${status}:${user?.email ?? '-'}`}</div>;
}

const USER: SessionUser = {
  id: 'u-1',
  name: 'Ahmet Yönetici',
  email: 'super@example.net',
  role: 'super-admin',
};

beforeEach(() => {
  resetAuthDb();
  clearAuthToken();
});

describe('AuthProvider', () => {
  it('settles as unauthenticated when no token is persisted', () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    expect(screen.getByTestId('probe')).toHaveTextContent('unauthenticated:-');
  });

  it('restores the session from a persisted token via GET /auth/me', async () => {
    // moderator has no 2FA, so login returns a session token directly.
    const res = await api.post<LoginResponse>('/auth/login', {
      email: 'moderator@example.net',
      password: DEMO_PASSWORD,
    });
    setAuthToken(res.token!);
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('probe')).toHaveTextContent('authenticated:moderator@example.net'),
    );
  });

  it('drops the session on an unauthorized event', () => {
    render(
      <AuthProvider initialState={{ status: 'authenticated', user: USER }}>
        <Probe />
      </AuthProvider>,
    );
    expect(screen.getByTestId('probe')).toHaveTextContent('authenticated:super@example.net');
    act(() => emitUnauthorized());
    expect(screen.getByTestId('probe')).toHaveTextContent('unauthenticated:-');
  });
});
