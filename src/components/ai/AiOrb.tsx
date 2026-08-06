import { cn } from '@/lib/utils';
import { DotField } from './DotField';
import './AiAskButton.css';

/** Reference-style asymmetric sparkle (decorative). */
export function SparkleGlyph() {
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

export interface AiOrbProps {
  /** Optional visible label. Omit for the icon-only orb (e.g. the dock logo). */
  label?: string;
  /** Spin the sparkle (busy state). */
  spinning?: boolean;
}

/**
 * The liquid-glass orb's inner layers — animated dot field (+ cursor glow), glass
 * sheen, gradient ring, shine sweep and the centered sparkle (+ optional label).
 * Presentational only: the wrapping element supplies the `--ask-*` tokens and the
 * box via `.ask-btn` (interactive launcher) or `.ask-orb` (icon-only logo). Shared
 * so both surfaces stay visually identical.
 */
export function AiOrb({ label, spinning = false }: AiOrbProps) {
  return (
    <>
      <span className="ask-btn__dots" aria-hidden="true">
        <DotField />
      </span>
      <span className="ask-btn__glass" aria-hidden="true" />
      <span className="ask-btn__ring" aria-hidden="true" />
      <span className="ask-btn__shine" aria-hidden="true" />
      <span className="ask-btn__content">
        <span className={cn('ask-btn__icon', spinning && 'is-spinning')} aria-hidden="true">
          <SparkleGlyph />
        </span>
        {label != null && <span className="ask-btn__label">{label}</span>}
      </span>
    </>
  );
}
