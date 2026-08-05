import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AuthShell } from './AuthShell';

type Tone = 'muted' | 'destructive' | 'warning' | 'success';

const TONE: Record<Tone, string> = {
  muted: 'text-muted-foreground',
  destructive: 'text-destructive-tint-foreground',
  warning: 'text-warning-foreground',
  success: 'text-success',
};

export interface AuthStatusAction {
  label: string;
  to: string;
}

export interface AuthStatusPageProps {
  icon: LucideIcon;
  iconTone?: Tone;
  title: string;
  subtitle?: ReactNode;
  message: ReactNode;
  action: AuthStatusAction;
  /** Optional secondary link under the primary action. */
  secondary?: AuthStatusAction;
}

/**
 * Shared layout for the auth status/error surfaces (session-expired, disabled,
 * unauthorized, generic error). Same AuthShell chrome as the rest of auth so
 * these read as part of the flow, not a system crash page.
 */
export function AuthStatusPage({
  icon: Icon,
  iconTone = 'muted',
  title,
  subtitle,
  message,
  action,
  secondary,
}: AuthStatusPageProps) {
  return (
    <AuthShell title={title} subtitle={subtitle}>
      <div className="text-muted-foreground mb-4 flex items-start gap-2 text-sm">
        <Icon className={cn('mt-0.5 size-4 shrink-0', TONE[iconTone])} aria-hidden="true" />
        <p>{message}</p>
      </div>
      <Button asChild size="lg" className="w-full" data-action="navigate" data-entity="auth">
        <Link to={action.to}>{action.label}</Link>
      </Button>
      {secondary && (
        <div className="mt-4 text-center">
          <Link
            to={secondary.to}
            className="text-primary text-sm font-medium hover:underline"
            data-action="navigate"
            data-entity="auth"
          >
            {secondary.label}
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
