import { beforeEach, describe, expect, it } from 'vitest';

import { api, type ApiError } from '@/lib/api/client';
import { getAuditFor } from '@/lib/audit';
import { clearAuthToken, setAuthToken } from '@/lib/api/auth-token';
import type { SessionUser } from '@/lib/auth/auth-context';
import { DEMO_PASSWORD, DEMO_TOTP_CODE } from '../data/auth';
import type { InviteDetails, LoginResponse, SecurityInfo } from '../schemas/auth';
import { resetAuthDb } from './handlers';

beforeEach(() => {
  resetAuthDb();
  clearAuthToken();
});

async function login(email: string, password = DEMO_PASSWORD) {
  return api.post<LoginResponse>('/auth/login', { email, password });
}

describe('auth handlers — sign in', () => {
  it('logs in a non-2FA account and returns a token + user', async () => {
    const res = await login('moderator@example.net');
    expect(res.token).toMatch(/^mock-/);
    expect(res.user?.role).toBe('moderator');
    expect(getAuditFor(`user:${res.user?.id}`).some((e) => e.action === 'auth.login')).toBe(true);
  });

  it('returns a 2FA challenge (no token) for a 2FA-enabled account', async () => {
    const res = await login('super@example.net');
    expect(res.requires2fa).toBe(true);
    expect(res.challengeToken).toMatch(/^chal-/);
    expect(res.token).toBeUndefined();
  });

  it('rejects wrong credentials with 401 and audits the failure', async () => {
    const err = await login('moderator@example.net', 'wrong').catch((e: unknown) => e);
    expect((err as ApiError).status).toBe(401);
    expect(getAuditFor('user:moderator@example.net').some((e) => e.action === 'auth.login_failed')).toBe(true);
  });

  it('rejects an unknown email with 401', async () => {
    const err = await login('nobody@example.net').catch((e: unknown) => e);
    expect((err as ApiError).status).toBe(401);
  });

  it('rejects a malformed payload with 422', async () => {
    const err = await api.post<LoginResponse>('/auth/login', { password: DEMO_PASSWORD }).catch((e: unknown) => e);
    expect((err as ApiError).status).toBe(422);
  });
});

describe('auth handlers — 2FA', () => {
  it('verifies the correct code and issues a session', async () => {
    const challenge = await login('super@example.net');
    const res = await api.post<LoginResponse>('/auth/2fa/verify', {
      challengeToken: challenge.challengeToken,
      code: DEMO_TOTP_CODE,
    });
    expect(res.token).toMatch(/^mock-/);
    expect(res.user?.role).toBe('super-admin');
  });

  it('rejects a wrong code with 401', async () => {
    const challenge = await login('super@example.net');
    const err = await api
      .post<LoginResponse>('/auth/2fa/verify', { challengeToken: challenge.challengeToken, code: '000000' })
      .catch((e: unknown) => e);
    expect((err as ApiError).status).toBe(401);
  });

  it('rejects an unknown challenge token with 401', async () => {
    const err = await api
      .post<LoginResponse>('/auth/2fa/verify', { challengeToken: 'nope', code: DEMO_TOTP_CODE })
      .catch((e: unknown) => e);
    expect((err as ApiError).status).toBe(401);
  });
});

describe('auth handlers — session', () => {
  it('GET /auth/me returns the user for a valid token', async () => {
    const res = await login('moderator@example.net');
    setAuthToken(res.token!);
    const me = await api.get<SessionUser>('/auth/me');
    expect(me.role).toBe('moderator');
  });

  it('GET /auth/me is 401 without a token', async () => {
    const err = await api.get<SessionUser>('/auth/me').catch((e: unknown) => e);
    expect((err as ApiError).status).toBe(401);
  });

  it('logout invalidates the token and audits it', async () => {
    const res = await login('support@example.net');
    setAuthToken(res.token!);
    await api.post<void>('/auth/logout');
    expect(getAuditFor(`user:${res.user?.id}`).some((e) => e.action === 'auth.logout')).toBe(true);
    const err = await api.get<SessionUser>('/auth/me').catch((e: unknown) => e);
    expect((err as ApiError).status).toBe(401);
  });
});

