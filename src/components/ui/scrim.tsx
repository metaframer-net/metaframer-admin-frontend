import { cn } from '@/lib/utils';

interface ScrimProps {
  open: boolean;
  /** Called when the scrim itself is clicked (dismiss). */
  onClick?: (() => void) | undefined;
  /** Opening duration in ms. Default: 300. */
  openDuration?: number | undefined;
  /** Closing duration in ms. Default: 280. */
  closeDuration?: number | undefined;
  /** Opening easing. Default: ease-out. */
  openEasing?: string | undefined;
  /** Closing easing. Default: ease-in. */
  closeEasing?: string | undefined;
  /** z-index. Default: 35. */
  zIndex?: number | undefined;
  /** Extra className. */
  className?: string | undefined;
}

/**
 * Shared backdrop overlay. Animates only `opacity` (blur is constant)
 * for jank-free compositing. `will-change: opacity` is set while
 * transitioning and removed once settled.
 *
 * Used by DockShell, CommandDock, and the EdgeDock bottom scrim.
 */
export function Scrim({
  open,
  onClick,
  openDuration = 300,
  closeDuration = 280,
  openEasing = 'ease-out',
  closeEasing = 'cubic-bezier(0.4, 0, 1, 1)',
  zIndex = 35,
  className,
}: ScrimProps) {
  const duration = open ? openDuration : closeDuration;
  const easing = open ? openEasing : closeEasing;

  return (
    <div
      className={cn(
        'fixed inset-0 bg-scrim backdrop-blur-sm',
        open ? 'opacity-100' : 'pointer-events-none opacity-0',
        className,
      )}
      style={{
        zIndex,
        transition: `opacity ${duration}ms ${easing}`,
        willChange: 'opacity',
      }}
      onClick={onClick}
      aria-hidden="true"
    />
  );
}
