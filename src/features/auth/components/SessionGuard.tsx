import * as React from 'react';

import { useIdleTimer } from '../use-idle-timer';
import { authErrorMessage, useLogout, useReauth } from '../api/hooks';
import { SessionTimeoutModal } from './SessionTimeoutModal';

/** Default idle window before the session locks (15 minutes). */
const DEFAULT_IDLE_MS = 15 * 60 * 1000;

export interface SessionGuardProps {
  /** Idle window in ms before locking. Overridable for tests/demos. */
  idleMs?: number;
}

/**
 * Session hardening: after a period of inactivity, lock the screen and require
 * the password again (or sign out). Mounted inside the authenticated shell, so
 * it only runs while signed in.
 */
export function SessionGuard({ idleMs = DEFAULT_IDLE_MS }: SessionGuardProps) {
  const [locked, setLocked] = React.useState(false);
  const reauth = useReauth();
  const logout = useLogout();

  // Stop the idle timer while the lock modal is already up.
  useIdleTimer(idleMs, () => setLocked(true), !locked);

  return (
    <SessionTimeoutModal
      open={locked}
      pending={reauth.isPending}
      errorMessage={reauth.isError ? authErrorMessage(reauth.error, 'Şifre hatalı.') : null}
      onReauth={(password) =>
        reauth.mutate(password, {
          onSuccess: () => {
            reauth.reset();
            setLocked(false);
          },
        })
      }
      onLogout={() => logout.mutate()}
    />
  );
}