describe('auth handlers — password recovery', () => {
  it('forgot-password returns a reset token for a known email', async () => {
    const res = await api.post<{ sent: boolean; resetToken?: string }>('/auth/forgot-password', {
      email: 'moderator@example.net',
    });
    expect(res.sent).toBe(true);
    expect(res.resetToken).toMatch(/^reset-/);
  });

  it('forgot-password does not reveal an unknown email (no token, still sent)', async () => {
    const res = await api.post<{ sent: boolean; resetToken?: string }>('/auth/forgot-password', {
      email: 'ghost@example.net',
    });
    expect(res.sent).toBe(true);
    expect(res.resetToken).toBeUndefined();
  });

  it('reset-password sets a new password that then works for login', async () => {
    // support has no 2FA requirement, so a successful login yields a token directly.
    const forgot = await api.post<{ resetToken?: string }>('/auth/forgot-password', {
      email: 'support@example.net',
    });
    await api.post<{ ok: boolean }>('/auth/reset-password', {
      token: forgot.resetToken,
      password: 'brandNew123',
    });
    // Old password no longer works…
    const oldErr = await login('support@example.net').catch((e: unknown) => e);
    expect((oldErr as ApiError).status).toBe(401);
    // …the new one does.
    const res = await login('support@example.net', 'brandNew123');
    expect(res.token).toMatch(/^mock-/);
  });

  it('reset-password rejects an invalid/used token with 422', async () => {
    const err = await api
      .post<{ ok: boolean }>('/auth/reset-password', { token: 'bogus', password: 'brandNew123' })
      .catch((e: unknown) => e);
    expect((err as ApiError).status).toBe(422);
  });
});

describe('auth handlers — invite', () => {
  it('resolves a valid invite token', async () => {
    const details = await api.get<InviteDetails>('/auth/invite?token=invite-demo');
    expect(details.email).toBe('yeni.admin@example.net');
    expect(details.role).toBe('moderator');
  });

  it('404s an unknown invite token', async () => {
    const err = await api.get<InviteDetails>('/auth/invite?token=nope').catch((e: unknown) => e);
    expect((err as ApiError).status).toBe(404);
  });

  it('accepts an invite, auto-signs-in, and consumes the token', async () => {
    const res = await api.post<LoginResponse>('/auth/accept-invite', {
      token: 'invite-demo',
      password: 'freshPass123',
    });
    expect(res.token).toMatch(/^mock-/);
    expect(res.user?.email).toBe('yeni.admin@example.net');
    setAuthToken(res.token!);
    const me = await api.get<SessionUser>('/auth/me');
    expect(me.role).toBe('moderator');
    // The invite is single-use.
    const err = await api
      .post<LoginResponse>('/auth/accept-invite', { token: 'invite-demo', password: 'x2345678' })
      .catch((e: unknown) => e);
    expect((err as ApiError).status).toBe(404);
  });
});

