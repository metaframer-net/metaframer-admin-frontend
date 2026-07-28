import { Sparkles } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface DockLogoProps {
  /** Size utility for the round badge (e.g. `size-7` desktop, `size-8` mobile). */
  className?: string;
}

/**
 * The round Arsam launcher logo shown in `dock` mode. It carries a continuous
 * heartbeat (lub-dub) pulse (`animate-pulse-soft`) to mark the primary —
 * command-driven — navigation entry point, echoing the reference dock's "living"
 * launcher with OUR tokens (not a palette/glass clone). This lives only inside the
 * dock chrome (CommandDock / DockShell), so the pulse is structurally scoped to dock
 * mode — no runtime gate needed. `prefers-reduced-motion` users are fully protected:
 * the base-layer rule collapses the animation to a single ~0ms cycle AND
 * `motion-reduce:animate-none` removes it entirely (the keyframe starts/ends at
 * scale(1), so there is no residual transform either way).
 */
export function DockLogo({ className }: DockLogoProps) {
  return (
    <span
      className={cn(
        'bg-primary text-primary-foreground animate-pulse-soft flex shrink-0 items-center justify-center rounded-full motion-reduce:animate-none',
        className,
      )}
      data-slot="dock-logo"
      aria-hidden="true"
    >
      <Sparkles className="size-4" />
    </span>
  );
}
