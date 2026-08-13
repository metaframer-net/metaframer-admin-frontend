import { http, HttpResponse } from 'msw';
import { z } from 'zod';

import { API_BASE_URL } from '@/lib/api/client';
import { writeAudit } from '@/lib/audit';
import type { Role } from '@/lib/permissions/permissions';
import type { SessionUser } from '@/lib/auth/auth-context';
import {
  SEED_ADMINS,
  SEED_INVITES,
  SEED_ORGS,
  DEFAULT_ORG_ID,
  toSessionUser,
  DEMO_TOTP_CODE,
  TWO_FACTOR_REQUIRED_ROLES,
  type SeedAdmin,
} from '../data/auth';
import {
  loginSchema,
  forgotPasswordSchema,
  twoFactorPolicySchema,
  type ActiveSession,
  type LoginResponse,
  type OrganizationsResponse,
  type SecurityInfo,
  type TwoFactorSetup,
} from '../schemas/auth';

// ---------------------------------------------------------------------------
// Runtime state — the mock "backend". Reset between tests via resetAuthDb().
// ---------------------------------------------------------------------------

let sessions = new Map<string, string>(); // session token -> user id
let revokedTokens = new Set<string>(); // tokens invalidated by an explicit logout only
let challenges = new Map<string, string>(); // 2FA challenge token -> user id
let setupChallenges = new Map<string, string>(); // mandatory-2FA setup token -> user id
let resetTokens = new Map<string, string>(); // reset token -> email
let passwordOverrides = new Map<string, string>(); // email(lower) -> new password
let consumedInvites = new Set<string>(); // invite tokens already accepted
let extraAdmins: SeedAdmin[] = []; // admins created via accept-invite
let twoFactorOverrides = new Map<string, boolean>(); // user id -> 2FA enrolled override
let recoveryCodes = new Map<string, Array<{ code: string; used: boolean }>>(); // user id -> codes
let twoFactorRequiredRoles = new Set<Role>(TWO_FACTOR_REQUIRED_ROLES); // policy
let otherSessions = new Map<string, ActiveSession[]>(); // user id -> other devices
let activeOrgByUser = new Map<string, string>(); // user id -> active org id
let seq = 0;

/** Reset the whole mock auth backend (tests). */
export function resetAuthDb(): void {
  sessions = new Map();
  revokedTokens = new Set();
  challenges = new Map();
  setupChallenges = new Map();
  resetTokens = new Map();
  passwordOverrides = new Map();
  consumedInvites = new Set();
  extraAdmins = [];
  twoFactorOverrides = new Map();
  recoveryCodes = new Map();
  twoFactorRequiredRoles = new Set(TWO_FACTOR_REQUIRED_ROLES);
  otherSessions = new Map();
  activeOrgByUser = new Map();
  seq = 0;
}

/** Org ids an admin belongs to (defaults to the main org). */
const orgIdsForAdmin = (admin: SeedAdmin) => admin.orgs ?? [DEFAULT_ORG_ID];

/** Static mock 2FA enrollment secret (no real TOTP). */
const DEMO_TOTP_SETUP: TwoFactorSetup = {
  secret: 'EXAMPLEDEMOSECRET234',
  otpauth: 'otpauth://totp/example.net?secret=EXAMPLEDEMOSECRET234&issuer=example.net',
};

const nextId = () => (seq += 1);
const allAdmins = (): SeedAdmin[] => [...SEED_ADMINS, ...extraAdmins];
const findByEmail = (email: string) =>
  allAdmins().find((a) => a.email.toLowerCase() === email.toLowerCase());
const findById = (id: string) => allAdmins().find((a) => a.id === id);
const effectivePassword = (admin: SeedAdmin) =>
  passwordOverrides.get(admin.email.toLowerCase()) ?? admin.password;

/** Effective 2FA enrollment: a runtime override wins over the seed flag. */
function twoFaEnrolled(userId: string): boolean {
  const override = twoFactorOverrides.get(userId);
  if (override !== undefined) return override;
  return findById(userId)?.totpEnabled ?? false;
}