describe('auth handlers — account security', () => {
  /** Sign in a non-2FA admin and attach the token for subsequent calls. */
  async function authed() {
    const res = await login('moderator@example.net');
    setAuthToken(res.token!);
    return res;
  }

  it('GET /auth/security returns 2FA state + sessions (incl. current)', async () => {
    await authed();
    const info = await api.get<SecurityInfo>('/auth/security');
    expect(info.totpEnabled).toBe(false);
    expect(info.sessions.some((s) => s.current)).toBe(true);
    expect(info.sessions.length).toBeGreaterThan(1);
  });

  it('GET /auth/security is 401 without a token', async () => {
    const err = await api.get<SecurityInfo>('/auth/security').catch((e: unknown) => e);
    expect((err as ApiError).status).toBe(401);
  });

  it('change-password rejects a wrong current password (422) and accepts the right one', async () => {
    await authed();
    const bad = await api
      .post('/auth/change-password', { currentPassword: 'nope', newPassword: 'newPass123' })
      .catch((e: unknown) => e);
    expect((bad as ApiError).status).toBe(422);

    await api.post('/auth/change-password', { currentPassword: DEMO_PASSWORD, newPassword: 'newPass123' });
    // New password now works for login.
    const relog = await login('moderator@example.net', 'newPass123');
    expect(relog.token).toMatch(/^mock-/);
  });

  it('enables 2FA with the right code (and login then requires 2FA)', async () => {
    await authed();
    const bad = await api.post('/auth/2fa/enable', { code: '000000' }).catch((e: unknown) => e);
    expect((bad as ApiError).status).toBe(401);

    await api.post('/auth/2fa/enable', { code: DEMO_TOTP_CODE });
    const info = await api.get<SecurityInfo>('/auth/security');
    expect(info.totpEnabled).toBe(true);
    // Login now returns a challenge instead of a session.
    const relog = await login('moderator@example.net');
    expect(relog.requires2fa).toBe(true);
  });

  it('disables 2FA', async () => {
    await authed();
    await api.post('/auth/2fa/enable', { code: DEMO_TOTP_CODE });
    await api.post('/auth/2fa/disable');
    const info = await api.get<SecurityInfo>('/auth/security');
    expect(info.totpEnabled).toBe(false);
  });

  it('revokes a single session and all others', async () => {
    await authed();
    await api.delete('/auth/sessions/sess-chrome-win');
    let info = await api.get<SecurityInfo>('/auth/security');
    expect(info.sessions.some((s) => s.id === 'sess-chrome-win')).toBe(false);

    await api.post('/auth/sessions/revoke-others');
    info = await api.get<SecurityInfo>('/auth/security');
    expect(info.sessions.every((s) => s.current)).toBe(true);
  });

  it('refreshes the token (rotation is non-destructive; the old token stays valid)', async () => {
    const res = await authed();
    const old = res.token!;
    const { token: fresh } = await api.post<{ token: string }>('/auth/refresh');
    expect(fresh).not.toBe(old);

    // Both the rotated-in token AND the previous one keep resolving: the mock
    // never revokes on refresh, so a second tab (or an in-flight request) still
    // carrying the old token is never spuriously signed out. Only an explicit
    // logout invalidates a token — covered by the logout test above.
    setAuthToken(fresh);
    expect((await api.get<{ role: string }>('/auth/me')).role).toBe('moderator');
    setAuthToken(old);
    expect((await api.get<{ role: string }>('/auth/me')).role).toBe('moderator');
  });

  it('reauth accepts the correct password and rejects a wrong one', async () => {
    await authed();
    await api.post('/auth/reauth', { password: DEMO_PASSWORD });
    const err = await api.post('/auth/reauth', { password: 'wrong' }).catch((e: unknown) => e);
    expect((err as ApiError).status).toBe(401);
  });
});

