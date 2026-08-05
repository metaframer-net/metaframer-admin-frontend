import * as React from 'react';
import { KeyRound, Loader2, Monitor, ShieldCheck, ShieldOff } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useSession } from '@/lib/permissions/permission-context';
import { useAuditFor } from '@/features/audit/api/queries';
import { AuditTimeline } from '@/features/audit';
import { ChangePasswordForm } from '../components/ChangePasswordForm';
import { TwoFactorForm } from '../components/TwoFactorForm';
import { RecoveryCodes } from '../components/RecoveryCodes';
import {
  authErrorMessage,
  use2faSetup,
  useChangePassword,
  useDisable2fa,
  useEnable2fa,
  useRegenerateRecoveryCodes,
  useRevokeOtherSessions,
  useRevokeSession,
  useSecurity,
} from '../api/hooks';

/**
 * Account security — change password, manage 2FA, review active sessions, and
 * see recent security activity for the signed-in admin.
 */
export function AccountSecurityPage() {
  const { user } = useSession();
  const security = useSecurity();
  const changePassword = useChangePassword();
  const enable2fa = useEnable2fa();
  const disable2fa = useDisable2fa();
  const revokeSession = useRevokeSession();
  const revokeOthers = useRevokeOtherSessions();

  const regenerate = useRegenerateRecoveryCodes();
  const [enrollOpen, setEnrollOpen] = React.useState(false);
  const [enrollCodes, setEnrollCodes] = React.useState<string[] | null>(null);
  const [regenCodes, setRegenCodes] = React.useState<string[] | null>(null);
  const [disableOpen, setDisableOpen] = React.useState(false);
  const [revokeAllOpen, setRevokeAllOpen] = React.useState(false);
  const setup = use2faSetup(enrollOpen);

  const info = security.data;
  const activity = useAuditFor(`user:${user.id}`).filter((e) => e.action.startsWith('auth.'));

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 xl:p-6">
      <header>
        <h1 className="text-xl font-semibold">Hesap ve güvenlik</h1>
        <p className="text-muted-foreground text-sm">
          Şifrenizi, iki adımlı doğrulamanızı ve aktif oturumlarınızı yönetin.
        </p>
      </header>

      {/* --- Change password --- */}
      <Card>
        <CardHeader>
          <CardTitle>Şifre</CardTitle>
          <CardDescription>Hesabınızın şifresini güncelleyin.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm
            onSubmit={(values) =>
              changePassword.mutate(values, { onSuccess: () => changePassword.reset() })
            }
            pending={changePassword.isPending}
            errorMessage={changePassword.isError ? authErrorMessage(changePassword.error) : null}
          />
        </CardContent>
      </Card>

      {/* --- Two-factor authentication --- */}
      <Card>
        <CardHeader>
          <CardTitle>İki adımlı doğrulama</CardTitle>
          <CardDescription>
            Girişte şifrenize ek olarak tek kullanımlık bir kod ister.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {security.isPending ? (
            <div className="text-muted-foreground flex items-center gap-2 text-sm" role="status">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Yükleniyor…
            </div>
          ) : !info ? (
            <p className="text-destructive-tint-foreground text-sm" role="alert">
              Güvenlik bilgileri yüklenemedi.
            </p>
          ) : info.totpEnabled ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm">
                  <ShieldCheck className="text-success size-4" aria-hidden="true" />
                  <Badge variant="secondary">Etkin</Badge>
                  İki adımlı doğrulama açık.
                </span>
                {info.totpRequired ? (
                  <span className="text-muted-foreground text-xs">Rol politikası gereği zorunlu</span>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setDisableOpen(true)}
                    data-action="disable-2fa"
                    data-entity="auth"
                  >
                    <ShieldOff className="size-4" /> Kapat
                  </Button>
                )}
              </div>
              <div className="border-border flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                <span className="text-muted-foreground flex items-center gap-2 text-sm">
                  <KeyRound className="size-4" aria-hidden="true" />
                  {info.recoveryCodesRemaining} kurtarma kodu kaldı
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => regenerate.mutate(undefined, { onSuccess: (r) => setRegenCodes(r.codes) })}
                  disabled={regenerate.isPending}
                  data-action="regenerate-recovery-codes"
                  data-entity="auth"
                >
                  Kurtarma kodlarını yenile
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm">
                <ShieldOff className="text-muted-foreground size-4" aria-hidden="true" />
                <Badge variant="outline">Kapalı</Badge>
                {info.totpRequired
                  ? 'Rol politikanız gereği açmanız gerekiyor.'
                  : 'Hesabınızı daha güvenli hale getirin.'}
              </span>
              <Button onClick={() => setEnrollOpen(true)} data-action="enable-2fa" data-entity="auth">
                <ShieldCheck className="size-4" /> Aç
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* --- Active sessions --- */}
      <Card>
        <CardHeader>
          <CardTitle>Aktif oturumlar</CardTitle>
          <CardDescription>Hesabınızın açık olduğu cihazlar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {security.isPending ? (
            <div className="text-muted-foreground flex items-center gap-2 text-sm" role="status">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Yükleniyor…
            </div>
          ) : !info ? (
            <p className="text-destructive-tint-foreground text-sm" role="alert">
              Oturumlar yüklenemedi.
            </p>
          ) : (
            <>
              <ul className="divide-border divide-y">
                {info.sessions.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 py-2.5">
                    <Monitor className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        {s.device}
                        {s.current && <Badge variant="secondary">Bu oturum</Badge>}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {s.location} · {s.lastActive}
                      </div>
                    </div>
                    {!s.current && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => revokeSession.mutate(s.id)}
                        disabled={revokeSession.isPending}
                        data-action="revoke-session"
                        data-entity="auth"
                      >
                        Kapat
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
              {info.sessions.some((s) => !s.current) && (
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setRevokeAllOpen(true)}
                    data-action="revoke-other-sessions"
                    data-entity="auth"
                  >
                    Diğer oturumları kapat
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* --- Security activity --- */}
      <Card>
        <CardHeader>
          <CardTitle>Son güvenlik etkinliği</CardTitle>
          <CardDescription>Bu oturumdaki kimlik doğrulama olayları.</CardDescription>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <EmptyState
              title="Henüz etkinlik yok"
              description="Bu oturumda kaydedilen bir güvenlik olayı bulunmuyor."
            />
          ) : (
            <AuditTimeline entries={activity} />
          )}
        </CardContent>
      </Card>

      {/* --- Enable 2FA dialog (verify code → show recovery codes) --- */}
      <Dialog
        open={enrollOpen}
        onOpenChange={(o) => {
          setEnrollOpen(o);
          if (!o) setEnrollCodes(null);
        }}
      >
        <DialogContent>
          {enrollCodes ? (
            <>
              <DialogHeader>
                <DialogTitle>Kurtarma kodlarınız</DialogTitle>
                <DialogDescription>
                  Telefonunuza erişemezseniz giriş için bu kodları kullanın.
                </DialogDescription>
              </DialogHeader>
              <RecoveryCodes
                codes={enrollCodes}
                doneLabel="Tamam"
                onDone={() => {
                  setEnrollOpen(false);
                  setEnrollCodes(null);
                }}
              />
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>İki adımlı doğrulamayı aç</DialogTitle>
                <DialogDescription>
                  Kimlik doğrulama uygulamanıza gizli anahtarı ekleyin, ardından ürettiği kodu girin.
                </DialogDescription>
              </DialogHeader>
              {setup.data && (
                <div className="border-border bg-muted mb-2 rounded-md border p-3 text-sm">
                  <p className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
                    Gizli anahtar (demo)
                  </p>
                  <code className="font-mono break-all">{setup.data.secret}</code>
                </div>
              )}
              <TwoFactorForm
                onSubmit={(code) =>
                  enable2fa.mutate(code, { onSuccess: (res) => setEnrollCodes(res.codes) })
                }
                pending={enable2fa.isPending}
                errorMessage={enable2fa.isError ? authErrorMessage(enable2fa.error, 'Doğrulama kodu hatalı.') : null}
              />
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* --- Regenerated recovery codes dialog --- */}
      <Dialog open={regenCodes != null} onOpenChange={(o) => { if (!o) setRegenCodes(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni kurtarma kodları</DialogTitle>
            <DialogDescription>Eski kodlar artık geçersiz. Bunları güvenle saklayın.</DialogDescription>
          </DialogHeader>
          {regenCodes && (
            <RecoveryCodes codes={regenCodes} doneLabel="Tamam" onDone={() => setRegenCodes(null)} />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={disableOpen}
        onOpenChange={setDisableOpen}
        title="İki adımlı doğrulamayı kapat?"
        description="Hesabınız yalnızca şifreyle korunacak. Yine de kapatmak istiyor musunuz?"
        confirmLabel="Kapat"
        destructive
        onConfirm={() => disable2fa.mutate()}
      />

      <ConfirmDialog
        open={revokeAllOpen}
        onOpenChange={setRevokeAllOpen}
        title="Diğer oturumları kapat?"
        description="Bu cihaz dışındaki tüm oturumlar sonlandırılacak."
        confirmLabel="Hepsini kapat"
        destructive
        onConfirm={() => revokeOthers.mutate()}
      />
    </div>
  );
}