/** Whether a role is required by policy to use 2FA. */
const roleRequires2fa = (role: Role) => twoFactorRequiredRoles.has(role);

/** Generate + store 10 one-time recovery codes for a user; returns the plain codes. */
function genRecoveryCodes(userId: string): string[] {
  const seg = () => (nextId() * 1103 + 937).toString(36).toUpperCase().padStart(4, '0').slice(-4);
  const codes = Array.from({ length: 10 }, () => `${seg()}-${seg()}`);
  recoveryCodes.set(userId, codes.map((code) => ({ code, used: false })));
  return codes;
}

function recoveryRemaining(userId: string): number {
  return (recoveryCodes.get(userId) ?? []).filter((c) => !c.used).length;
}

/** Consume an unused recovery code (used as a 2FA fallback). */
function consumeRecovery(userId: string, code: string): boolean {
  const list = recoveryCodes.get(userId);
  const entry = list?.find((c) => !c.used && c.code === code.trim().toUpperCase());
  if (!entry) return false;
  entry.used = true;
  return true;
}

/** Lazily seed a user's "other devices" list so the sessions view is populated. */
function sessionsFor(userId: string): ActiveSession[] {
  if (!otherSessions.has(userId)) {
    otherSessions.set(userId, [
      { id: 'sess-chrome-win', device: 'Chrome · Windows', location: 'Ankara, TR', lastActive: 'Bugün 09:12', current: false },
      { id: 'sess-ios-app', device: 'example iOS uygulaması', location: 'İzmir, TR', lastActive: '2 gün önce', current: false },
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

/**
 * A per-tab-unique token nonce. MSW runs its request handlers (and this in-memory
 * state) SEPARATELY in each browser tab, but the bearer token lives in shared
 * localStorage. With only a per-tab `seq`, two tabs mint the IDENTICAL
 * `mock-<user>-<n>` string — so one tab can treat another tab's freshly-minted
 * token as its own previously-revoked one and 401 it, bouncing the user to
 * /session-expired. A globally-unique nonce per tab makes cross-tab collisions
 * impossible while leaving revocation semantics (logout, refresh grace) intact.
 */
const TAB_NONCE =
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID().replace(/-/g, '')
    : Math.floor(Math.random() * 1e12).toString(36);

function mintSession(userId: string): string {
  const token = `mock-${userId}-${nextId()}${TAB_NONCE}`;
  sessions.set(token, userId);
  return token;
}

/**
 * Resolve a token to a user id. Prefers the live session map, but falls back to
 * parsing the id out of the opaque `mock-<userId>-<seq>` token so a session
 * SURVIVES A PAGE RELOAD. Explicitly revoked tokens never resolve.
 */
function userIdForToken(token: string | null): string | null {
  if (!token || revokedTokens.has(token)) return null;
  const mapped = sessions.get(token);
  if (mapped) return mapped;
  // Trailing segment is `<seq><TAB_NONCE>` (digits + optional alphanumerics), so
  // accept alphanumerics — not just `\d+` — while still parsing the user id out.
  const parsed = /^mock-(.+)-[0-9a-z]+$/.exec(token);
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

function issueSession(admin: SeedAdmin): LoginResponse {
  const token = mintSession(admin.id);
  writeAudit({ actor: `user:${admin.id}`, action: 'auth.login', resource: `user:${admin.id}` });
  return { token, user: toSessionUser(admin) };
}

const resetRequestSchema = z.object({ token: z.string().min(1), password: z.string().min(8) });
const acceptInviteRequestSchema = z.object({ token: z.string().min(1), password: z.string().min(8) });
const verify2faRequestSchema = z.object({ challengeToken: z.string().min(1), code: z.string().min(1) });
const setupCompleteSchema = z.object({ setupToken: z.string().min(1), code: z.string().min(1) });

export const authHandlers = [
  // --- Sign in (+ 2FA challenge / mandatory-setup branches) ---------------
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
    // Suspended account → blocked even with valid credentials.
    if (admin.disabled) {
      writeAudit({ actor: `user:${admin.id}`, action: 'auth.login_blocked_disabled', resource: `user:${admin.id}` });
      return HttpResponse.json({ message: 'Hesabınız askıya alınmış.', code: 'account_disabled' }, { status: 403 });
    }
    // Enrolled → challenge for a code.
    if (twoFaEnrolled(admin.id)) {
      const challengeToken = `chal-${admin.id}-${nextId()}`;
      challenges.set(challengeToken, admin.id);
      writeAudit({ actor: `user:${admin.id}`, action: 'auth.2fa_required', resource: `user:${admin.id}` });
      const body: LoginResponse = { requires2fa: true, challengeToken };
      return HttpResponse.json(body);
    }
    // Not enrolled but policy REQUIRES it for this role → mandatory enrollment.
    if (roleRequires2fa(admin.role)) {
      const setupToken = `setup-${admin.id}-${nextId()}`;
      setupChallenges.set(setupToken, admin.id);
      writeAudit({ actor: `user:${admin.id}`, action: 'auth.2fa_setup_required', resource: `user:${admin.id}` });
      const body: LoginResponse = { requires2faSetup: true, setupToken };
      return HttpResponse.json(body);
    }
    // No 2FA → straight session.
    return HttpResponse.json(issueSession(admin));
  }),

  // --- Verify the 2FA code (TOTP code OR a recovery code) -----------------
  http.post(`${API_BASE_URL}/auth/2fa/verify`, async ({ request }) => {
    const parsed = verify2faRequestSchema.safeParse(await request.json());
    if (!parsed.success) return HttpResponse.json({ message: 'Geçersiz istek.' }, { status: 422 });
    const { challengeToken, code } = parsed.data;
    const userId = challenges.get(challengeToken);
    if (!userId) return HttpResponse.json({ message: 'Doğrulama oturumu geçersiz veya süresi dolmuş.' }, { status: 401 });
    const ok = code === DEMO_TOTP_CODE || consumeRecovery(userId, code);
    if (!ok) {
      writeAudit({ actor: `user:${userId}`, action: 'auth.2fa_failed', resource: `user:${userId}` });
      return HttpResponse.json({ message: 'Doğrulama kodu hatalı.' }, { status: 401 });
    }
    const admin = findById(userId);
    if (!admin) return HttpResponse.json({ message: 'Kullanıcı bulunamadı.' }, { status: 401 });
    challenges.delete(challengeToken);
    return HttpResponse.json(issueSession(admin));
  }),

  // --- Mandatory 2FA enrollment at login (no session yet) -----------------
  http.post(`${API_BASE_URL}/auth/2fa/setup-complete`, async ({ request }) => {
    const parsed = setupCompleteSchema.safeParse(await request.json());
    if (!parsed.success) return HttpResponse.json({ message: 'Geçersiz istek.' }, { status: 422 });
    const { setupToken, code } = parsed.data;
    const userId = setupChallenges.get(setupToken);
    if (!userId) return HttpResponse.json({ message: 'Kurulum oturumu geçersiz.' }, { status: 401 });
    if (code !== DEMO_TOTP_CODE) {
      return HttpResponse.json({ message: 'Doğrulama kodu hatalı.' }, { status: 401 });
    }
    const admin = findById(userId);
    if (!admin) return HttpResponse.json({ message: 'Kullanıcı bulunamadı.' }, { status: 401 });
    twoFactorOverrides.set(userId, true);
    setupChallenges.delete(setupToken);
    const codes = genRecoveryCodes(userId);
    writeAudit({ actor: `user:${userId}`, action: 'auth.2fa_enabled', resource: `user:${userId}` });
    const session = issueSession(admin);
    return HttpResponse.json({ ...session, recoveryCodes: codes });
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
      return HttpResponse.json({ message: 'Sıfırlama bağlantısı geçersiz veya süresi dolmuş.' }, { status: 422 });
    }
    passwordOverrides.set(email, password);
    resetTokens.delete(token);
    const admin = findByEmail(email);
    if (admin) writeAudit({ actor: `user:${admin.id}`, action: 'auth.password_reset', resource: `user:${admin.id}` });
    return HttpResponse.json({ ok: true });
  }),

  // --- Invite details -----------------------------------------------------
  http.get(`${API_BASE_URL}/auth/invite`, ({ request }) => {
    const token = new URL(request.url).searchParams.get('token') ?? '';
    const invite = SEED_INVITES.find((i) => i.token === token);
    if (!invite || consumedInvites.has(token)) {
      return HttpResponse.json({ message: 'Davet geçersiz veya kullanılmış.' }, { status: 404 });
    }
    return HttpResponse.json({ email: invite.email, name: invite.name, role: invite.role });
  }),

  // --- Accept invite ------------------------------------------------------
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
    writeAudit({ actor: `user:${admin.id}`, action: 'auth.invite_accepted', resource: `user:${admin.id}` });
    return HttpResponse.json(issueSession(admin));
  }),

  // --- Account security snapshot ------------------------------------------
  http.get(`${API_BASE_URL}/auth/security`, ({ request }) => {
    const admin = adminForRequest(request);
    if (!admin) return HttpResponse.json({ message: 'Oturum bulunamadı.' }, { status: 401 });
    const body: SecurityInfo = {
      totpEnabled: twoFaEnrolled(admin.id),
      totpRequired: roleRequires2fa(admin.role),
      recoveryCodesRemaining: recoveryRemaining(admin.id),
      sessions: sessionsFor(admin.id),
    };
    return HttpResponse.json(body);
  }),

  // --- 2FA policy (super-admin edits which roles must use 2FA) -------------
  http.get(`${API_BASE_URL}/auth/security/policy`, ({ request }) => {
    const admin = adminForRequest(request);
    if (!admin) return HttpResponse.json({ message: 'Oturum bulunamadı.' }, { status: 401 });
    return HttpResponse.json({ requiredRoles: [...twoFactorRequiredRoles] });
  }),

  http.put(`${API_BASE_URL}/auth/security/policy`, async ({ request }) => {
    const admin = adminForRequest(request);
    if (!admin) return HttpResponse.json({ message: 'Oturum bulunamadı.' }, { status: 401 });
    if (admin.role !== 'super-admin') {
      return HttpResponse.json({ message: 'Bu ayarı yalnızca süper admin değiştirebilir.' }, { status: 403 });
    }
    const parsed = twoFactorPolicySchema.safeParse(await request.json());
    if (!parsed.success) return HttpResponse.json({ message: 'Geçersiz istek.' }, { status: 422 });
    twoFactorRequiredRoles = new Set(parsed.data.requiredRoles);
    writeAudit({
      actor: `user:${admin.id}`,
      action: 'auth.2fa_policy_changed',
      resource: 'auth:policy',
      after: { requiredRoles: parsed.data.requiredRoles.join(', ') || '—' },
    });
    return HttpResponse.json({ requiredRoles: [...twoFactorRequiredRoles] });
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

  // --- 2FA: setup / enable / disable / recovery ---------------------------
  http.get(`${API_BASE_URL}/auth/2fa/setup`, ({ request }) => {
    // Reachable with a session (opt-in) OR a mandatory-setup token (login).
    const setupToken = new URL(request.url).searchParams.get('setupToken');
    const ok = adminForRequest(request) || (setupToken && setupChallenges.has(setupToken));
    if (!ok) return HttpResponse.json({ message: 'Yetkisiz.' }, { status: 401 });
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
    const codes = genRecoveryCodes(admin.id);
    writeAudit({ actor: `user:${admin.id}`, action: 'auth.2fa_enabled', resource: `user:${admin.id}` });
    return HttpResponse.json({ codes });
  }),

  http.post(`${API_BASE_URL}/auth/2fa/disable`, ({ request }) => {
    const admin = adminForRequest(request);
    if (!admin) return HttpResponse.json({ message: 'Oturum bulunamadı.' }, { status: 401 });
    if (roleRequires2fa(admin.role)) {
      return HttpResponse.json(
        { message: 'Rol politikası gereği iki adımlı doğrulama kapatılamaz.' },
        { status: 422 },
      );
    }
    twoFactorOverrides.set(admin.id, false);
    recoveryCodes.delete(admin.id);
    writeAudit({ actor: `user:${admin.id}`, action: 'auth.2fa_disabled', resource: `user:${admin.id}` });
    return HttpResponse.json({ ok: true });
  }),

  http.post(`${API_BASE_URL}/auth/2fa/recovery-codes/regenerate`, ({ request }) => {
    const admin = adminForRequest(request);
    if (!admin) return HttpResponse.json({ message: 'Oturum bulunamadı.' }, { status: 401 });
    if (!twoFaEnrolled(admin.id)) {
      return HttpResponse.json({ message: 'Önce iki adımlı doğrulamayı açın.' }, { status: 422 });
    }
    const codes = genRecoveryCodes(admin.id);
    writeAudit({ actor: `user:${admin.id}`, action: 'auth.recovery_codes_regenerated', resource: `user:${admin.id}` });
    return HttpResponse.json({ codes });
  }),

  // --- Sessions -----------------------------------------------------------
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

  // --- Refresh / re-auth --------------------------------------------------
  http.post(`${API_BASE_URL}/auth/refresh`, ({ request }) => {
    const token = bearer(request);
    const admin = adminForRequest(request);
    if (!admin || !token) return HttpResponse.json({ message: 'Oturum bulunamadı.' }, { status: 401 });
    // Rotation is NON-destructive in this mock: mint a fresh token but DO NOT
    // revoke the old one. MSW keeps its handler state per browser TAB while the
    // token lives in SHARED localStorage, so revoking on refresh let one tab
    // invalidate a token another tab was still using → a spurious 401 →
    // /session-expired. A well-formed token now stays valid until an explicit
    // logout; real session hardening belongs to the FastAPI backend, not this
    // single-admin dev mock. Unique per-tab token nonces (see mintSession) keep
    // rotated tokens distinct on top of this.
    const fresh = mintSession(admin.id);
    return HttpResponse.json({ token: fresh });
  }),

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

  // --- Organizations / tenant switcher ------------------------------------
  http.get(`${API_BASE_URL}/auth/organizations`, ({ request }) => {
    const admin = adminForRequest(request);
    if (!admin) return HttpResponse.json({ message: 'Oturum bulunamadı.' }, { status: 401 });
    const ids = orgIdsForAdmin(admin);
    const organizations = SEED_ORGS.filter((o) => ids.includes(o.id));
    const activeOrgId = activeOrgByUser.get(admin.id) ?? organizations[0]?.id ?? DEFAULT_ORG_ID;
    const body: OrganizationsResponse = { organizations, activeOrgId };
    return HttpResponse.json(body);
  }),

  http.post(`${API_BASE_URL}/auth/organizations/active`, async ({ request }) => {
    const admin = adminForRequest(request);
    if (!admin) return HttpResponse.json({ message: 'Oturum bulunamadı.' }, { status: 401 });
    const parsed = z.object({ orgId: z.string().min(1) }).safeParse(await request.json());
    if (!parsed.success) return HttpResponse.json({ message: 'Geçersiz istek.' }, { status: 422 });
    if (!orgIdsForAdmin(admin).includes(parsed.data.orgId)) {
      return HttpResponse.json({ message: 'Bu organizasyona erişiminiz yok.' }, { status: 422 });
    }
    activeOrgByUser.set(admin.id, parsed.data.orgId);
    writeAudit({
      actor: `user:${admin.id}`,
      action: 'auth.org_switched',
      resource: `org:${parsed.data.orgId}`,
    });
    return HttpResponse.json({ activeOrgId: parsed.data.orgId });
  }),
];
