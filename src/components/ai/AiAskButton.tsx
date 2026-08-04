import type { ComponentProps, CSSProperties } from 'react';

import { cn } from '@/lib/utils';
import { DotField } from './DotField';
import './AiAskButton.css';

/** Reference-style asymmetric sparkle (decorative). */
function SparkleGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M12 3L13.9 8.6L19.5 10.5L13.9 12.4L12 18L10.1 12.4L4.5 10.5L10.1 8.6L12 3Z"
        fill="currentColor"
      />
      <path d="M19 14L19.7 16.1L21.8 16.8L19.7 17.5L19 19.6L18.3 17.5L16.2 16.8L18.3 16.1L19 14Z" fill="currentColor" />
      <path d="M5 4L5.7 6.1L7.8 6.8L5.7 7.5L5 9.6L4.3 7.5L2.2 6.8L4.3 6.1L5 4Z" fill="currentColor" />
    </svg>
  );
}

export interface AiAskButtonProps extends Omit<ComponentProps<'button'>, 'children'> {
  /** Visible + accessible label. */
  label?: string;
  /** Diameter in px. */
  size?: number;
}

/**
 * Liquid-glass circular "Ask AI" launcher. The visible label doubles as the
 * accessible name (the sparkle + dot field are decorative). Carries the
 * `data-action`/`data-entity` AI-first hooks by default; callers wire `onClick`
 * to open the assistant. Positioning (e.g. `fixed`) is passed via `className`.
 */
export function AiAskButton({
  label = 'Ask AI',
  size = 84,
  className,
  style,
  ...props
}: AiAskButtonProps) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      data-action="open-assistant"
      data-entity="assistant"
      {...props}
      className={cn('ask-btn', className)}
      style={{ '--ask-size': `${size}px`, ...style } as CSSProperties}
    >
      <span className="ask-btn__dots" aria-hidden="true">
        <DotField />
      </span>
      <span className="ask-btn__glass" aria-hidden="true" />
      <span className="ask-btn__ring" aria-hidden="true" />
      <span className="ask-btn__shine" aria-hidden="true" />
      <span className="ask-btn__content">
        <span className="ask-btn__icon" aria-hidden="true">
          <SparkleGlyph />
        </span>
        <span className="ask-btn__label">{label}</span>
      </span>
    </button>
  );
}
