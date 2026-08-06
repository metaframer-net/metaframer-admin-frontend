import type { ComponentProps, CSSProperties } from 'react';

import { cn } from '@/lib/utils';
import { AiOrb } from './AiOrb';
import './AiAskButton.css';

export interface AiAskButtonProps extends Omit<ComponentProps<'button'>, 'children'> {
  /** Visible + accessible label. */
  label?: string;
  /** Diameter in px. */
  size?: number;
  /**
   * Busy state: swaps the label for `loadingLabel` and spins the sparkle icon
   * (mirrors the reference button's "Thinking" state).
   */
  loading?: boolean;
  /** Label shown while `loading`. */
  loadingLabel?: string;
}

/**
 * Liquid-glass circular "Ask AI" launcher. The visible label doubles as the
 * accessible name (the sparkle + dot field are decorative). Carries the
 * `data-action`/`data-entity` AI-first hooks by default; callers wire `onClick`
 * to open the assistant. Positioning (e.g. `fixed`) is passed via `className`.
 * The visual orb ({@link AiOrb}) is shared with the dock logo so both surfaces
 * stay identical, re-derived in OUR tokens.
 */
export function AiAskButton({
  label = 'Ask AI',
  size = 84,
  loading = false,
  loadingLabel = 'Thinking',
  className,
  style,
  ...props
}: AiAskButtonProps) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-busy={loading || undefined}
      data-action="open-assistant"
      data-entity="assistant"
      {...props}
      className={cn('ask-btn', loading && 'is-loading', className)}
      style={{ '--ask-size': `${size}px`, ...style } as CSSProperties}
    >
      <AiOrb label={loading ? loadingLabel : label} spinning={loading} />
    </button>
  );
}
