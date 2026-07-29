import * as React from 'react';
import { Lock, TriangleAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldHelp } from '@/components/form/FieldHelp';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface SessionTimeoutModalProps {
  open: boolean;
  onReauth: (password: string) => void;
  onLogout: () => void;
  pending?: boolean;
  errorMessage?: string | null;
}

/**
 * Idle-lock modal. When the session has been idle too long we lock the screen
 * and require the password again (or sign out). Non-dismissible — you cannot
 * click/escape past it back into the app.
 */
export function SessionTimeoutModal({
  open,
  onReauth,
  onLogout,
  pending = false,
  errorMessage,
}: SessionTimeoutModalProps) {
  const [password, setPassword] = React.useState('');

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="size-4" aria-hidden="true" /> Oturum kilitlendi
          </DialogTitle>
          <DialogDescription>
            Bir süre işlem yapılmadı. Devam etmek için şifrenizi girin.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onReauth(password);
          }}
          className="grid gap-3"
        >
          {errorMessage && (
            <div
              role="alert"
              className="border-destructive/35 bg-destructive/10 text-destructive-tint-foreground flex items-start gap-2 rounded-md border px-3 py-2 text-sm"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{errorMessage}</span>
            </div>
          )}
          <div className="grid gap-1.5">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="reauth-password">Şifre</Label>
              <FieldHelp
                label="Şifre hakkında"
                help="Oturumunuzu yeniden açmak için mevcut hesap şifrenizi girin."
              />
            </div>
            <Input
              id="reauth-password"
              type="password"
              autoComplete="current-password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={pending}
              placeholder="••••••••"
              aria-describedby="reauth-password-help"
              data-action="fill-reauth-password"
              data-entity="auth"
            />
            <span id="reauth-password-help" className="sr-only">
              Oturumunuzu yeniden açmak için mevcut hesap şifrenizi girin.
            </span>
          </div>
          <div className="mt-1 flex flex-col gap-2 sm:flex-row-reverse">
            <Button type="submit" loading={pending} data-action="submit-reauth" data-entity="auth">
              Kilidi aç
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onLogout}
              disabled={pending}
              data-action="sign-out"
              data-entity="auth"
            >
              Çıkış yap
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
