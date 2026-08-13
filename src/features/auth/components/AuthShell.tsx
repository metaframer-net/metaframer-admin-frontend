import type { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';

/** Round indigo brand mark (the DockLogo motif, without the dock heartbeat). */
export function BrandMark() {
  return (
    <span
      className="bg-primary text-primary-foreground grid size-9 shrink-0 place-items-center rounded-full"
      aria-hidden="true"
    >
      <Sparkles className="size-5" />
    </span>
  );
}

export interface AuthShellProps {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  /** Optional note under the card (defaults to the standard staff-only line). */
  footer?: ReactNode;
}

/**
 * Shared chrome for every auth page — design variant A ("centered minimal card")
 * on the slate `bg-background` canvas: brand mark + wordmark, a title/subtitle,
 * then the page body. Keeps login, recovery, invite and 2FA visually identical.
 */
export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <main className="bg-background grid min-h-svh place-items-center p-4">
      <div className="animate-scale-in w-full max-w-sm">
        <div className="bg-card text-card-foreground border-border/80 rounded-xl border p-6 shadow-lg sm:p-7">
          <div className="mb-5 flex items-center gap-2.5">
            <BrandMark />
            <div className="leading-tight">
              <div className="font-semibold tracking-tight">example.net</div>
              <div className="text-muted-foreground text-xs">Yönetim Paneli</div>
            </div>
          </div>

          <div className="mb-4">
            <h1 className="text-lg font-semibold">{title}</h1>
            {subtitle && <p className="text-muted-foreground text-sm">{subtitle}</p>}
          </div>

          {children}
        </div>

        {footer ?? (
          <p className="text-muted-foreground mt-4 text-center text-xs">
            Yalnızca yetkili personel içindir. Sorun mu yaşıyorsunuz? BT ekibiyle iletişime geçin.
          </p>
        )}
      </div>
    </main>
  );
}
