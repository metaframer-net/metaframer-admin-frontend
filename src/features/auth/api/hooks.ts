import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api, ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/auth-context';
import {
  type ForgotPasswordInput,
  type InviteDetails,
  type LoginInput,
  type LoginResponse,
  type SecurityInfo,
  type TwoFactorSetup,
} from '../schemas/auth';

export const securityKeys = {
  info: ['auth', 'security'] as const,
  setup: ['auth', '2fa', 'setup'] as const,
};

/**
 * Extract a human message from a failed request. The mock backend returns
 * `{ message }`; fall back to a generic string otherwise.
 */
export function authErrorMessage(error: unknown, fallback = 'İşlem tamamlanamadı. Lütfen tekrar deneyin.'): string {
  if (error instanceof ApiError) {
    const body = error.body as { message?: string } | undefined;
    if (body?.message) return body.message;
  }
  return fallback;
}

/**
 * Sign in. A pure mutation returning the raw response — the caller (`LoginPage`)
 * branches on `requires2fa` (→ 2FA step) vs `{ token, user }` (→ persist session).
 */
export function useLogin() {
  return useMutation({
    mutationFn: (input: LoginInput) => api.post<LoginResponse>('/auth/login', input),
  });
}

/** Verify the 2FA code; returns `{ token, user }` on success. */
export function useVerify2fa() {
  return useMutation({
    mutationFn: (input: { challengeToken: string; code: string }) =>
      api.post<LoginResponse>('/auth/2fa/verify', input),
  });
}

/** Request a password-reset link. Returns `{ sent, resetToken? }` (mock surfaces
 *  the token in place of a real email). */
export function useForgotPassword() {
  return useMutation({
    mutationFn: (input: ForgotPasswordInput) =>
      api.post<{ sent: boolean; resetToken?: string }>('/auth/forgot-password', input),
  });
}

/** Set a new password from a reset token. */
export function useResetPassword() {
  return useMutation({
    mutationFn: (input: { token: string; password: string }) =>
      api.post<{ ok: boolean }>('/auth/reset-password', input),
    onSuccess: () => toast.success('Şifreniz güncellendi. Yeni şifrenizle giriş yapabilirsiniz.'),
  });
}

/** Resolve a pending invite from its token (to render the accept form). */
export function useInvite(token: string) {
  return useQuery({
    queryKey: ['auth', 'invite', token] as const,
    queryFn: () => api.get<InviteDetails>(`/auth/invite?token=${encodeURIComponent(token)}`),
    enabled: token.length > 0,
    retry: false,
  });
}

/** Accept an invite (set first password); returns `{ token, user }` (auto sign-in). */
export function useAcceptInvite() {
  return useMutation({
    mutationFn: (input: { token: string; password: string }) =>
      api.post<LoginResponse>('/auth/accept-invite', input),
  });
}

// --- Phase 034: account security ------------------------------------------

/** Account-security snapshot (2FA state + active sessions). */
export function useSecurity() {
  return useQuery({
    queryKey: securityKeys.info,
    queryFn: () => api.get<SecurityInfo>('/auth/security'),
  });
}

/** Change the current user's password. */
export function useChangePassword() {
  return useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) =>
      api.post<{ ok: boolean }>('/auth/change-password', input),
    onSuccess: () => toast.success('Şifreniz güncellendi.'),
  });
}

/** Fetch the 2FA enrollment secret/QR (only when the enable flow is open). */
export function use2faSetup(enabled: boolean) {
  return useQuery({
    queryKey: securityKeys.setup,
    queryFn: () => api.get<TwoFactorSetup>('/auth/2fa/setup'),
    enabled,
    staleTime: Infinity,
  });
}

/** Enable 2FA after verifying a code. */
export function useEnable2fa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => api.post<{ ok: boolean }>('/auth/2fa/enable', { code }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: securityKeys.info });
      toast.success('İki adımlı doğrulama açıldı.');
    },
  });
}

/** Disable 2FA. */
export function useDisable2fa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ ok: boolean }>('/auth/2fa/disable'),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: securityKeys.info });
      toast.success('İki adımlı doğrulama kapatıldı.');
    },
  });
}

/** Revoke a single other session. */
export function useRevokeSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ ok: boolean }>(`/auth/sessions/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: securityKeys.info });
      toast.success('Oturum kapatıldı.');
    },
  });
}

/** Sign out every other session/device. */
export function useRevokeOtherSessions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ ok: boolean }>('/auth/sessions/revoke-others'),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: securityKeys.info });
      toast.success('Diğer tüm oturumlar kapatıldı.');
    },
  });
}

/** Re-authenticate with the current password (idle-lock unlock). */
export function useReauth() {
  return useMutation({
    mutationFn: (password: string) => api.post<{ ok: boolean }>('/auth/reauth', { password }),
  });
}

/** Sign out. Clears the session client-side even if the request fails. */
export function useLogout() {
  const { clearSession } = useAuth();
  return useMutation({
    mutationFn: () => api.post<void>('/auth/logout'),
    onSettled: () => {
      clearSession();
      toast.success('Çıkış yapıldı.');
    },
  });
}
