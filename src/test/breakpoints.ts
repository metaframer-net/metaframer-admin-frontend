/**
 * Breakpoint tokens — the SINGLE source of truth for responsive test viewports,
 * kept in lock-step with `src/styles/theme.css` (`@theme --breakpoint-*`) and
 * `docs/DESIGN_SYSTEM.md`. If a token pixel value changes there, change it here.
 *
 *   xs 320 · sm 480 · md 640 · lg 768 · xl 1024 · 2xl 1280 · 3xl 1536 · 4xl 1920
 *
 * Layout note (DESIGN_SYSTEM.md): both shells AND the data table converge to the
 * drawer + bottom-nav / card view BELOW `xl` (1024). That 1023↔1024 boundary is
 * where most responsive shift/misalignment bugs surface, so it is a first-class
 * snapshot viewport below.
 */
export const BREAKPOINTS = {
  xs: 320,
  sm: 480,
  md: 640,
  lg: 768,
  xl: 1024,
  '2xl': 1280,
  '3xl': 1536,
  '4xl': 1920,
} as const;

export type BreakpointName = keyof typeof BREAKPOINTS;

/** Height paired with each snapshot viewport (tall enough to avoid clipping). */
const SNAPSHOT_HEIGHT = 900;

export interface Viewport {
  readonly name: string;
  readonly width: number;
  readonly height: number;
}

const vp = (name: string, width: number, height = SNAPSHOT_HEIGHT): Viewport => ({
  name,
  width,
  height,
});

/**
 * Default responsive snapshot set — representative points across the distinct
 * layout regimes, weighted around the `xl` (1024) shell/table convergence rather
 * than every one of the 8 tokens (8× screenshots per story is slow and noisy).
 *
 *   320 (xs, phone min) · 768 (lg, tablet, still converged) ·
 *   1023 (xl−1, just BELOW convergence — off-by-one guard) ·
 *   1024 (xl, desktop/table view begins) · 1280 (2xl, desktop)
 */
export const RESPONSIVE_VIEWPORTS: readonly Viewport[] = [
  vp('xs-320', BREAKPOINTS.xs),
  vp('lg-768', BREAKPOINTS.lg),
  vp('xl-minus-1-1023', BREAKPOINTS.xl - 1),
  vp('xl-1024', BREAKPOINTS.xl),
  vp('2xl-1280', BREAKPOINTS['2xl']),
];

/** Every token, for components that need exhaustive breakpoint coverage. */
export const ALL_VIEWPORTS: readonly Viewport[] = (
  Object.entries(BREAKPOINTS) as Array<[BreakpointName, number]>
).map(([name, width]) => vp(`${name}-${width}`, width));

/** The two viewports straddling the shell/table convergence (1023 vs 1024). */
export const CONVERGENCE_VIEWPORTS: readonly Viewport[] = [
  vp('xl-minus-1-1023', BREAKPOINTS.xl - 1),
  vp('xl-1024', BREAKPOINTS.xl),
];
