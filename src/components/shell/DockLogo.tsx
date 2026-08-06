import { cn } from '@/lib/utils';
import { AiOrb } from '@/components/ai/AiOrb';

export interface DockLogoProps {
  /** Size utility for the round orb (e.g. `size-7` desktop, `size-8` mobile). */
  className?: string;
}

/**
 * The round Arsam launcher logo shown in `dock` mode — the liquid-glass AI orb
 * ({@link AiOrb}), icon-only (no label). The sparkle sits centered at 50% of the
 * box; on top of the animated dot field it carries a continuous heartbeat (lub-dub)
 * pulse (`animate-pulse-strong`, scale 1 → 1.22). Nothing on the path up to the dock
 * island clips it, so the beat grows PAST the gray brand surface as it expands and
 * settles back INSIDE it at rest. It lives only inside the dock chrome
 * (CommandDock), whose enclosing brand button opens the "Ara… Sor…" command center
 * on click. Decorative (`aria-hidden`): the adjacent brand button carries the
 * accessible name. Reduced-motion drops the pulse.
 */
export function DockLogo({ className }: DockLogoProps) {
  return (
    <span
      className={cn('ask-orb shrink-0 animate-pulse-strong motion-reduce:animate-none', className)}
      data-slot="dock-logo"
      aria-hidden="true"
    >
      <AiOrb />
    </span>
  );
}
