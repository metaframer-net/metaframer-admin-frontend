import { http, HttpResponse } from 'msw';
import { z } from 'zod';

import { API_BASE_URL } from '@/lib/api/client';
import { writeAudit } from '@/lib/audit';
import type { SessionUser } from '@/lib/auth/auth-context';
import {
  SEED_ADMINS,
  SEED_INVITES,
  toSessionUser,
  DEMO_TOTP_CODE,
  type SeedAdmin,
} from '../data/auth';
import {
  loginSchema,
  forgotPasswordSchema,
  type ActiveSession,
  type LoginResponse,
  type SecurityInfo,
  type TwoFactorSetup,
} from '../schemas/auth';

// ---------------------------------------------------------------------------
// Runtime state — the mock "backend". Reset between tests via resetAuthDb().
// ---------------------------------------------------------------------------

let sessions = new Map<string, string>(); // session token -> user id
let revokedTokens = new Set<string>(); // tokens invalidated by logout/refresh
let challenges = new Map<string, string>(); // 2FA challenge token -> user id
let resetTokens = new Map<string, string>(); // reset token -> email
let passwordOverrides = new Map<string, string>(); // email(lower) -> new password
let consumedInvites = new Set<string>(); // invite tokens already accepted
let extraAdmins: SeedAdmin[] = []; // admins created via accept-invite
let twoFactorOverrides = new Map<string, boolean>(); // user id -> 2FA enabled override
let otherSessions = new Map<string, ActiveSession[]>(); // user id -> other devices
let seq = 0;

/** Reset the whole mock auth backend (tests). */
export function resetAuthDb(): void {
  sessions = new Map();
  revokedTokens = new Set();
  challenges = new Map();
  resetTokens = new Map();
  passwordOverrides = new Map();
  consumedInvites = new Set();
  extraAdmins = [];
  twoFactorOverrides = new Map();
  otherSessions = new Map();
  seq = 0;
}

/** Static mock 2FA enrollment secret (no real TOTP). */
const DEMO_TOTP_SETUP: TwoFactorSetup = {
  secret: 'ARSAMDEMOSECRET234',
  otpauth: 'otpauth://totp/arsam.net?secret=ARSAMDEMOSECRET234&issuer=arsam.net',
};

/** Effective 2FA state: a runtime override wins over the seed flag. */
function twoFaEnabled(userId: string): boolean {
  const override = twoFactorOverrides.get(userId);
  if (override !== undefined) return override;
  return findById(userId)?.totpEnabled ?? false;
}

/** Lazily seed a user's "other devices" list so the sessions view is populated. */
function sessionsFor(userId: string): ActiveSession[] {
  if (!otherSessions.has(userId)) {
    otherSessions.set(userId, [
      { id: 'sess-chrome-win', device: 'Chrome · Windows', location: 'Ankara, TR', lastActive: 'Bugün 09:12', current: false },
      { id: 'sess-ios-app', device: 'arsam iOS uygulaması', location: 'İzmir, TR', lastActive: '2 gün önce', current: false },
    ]);
  }
  const current: ActiveSession = {
    id: 'current',
    device: 'Bu tarayıcı',
    location: 'İstanbul, TR',
    lastActive: 'Şu anda aktif',
    current: true,
  };
  return [current, ...(otherSessions.get(userId) ?? [])];
}

const nextId = () => (seq += 1);
const allAdmins = (): SeedAdmin[] => [...SEED_ADMINS, ...extraAdmins];
const findByEmail = (email: string) =>
  allAdmins().find((a) => a.email.toLowerCase() === email.toLowerCase());
const findById = (id: string) => allAdmins().find((a) => a.id === id);
const effectivePassword = (admin: SeedAdmin) =>
  passwordOverrides.get(admin.email.toLowerCase()) ?? admin.password;

function mintSession(userId: string): string {
  const token = `mock-${userId}-${nextId()}`;
  sessions.set(token, userId);
  return token;
}

/**
 * Resolve a token to a user id. Prefers the live session map, but falls back to
 * parsing the id out of the opaque `mock-<userId>-<seq>` token so a session
 * SURVIVES A PAGE RELOAD (the in-memory map resets, but a real backend would
 * still honour the token). Explicitly revoked tokens (logout/refresh) never
 * resolve. Runtime (invite-created) admins are not parseable across reloads.
 */
function userIdForToken(token: string | null): string | null {
  if (!token || revokedTokens.has(token)) return null;
  const mapped = sessions.get(token);
  if (mapped) return mapped;
  const parsed = /^mock-(.+)-\d+$/.exec(token);
  return parsed ? parsed[1]! : null;
}