describe('auth handlers — 2FA policy & enrollment (035)', () => {
  it('forces enrollment at login for a required role, then issues a session + recovery codes', async () => {
    // finance is required by policy but not enrolled in the seed.
    const res = await login('finance@example.net');
    expect(res.requires2faSetup).toBe(true);
    expect(res.setupToken).toMatch(/^setup-/);
    const done = await api.post<LoginResponse & { recoveryCodes: string[] }>('/auth/2fa/setup-complete', {
      setupToken: res.setupToken,
      code: DEMO_TOTP_CODE,
    });
    expect(done.token).toMatch(/^mock-/);
    expect(done.recoveryCodes).toHaveLength(10);
  });

  it('setup-complete rejects a wrong code (401)', async () => {
    const res = await login('finance@example.net');
    const err = await api
      .post('/auth/2fa/setup-complete', { setupToken: res.setupToken, code: '000000' })
      .catch((e: unknown) => e);
    expect((err as ApiError).status).toBe(401);
  });

  it('accepts a recovery code at the 2FA step (single use)', async () => {
    // Enrol moderator, capture recovery codes.
    const first = await login('moderator@example.net');
    setAuthToken(first.token!);
    const enable = await api.post<{ codes: string[] }>('/auth/2fa/enable', { code: DEMO_TOTP_CODE });
    const recovery = enable.codes[0]!;
    clearAuthToken();

    // Login again → challenge; verify with the recovery code.
    const chal = await login('moderator@example.net');
    expect(chal.requires2fa).toBe(true);
    const done = await api.post<LoginResponse>('/auth/2fa/verify', {
      challengeToken: chal.challengeToken,
      code: recovery,
    });
    expect(done.token).toMatch(/^mock-/);

    // Reusing the same recovery code fails.
    const chal2 = await login('moderator@example.net');
    const err = await api
      .post('/auth/2fa/verify', { challengeToken: chal2.challengeToken, code: recovery })
      .catch((e: unknown) => e);
    expect((err as ApiError).status).toBe(401);
  });

  it('exposes + updates the policy (super-admin) and enforces the new roles', async () => {
    const chal = await login('super@example.net');
    const sess = await api.post<LoginResponse>('/auth/2fa/verify', { challengeToken: chal.challengeToken, code: DEMO_TOTP_CODE });
    setAuthToken(sess.token!);
    const pol = await api.get<{ requiredRoles: string[] }>('/auth/security/policy');
    expect(pol.requiredRoles).toContain('super-admin');
    const updated = await api.put<{ requiredRoles: string[] }>('/auth/security/policy', {
      requiredRoles: ['super-admin', 'finance', 'moderator'],
    });
    expect(updated.requiredRoles).toContain('moderator');
    clearAuthToken();
    // moderator (not enrolled) now must enrol at login.
    const mod = await login('moderator@example.net');
    expect(mod.requires2faSetup).toBe(true);
  });

  it('rejects a policy change from a non-super-admin (403)', async () => {
    const s = await login('support@example.net');
    setAuthToken(s.token!);
    const err = await api.put('/auth/security/policy', { requiredRoles: [] }).catch((e: unknown) => e);
    expect((err as ApiError).status).toBe(403);
  });

  it('blocks disabling 2FA for a required role (422) but allows it otherwise', async () => {
    const chal = await login('super@example.net');
    const sess = await api.post<LoginResponse>('/auth/2fa/verify', { challengeToken: chal.challengeToken, code: DEMO_TOTP_CODE });
    setAuthToken(sess.token!);
    const err = await api.post('/auth/2fa/disable').catch((e: unknown) => e);
    expect((err as ApiError).status).toBe(422);
    clearAuthToken();

    const m = await login('moderator@example.net');
    setAuthToken(m.token!);
    await api.post('/auth/2fa/enable', { code: DEMO_TOTP_CODE });
    const ok = await api.post<{ ok: boolean }>('/auth/2fa/disable');
    expect(ok.ok).toBe(true);
  });

  it('regenerates recovery codes', async () => {
    const m = await login('moderator@example.net');
    setAuthToken(m.token!);
    await api.post('/auth/2fa/enable', { code: DEMO_TOTP_CODE });
    const re = await api.post<{ codes: string[] }>('/auth/2fa/recovery-codes/regenerate');
    expect(re.codes).toHaveLength(10);
  });
});

describe('auth handlers — account status (036)', () => {
  it('blocks a suspended account with 403 account_disabled', async () => {
    const err = await login('disabled@example.net').catch((e: unknown) => e);
    expect((err as ApiError).status).toBe(403);
    expect(((err as ApiError).body as { code?: string })?.code).toBe('account_disabled');
  });
});

describe('auth handlers — organizations (037)', () => {
  async function authedSuper() {
    const chal = await login('super@example.net');
    const sess = await api.post<LoginResponse>('/auth/2fa/verify', {
      challengeToken: chal.challengeToken,
      code: DEMO_TOTP_CODE,
    });
    setAuthToken(sess.token!);
    return sess;
  }

  it('lists a multi-org user and switches the active org', async () => {
    await authedSuper();
    const orgs = await api.get<{ organizations: { id: string }[]; activeOrgId: string }>('/auth/organizations');
    expect(orgs.organizations.length).toBe(3);
    expect(orgs.activeOrgId).toBe('org-main');
    const upd = await api.post<{ activeOrgId: string }>('/auth/organizations/active', { orgId: 'org-ege' });
    expect(upd.activeOrgId).toBe('org-ege');
    const again = await api.get<{ activeOrgId: string }>('/auth/organizations');
    expect(again.activeOrgId).toBe('org-ege');
  });

  it('gives a single-org user exactly one organization', async () => {
    const m = await login('moderator@example.net');
    setAuthToken(m.token!);
    const orgs = await api.get<{ organizations: { id: string }[] }>('/auth/organizations');
    expect(orgs.organizations.length).toBe(1);
  });

  it('rejects switching to a non-member org (422)', async () => {
    const m = await login('moderator@example.net');
    setAuthToken(m.token!);
    const err = await api.post('/auth/organizations/active', { orgId: 'org-ege' }).catch((e: unknown) => e);
    expect((err as ApiError).status).toBe(422);
  });
});
