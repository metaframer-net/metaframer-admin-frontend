import * as React from 'react';
import { Copy, ShieldCheck, TriangleAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';

export interface RecoveryCodesProps {
  codes: string[];
  /** Shown as the primary button; calling it usually closes/advances the flow. */
  onDone?: () => void;
  doneLabel?: string;
}

/**
 * One-time recovery codes, shown right after 2FA enrollment. These let a user in
 * if they lose their authenticator. Presentational: the parent owns `onDone`.
 */
export function RecoveryCodes({ codes, onDone, doneLabel = 'Kaydettim, devam et' }: RecoveryCodesProps) {
  const [copied, setCopied] = React.useState(false);

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(codes.join('\n'));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — codes are visible to copy manually */
    }
  };

  return (
    <div className="grid gap-3">
      <div className="border-warning/40 bg-warning/10 text-warning-foreground flex items-start gap-2 rounded-md border px-3 py-2 text-sm">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          Bu kurtarma kodları <strong>yalnızca bir kez</strong> gösterilir. Güvenli bir yerde saklayın;
          telefonunuza erişemezseniz giriş için kullanılır.
        </span>
      </div>

      <ul className="border-border bg-muted grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-md border p-3 font-mono text-sm tabular-nums">
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>

      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        {onDone && (
          <Button onClick={onDone} data-action="confirm-recovery-codes" data-entity="auth">
            <ShieldCheck className="size-4" /> {doneLabel}
          </Button>
        )}
        <Button variant="outline" onClick={() => void copyAll()} data-action="copy-recovery-codes" data-entity="auth">
          <Copy className="size-4" /> {copied ? 'Kopyalandı ✓' : 'Kodları kopyala'}
        </Button>
      </div>
    </div>
  );
}
