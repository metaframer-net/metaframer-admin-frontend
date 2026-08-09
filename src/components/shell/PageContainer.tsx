import type { ReactNode } from 'react';
import { useMatches } from 'react-router-dom';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';
import { hasRouteMeta } from '@/app/route-meta';

/**
 * The single place the "pages live at 80% width" rule is expressed.
 *
 * - `contained` (default): below `xl` (1024) the content fills the shell's
 *   `<main>`; from `xl` up it centers at 80% (≈10% gutters each side) and stops
 *   growing at the `--container-page` cap (`max-w-page`) so line lengths stay
 *   readable on ultra-wide displays.
 * - `full`: edge-to-edge, no centering or cap.
 *
 * Change the width/cap/breakpoint here (and `--container-page` in theme.css);
 * nothing is baked into individual pages. A page opts out per-route by setting
 * `routeMeta.fullWidth: true`, which this component reads from the active match.
 */
const pageContainerVariants = cva('w-full', {
  variants: {
    variant: {
      contained: 'xl:mx-auto xl:w-4/5 xl:max-w-page',
      full: '',
    },
  },
  defaultVariants: { variant: 'contained' },
});

export interface PageContainerProps
  extends VariantProps<typeof pageContainerVariants> {
  children: ReactNode;
  /**
   * Explicit override. When omitted, the variant is derived from the active
   * route's `routeMeta.fullWidth` (default `contained`). Pass this in stories or
   * standalone usage where there is no route to read from.
   */
  variant?: 'contained' | 'full';
  className?: string;
}

/** True when any matched route flags `routeMeta.fullWidth`. */
function useRouteFullWidth(): boolean {
  const matches = useMatches();
  return matches.some(
    (m) => hasRouteMeta(m.handle) && m.handle.routeMeta.fullWidth === true,
  );
}

export function PageContainer({
  children,
  variant,
  className,
}: PageContainerProps) {
  const routeFullWidth = useRouteFullWidth();
  const resolved = variant ?? (routeFullWidth ? 'full' : 'contained');

  return (
    <div
      data-slot="page-container"
      data-variant={resolved}
      className={cn(pageContainerVariants({ variant: resolved }), className)}
    >
      {children}
    </div>
  );
}
