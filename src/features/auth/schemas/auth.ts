import { z } from 'zod';

import { ROLES, type Role } from '@/lib/permissions/permissions';
import type { SessionUser } from '@/lib/auth/auth-context';

const roleEnum = z.enum(ROLES as [Role, ...Role[]]);

/** Credentials submitted by the login form. `remember` is form-only (UI hint). */
export const loginSchema = z.object({
  email: z.string().min(1, 'E-posta adresi gerekli.').email('Geçerli bir e-posta adresi girin.'),
  password: z.string().min(1, 'Şifre gerekli.'),
  remember: z.boolean().optional(),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** The signed-in user, validated on the wire. Mirrors `SessionUser` exactly. */
export const sessionUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: roleEnum,
}) satisfies z.ZodType<SessionUser>;

/**
 * Response of `POST /auth/login`. Two shapes share one object:
 *  - completed sign-in → `{ token, user }`,
 *  - a 2FA challenge (phase 033) → `{ requires2fa: true, challengeToken }` with no
 *    session token yet; the client hands `challengeToken` to `/login/2fa`.
 * All fields are optional so both shapes validate; the client branches on
 * `requires2fa`.
 */
export const loginResponseSchema = z.object({
  token: z.string().optional(),
  user: sessionUserSchema.optional(),
  requires2fa: z.boolean().optional(),
  challengeToken: z.string().optional(),
});
export type LoginResponse = z.infer<typeof loginResponseSchema>;

// ---------------------------------------------------------------------------
// Phase 033 — recovery, invite & 2FA
// ---------------------------------------------------------------------------

/** Request a password-reset link. */
export const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'E-posta adresi gerekli.').email('Geçerli bir e-posta adresi girin.'),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/** Shared "set a new password" shape (reset + accept-invite). Enforces a minimum
 *  strength and a matching confirmation. */
export const setPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Şifre en az 8 karakter olmalı.')
      .regex(/[A-Za-zÇĞİÖŞÜçğıöşü]/, 'En az bir harf içermeli.')
      .regex(/[0-9]/, 'En az bir rakam içermeli.'),
    confirm: z.string().min(1, 'Şifreyi tekrar girin.'),
  })
  .refine((v) => v.password === v.confirm, {
    message: 'Şifreler eşleşmiyor.',
    path: ['confirm'],
  });
export type SetPasswordInput = z.infer<typeof setPasswordSchema>;

/** The 6-digit TOTP code entered at the 2FA step. */
export const twoFactorSchema = z.object({
  code: z
    .string()
    .min(1, 'Doğrulama kodu gerekli.')
    .regex(/^\d{6}$/, '6 haneli kodu girin.'),
});
export type TwoFactorInput = z.infer<typeof twoFactorSchema>;

/** Details of a pending admin invite (resolved from an invite token). */
export const inviteDetailsSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  role: roleEnum,
});
export type InviteDetails = z.infer<typeof inviteDetailsSchema>;

// ---------------------------------------------------------------------------
// Phase 034 — account security & session hardening
// ---------------------------------------------------------------------------

/** Change the current user's password (requires the current one). */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Mevcut şifre gerekli.'),
    newPassword: z
      .string()
      .min(8, 'Şifre en az 8 karakter olmalı.')
      .regex(/[A-Za-zÇĞİÖŞÜçğıöşü]/, 'En az bir harf içermeli.')
      .regex(/[0-9]/, 'En az bir rakam içermeli.'),
    confirm: z.string().min(1, 'Şifreyi tekrar girin.'),
  })
  .refine((v) => v.newPassword === v.confirm, {
    message: 'Şifreler eşleşmiyor.',
    path: ['confirm'],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/** Re-authenticate (idle lock) with the current password. */
export const reauthSchema = z.object({
  password: z.string().min(1, 'Şifre gerekli.'),
});
export type ReauthInput = z.infer<typeof reauthSchema>;

/** One active session/device for the current user. */
export const activeSessionSchema = z.object({
  id: z.string(),
  device: z.string(),
  location: z.string(),
  lastActive: z.string(),
  current: z.boolean(),
});
export type ActiveSession = z.infer<typeof activeSessionSchema>;

/** Snapshot for the account-security page. */
export interface SecurityInfo {
  totpEnabled: boolean;
  sessions: ActiveSession[];
}

/** 2FA enrollment payload (mock QR/secret to display before confirming). */
export interface TwoFactorSetup {
  secret: string;
  otpauth: string;
}
