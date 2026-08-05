import type { Role } from '@/lib/permissions/permissions';
import type { SessionUser } from '@/lib/auth/auth-context';

/**
 * Seed admin accounts for the mock backend — one per role so every RBAC path is
 * reachable by logging in.
 *
 * MOCK NOTE: passwords are PLAIN TEXT on purpose. This is a frontend-only
 * simulation (MSW); real password hashing/verification arrives with the FastAPI
 * backend. Do NOT model production auth on this seed. A single shared demo
 * password keeps manual testing simple.
 */
export interface SeedAdmin extends SessionUser {
  password: string;
  /** When true, the account is 2FA-enrolled in the seed (phase 033). */
  totpEnabled?: boolean;
  /** When true, the account is suspended — login is blocked (phase 036). */
  disabled?: boolean;
  /** Organization ids the admin belongs to (phase 037). Defaults to the main org. */
  orgs?: string[];
}

/** Seed tenants/organizations for the switcher. */
export interface SeedOrg {
  id: string;
  name: string;
}

export const SEED_ORGS: SeedOrg[] = [
  { id: 'org-main', name: 'arsam.net' },
  { id: 'org-corp', name: 'arsam Kurumsal' },
  { id: 'org-ege', name: 'arsam Ege Bölge' },
];

/** The org every admin belongs to unless the seed says otherwise. */
export const DEFAULT_ORG_ID = 'org-main';

/** Shared demo password for every seeded admin (mock only). */
export const DEMO_PASSWORD = 'arsam1234';

/** The only TOTP code the mock 2FA verifier accepts (no real TOTP secret/clock). */
export const DEMO_TOTP_CODE = '123456';

/**
 * Seed 2FA policy: roles that MUST use 2FA. Members are forced to enrol at
 * login; everyone else may opt in. Editable at runtime by super-admin (Settings
 * → Güvenlik). This REPLACES the old per-seed hardcode as the reason a user is
 * asked for a code — 2FA is now policy-driven, not baked into one account.
 */
export const TWO_FACTOR_REQUIRED_ROLES: Role[] = ['super-admin', 'finance'];

export const SEED_ADMINS: SeedAdmin[] = [
  // Super-admin has 2FA enabled so the /login/2fa step is reachable in the demo.
  { id: 'u-1', name: 'Ahmet Yönetici', email: 'super@arsam.net', role: 'super-admin', password: DEMO_PASSWORD, totpEnabled: true, orgs: ['org-main', 'org-corp', 'org-ege'] },
  { id: 'u-2', name: 'Merve Moderatör', email: 'moderator@arsam.net', role: 'moderator', password: DEMO_PASSWORD },
  { id: 'u-3', name: 'Selin Destek', email: 'support@arsam.net', role: 'support', password: DEMO_PASSWORD },
  { id: 'u-4', name: 'Kaan Finans', email: 'finance@arsam.net', role: 'finance', password: DEMO_PASSWORD },
  { id: 'u-5', name: 'Deniz Analist', email: 'analyst@arsam.net', role: 'analyst', password: DEMO_PASSWORD },
  // Suspended account — valid credentials but login is blocked (demo of /account/disabled).
  { id: 'u-6', name: 'Askıya Alınmış Kullanıcı', email: 'disabled@arsam.net', role: 'support', password: DEMO_PASSWORD, disabled: true },
];

/** A pending invite seed so /accept-invite is demoable end-to-end. */
export interface SeedInvite {
  token: string;
  email: string;
  name: string;
  role: Role;
}

export const SEED_INVITES: SeedInvite[] = [
  { token: 'invite-demo', email: 'yeni.admin@arsam.net', name: 'Yeni Yönetici', role: 'moderator' },
];

/** Strip server-only fields before a seed admin crosses the API boundary. */
export function toSessionUser(admin: SeedAdmin): SessionUser {
  const {
    password: _password,
    totpEnabled: _totpEnabled,
    disabled: _disabled,
    orgs: _orgs,
    ...user
  } = admin;
  return user;
}