function userForToken(token: string | null): SessionUser | null {
  const userId = userIdForToken(token);
  if (!userId) return null;
  const admin = findById(userId);
  return admin ? toSessionUser(admin) : null;
}

function bearer(request: Request): string | null {
  const header = request.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length);
}

/** Resolve the full seed admin (with password) behind the request's token. */
function adminForRequest(request: Request): SeedAdmin | null {
  const userId = userIdForToken(bearer(request));
  return userId ? findById(userId) ?? null : null;
}

const resetRequestSchema = z.object({ token: z.string().min(1), password: z.string().min(8) });
const acceptInviteRequestSchema = z.object({ token: z.string().min(1), password: z.string().min(8) });
const verify2faRequestSchema = z.object({ challengeToken: z.string().min(1), code: z.string().min(1) });

export const authHandlers = [
  // --- Sign in (+ 2FA challenge branch) -----------------------------------
  http.post(`${API_BASE_URL}/auth/login`, async ({ request }) => {
    const parsed = loginSchema.safeParse(await request.json());
    if (!parsed.success) {
      return HttpResponse.json({ message: 'Geçersiz istek.' }, { status: 422 });
    }
    const { email, password } = parsed.data;
    const admin = findByEmail(email);
    if (!admin || effectivePassword(admin) !== password) {
      writeAudit({ actor: `user:${email}`, action: 'auth.login_failed', resource: `user:${email}` });
      return HttpResponse.json({ message: 'E-posta veya şifre hatalı.' }, { status: 401 });
    }
    // 2FA-enabled accounts get a challenge, not a session, until the code is verified.
    if (twoFaEnabled(admin.id)) {
      const challengeToken = `chal-${admin.id}-${nextId()}`;
      challenges.set(challengeToken, admin.id);
      writeAudit({ actor: `user:${admin.id}`, action: 'auth.2fa_required', resource: `user:${admin.id}` });
      const body: LoginResponse = { requires2fa: true, challengeToken };
      return HttpResponse.json(body);
    }
    const user = toSessionUser(admin);
    const token = mintSession(admin.id);
    writeAudit({ actor: `user:${admin.id}`, action: 'auth.login', resource: `user:${admin.id}` });
    const body: LoginResponse = { token, user };
    return HttpResponse.json(body);
  }),

  // --- Verify the 2FA code ------------------------------------------------
  http.post(`${API_BASE_URL}/auth/2fa/verify`, async ({ request }) => {
    const parsed = verify2faRequestSchema.safeParse(await request.json());
    if (!parsed.success) return HttpResponse.json({ message: 'Geçersiz istek.' }, { status: 422 });
    const { challengeToken, code } = parsed.data;
    const userId = challenges.get(challengeToken);
    if (!userId) return HttpResponse.json({ message: 'Doğrulama oturumu geçersiz veya süresi dolmuş.' }, { status: 401 });
    if (code !== DEMO_TOTP_CODE) {
      writeAudit({ actor: `user:${userId}`, action: 'auth.2fa_failed', resource: `user:${userId}` });
      return HttpResponse.json({ message: 'Doğrulama kodu hatalı.' }, { status: 401 });
    }
    const admin = findById(userId);
    if (!admin) return HttpResponse.json({ message: 'Kullanıcı bulunamadı.' }, { status: 401 });
    challenges.delete(challengeToken);
    const token = mintSession(admin.id);
    writeAudit({ actor: `user:${admin.id}`, action: 'auth.login', resource: `user:${admin.id}` });
    const body: LoginResponse = { token, user: toSessionUser(admin) };
    return HttpResponse.json(body);
  }),

  // --- Current user -------------------------------------------------------
  http.get(`${API_BASE_URL}/auth/me`, ({ request }) => {
    const user = userForToken(bearer(request));
    if (!user) return HttpResponse.json({ message: 'Oturum bulunamadı.' }, { status: 401 });
    return HttpResponse.json(user);
  }),

  // --- Sign out -----------------------------------------------------------
  http.post(`${API_BASE_URL}/auth/logout`, ({ request }) => {
    const token = bearer(request);
    const user = userForToken(token);
    if (token) {
      sessions.delete(token);
      revokedTokens.add(token);
    }
    if (user) writeAudit({ actor: `user:${user.id}`, action: 'auth.logout', resource: `user:${user.id}` });
    return new HttpResponse(null, { status: 204 });
  }),

  // --- Forgot password ----------------------------------------------------
  http.post(`${API_BASE_URL}/auth/forgot-password`, async ({ request }) => {
    const parsed = forgotPasswordSchema.safeParse(await request.json());
    if (!parsed.success) return HttpResponse.json({ message: 'Geçersiz istek.' }, { status: 422 });
    const { email } = parsed.data;
    const admin = findByEmail(email);
    // Never reveal whether the email exists (no account enumeration). A real
    // token is minted only for a real account; the demo surfaces it in the UI
    // in place of an actual email.
    let resetToken: string | undefined;
    if (admin) {
      resetToken = `reset-${nextId()}`;
      resetTokens.set(resetToken, admin.email.toLowerCase());
      writeAudit({ actor: `user:${admin.id}`, action: 'auth.reset_requested', resource: `user:${admin.id}` });
    }
    return HttpResponse.json({ sent: true, ...(resetToken ? { resetToken } : {}) });
  }),

  // --- Reset password -----------------------------------------------------
  http.post(`${API_BASE_URL}/auth/reset-password`, async ({ request }) => {
    const parsed = resetRequestSchema.safeParse(await request.json());
    if (!parsed.success) return HttpResponse.json({ message: 'Geçersiz istek.' }, { status: 422 });
    const { token, password } = parsed.data;
    const email = resetTokens.get(token);
    if (!email) {
      return HttpResponse.json(
        { message: 'Sıfırlama bağlantısı geçersiz veya süresi dolmuş.' },
        { status: 422 },
      );
    }
    passwordOverrides.set(email, password);
    resetTokens.delete(token);
    const admin = findByEmail(email);
    if (admin) writeAudit({ actor: `user:${admin.id}`, action: 'auth.password_reset', resource: `user:${admin.id}` });
    return HttpResponse.json({ ok: true });
  }),

  // --- Invite details (validate token before showing the form) ------------
  http.get(`${API_BASE_URL}/auth/invite`, ({ request }) => {
    const token = new URL(request.url).searchParams.get('token') ?? '';
    const invite = SEED_INVITES.find((i) => i.token === token);
    if (!invite || consumedInvites.has(token)) {
      return HttpResponse.json({ message: 'Davet geçersiz veya kullanılmış.' }, { status: 404 });
    }
    return HttpResponse.json({ email: invite.email, name: invite.name, role: invite.role });
  }),

  // --- Accept invite (set first password, auto sign-in) -------------------
  http.post(`${API_BASE_URL}/auth/accept-invite`, async ({ request }) => {
    const parsed = acceptInviteRequestSchema.safeParse(await request.json());
    if (!parsed.success) return HttpResponse.json({ message: 'Geçersiz istek.' }, { status: 422 });
    const { token, password } = parsed.data;
    const invite = SEED_INVITES.find((i) => i.token === token);
    if (!invite || consumedInvites.has(token)) {
      return HttpResponse.json({ message: 'Davet geçersiz veya kullanılmış.' }, { status: 404 });
    }
    const admin: SeedAdmin = {
      id: `u-inv-${nextId()}`,
      name: invite.name,
      email: invite.email,
      role: invite.role,
      password,
    };
    extraAdmins.push(admin);
    consumedInvites.add(token);
    const sessionToken = mintSession(admin.id);
    writeAudit({ actor: `user:${admin.id}`, action: 'auth.invite_accepted', resource: `user:${admin.id}` });
    const body: LoginResponse = { token: sessionToken, user: toSessionUser(admin) };
    return HttpResponse.json(body);
  }),

  // --- Account security snapshot (2FA state + active sessions) -------------
  http.get(`${API_BASE_URL}/auth/security`, ({ request }) => {
    const admin = adminForRequest(request);
    if (!admin) return HttpResponse.json({ message: 'Oturum bulunamadı.' }, { status: 401 });
    const body: SecurityInfo = { totpEnabled: twoFaEnabled(admin.id), sessions: sessionsFor(admin.id) };
    return HttpResponse.json(body);
  }),

  // --- Change password ----------------------------------------------------
  http.post(`${API_BASE_URL}/auth/change-password`, async ({ request }) => {
    const admin = adminForRequest(request);
    if (!admin) return HttpResponse.json({ message: 'Oturum bulunamadı.' }, { status: 401 });
    const parsed = z
      .object({ currentPassword: z.string().min(1), newPassword: z.string().min(8) })
      .safeParse(await request.json());
    if (!parsed.success) return HttpResponse.json({ message: 'Geçersiz istek.' }, { status: 422 });
    if (effectivePassword(admin) !== parsed.data.currentPassword) {
      return HttpResponse.json({ message: 'Mevcut şifre hatalı.' }, { status: 422 });
    }
    passwordOverrides.set(admin.email.toLowerCase(), parsed.data.newPassword);
    writeAudit({ actor: `user:${admin.id}`, action: 'auth.password_changed', resource: `user:${admin.id}` });
    return HttpResponse.json({ ok: true });
  }),

  // --- 2FA: setup / enable / disable --------------------------------------
  http.get(`${API_BASE_URL}/auth/2fa/setup`, ({ request }) => {
    const admin = adminForRequest(request);
    if (!admin) return HttpResponse.json({ message: 'Oturum bulunamadı.' }, { status: 401 });
    const body: TwoFactorSetup = DEMO_TOTP_SETUP;
    return HttpResponse.json(body);
  }),

  http.post(`${API_BASE_URL}/auth/2fa/enable`, async ({ request }) => {
    const admin = adminForRequest(request);
    if (!admin) return HttpResponse.json({ message: 'Oturum bulunamadı.' }, { status: 401 });
    const parsed = z.object({ code: z.string().min(1) }).safeParse(await request.json());
    if (!parsed.success) return HttpResponse.json({ message: 'Geçersiz istek.' }, { status: 422 });
    if (parsed.data.code !== DEMO_TOTP_CODE) {
      return HttpResponse.json({ message: 'Doğrulama kodu hatalı.' }, { status: 401 });
    }
    twoFactorOverrides.set(admin.id, true);
    writeAudit({ actor: `user:${admin.id}`, action: 'auth.2fa_enabled', resource: `user:${admin.id}` });
    return HttpResponse.json({ ok: true });
  }),

  http.post(`${API_BASE_URL}/auth/2fa/disable`, ({ request }) => {
    const admin = adminForRequest(request);
    if (!admin) return HttpResponse.json({ message: 'Oturum bulunamadı.' }, { status: 401 });
    twoFactorOverrides.set(admin.id, false);
    writeAudit({ actor: `user:${admin.id}`, action: 'auth.2fa_disabled', resource: `user:${admin.id}` });
    return HttpResponse.json({ ok: true });
  }),

  // --- Sessions: revoke one / revoke others -------------------------------
  http.delete(`${API_BASE_URL}/auth/sessions/:id`, ({ request, params }) => {
    const admin = adminForRequest(request);
    if (!admin) return HttpResponse.json({ message: 'Oturum bulunamadı.' }, { status: 401 });
    const id = String(params.id);
    otherSessions.set(
      admin.id,
      sessionsFor(admin.id).filter((s) => !s.current && s.id !== id),
    );
    writeAudit({ actor: `user:${admin.id}`, action: 'auth.session_revoked', resource: `user:${admin.id}` });
    return HttpResponse.json({ ok: true });
  }),

  http.post(`${API_BASE_URL}/auth/sessions/revoke-others`, ({ request }) => {
    const admin = adminForRequest(request);
    if (!admin) return HttpResponse.json({ message: 'Oturum bulunamadı.' }, { status: 401 });
    otherSessions.set(admin.id, []);
    writeAudit({ actor: `user:${admin.id}`, action: 'auth.sessions_revoked_others', resource: `user:${admin.id}` });
    return HttpResponse.json({ ok: true });
  }),

  // --- Refresh the session token ------------------------------------------
  http.post(`${API_BASE_URL}/auth/refresh`, ({ request }) => {
    const token = bearer(request);
    const admin = adminForRequest(request);
    if (!admin || !token) return HttpResponse.json({ message: 'Oturum bulunamadı.' }, { status: 401 });
    sessions.delete(token);
    revokedTokens.add(token);
    const fresh = mintSession(admin.id);
    return HttpResponse.json({ token: fresh });
  }),

  // --- Re-authenticate (idle lock) ----------------------------------------
  http.post(`${API_BASE_URL}/auth/reauth`, async ({ request }) => {
    const admin = adminForRequest(request);
    if (!admin) return HttpResponse.json({ message: 'Oturum bulunamadı.' }, { status: 401 });
    const parsed = z.object({ password: z.string().min(1) }).safeParse(await request.json());
    if (!parsed.success) return HttpResponse.json({ message: 'Geçersiz istek.' }, { status: 422 });
    if (effectivePassword(admin) !== parsed.data.password) {
      return HttpResponse.json({ message: 'Şifre hatalı.' }, { status: 401 });
    }
    return HttpResponse.json({ ok: true });
  }),
];
