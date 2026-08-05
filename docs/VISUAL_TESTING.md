# Visual & Layout Regression Testing

Guards for the class of bugs behaviour and a11y tests can't see: spacing/alignment
**shifts** ("kayma") and **mobile-view breakage** after a change. Runs inside the
existing Storybook browser (Playwright/Chromium) vitest project — no new tooling.

## Two complementary guards

| Guard | Catches | File |
| --- | --- | --- |
| **Geometric alignment** (`expectColumnsAligned`, `expectPinnedSeamFlush`, `expectAlignedX`) | the ROOT CAUSE — header/body/pinned columns out of alignment. Fast, deterministic, no image baseline, human-readable diff ("differ by 16px"). | `src/test/visual.ts` |
| **Responsive pixel snapshot** (`snapshotAcrossViewports`) — **opt-in, not in the default/CI suite** | the SYMPTOM — anything that moved ≥ threshold, at each breakpoint. | `src/test/visual.ts` |

**Only the geometric guards gate CI.** They use `getBoundingClientRect`, so they
are platform-independent and pass on any machine. Pixel snapshots are NOT wired
into the default suite: `toMatchScreenshot` baselines are per-OS (a macOS baseline
fails on Linux CI), so they need a dedicated env-matched setup — a Docker image
pinned to CI's browser, or a hosted service (Chromatic/Percy). Use
`snapshotAcrossViewports` only inside such a setup, never in a story that the
normal `npm run test` collects.

## Breakpoints (single source of truth)

`src/test/breakpoints.ts` mirrors `src/styles/theme.css` (`@theme --breakpoint-*`)
and `DESIGN_SYSTEM.md`:

```
xs 320 · sm 480 · md 640 · lg 768 · xl 1024 · 2xl 1280 · 3xl 1536 · 4xl 1920
```

`RESPONSIVE_VIEWPORTS` is the default snapshot set — representative points weighted
around the **`xl` (1024) shell/table convergence** (where the layout flips to
drawer + card view), NOT all 8 tokens (8× screenshots is slow and noisy):

```
320 (xs) · 768 (lg) · 1023 (xl−1, off-by-one guard) · 1024 (xl) · 1280 (2xl)
```

Use `CONVERGENCE_VIEWPORTS` (1023/1024) for anything sensitive to that boundary,
or `ALL_VIEWPORTS` when a component genuinely needs exhaustive coverage.

## Add guards to a component

Copy the `VisualGuard` story from `src/test/VisualHarness.stories.tsx`. In a
`play` function:

```ts
import {
  freezeForSnapshot, snapshotAcrossViewports,
  expectColumnsAligned, expectPinnedSeamFlush,
} from '@/test/visual';

export const VisualGuard: Story = {
  play: async () => {
    await freezeForSnapshot();                       // deterministic render
    const h = document.querySelectorAll('[data-testid="hcell"]');
    const b = document.querySelectorAll('[data-testid="bcell"]');
    expectColumnsAligned(h, b);                      // root-cause guard (CI-safe)
    expectPinnedSeamFlush(h[0]!, h[1]!);             // pinned-column seam
    // NOTE: do NOT call snapshotAcrossViewports here — pixel baselines are per-OS
    // and would fail on Linux CI. Add it only in an env-matched setup (below).
  },
};
```

Mark header cells and the first body row's cells with `data-testid="hcell"` /
`data-testid="bcell"` (or pass your own elements to `expectAlignedX`).

## Pixel snapshots (opt-in, env-matched only)

`toMatchScreenshot` writes a reference on first run (failing that run so you
review it), then diffs against it. The baseline filename carries the OS
(`-chromium-darwin` vs `-chromium-linux`), so a baseline made on one platform
**does not exist** on another and the check fails every run there. That is exactly
why pixel snapshots are **not** in the default suite: a macOS-committed baseline
breaks Linux CI on every push.

To use them, run them in the SAME environment that runs them for real:
- a Docker image pinned to CI's browser (generate baselines in it, commit those), or
- a hosted visual-regression service (Chromatic / Percy) that owns the baselines.

Then, inside that setup only, call `snapshotAcrossViewports(...)` and generate
baselines with `npx vitest run --project storybook <story-file> -u`. Until such a
setup exists, rely on the geometric guards + the real-app audit
(`docs/UI_GATE.md`), which need no baseline and are platform-independent.

## Avoiding flaky snapshots (already handled by `freezeForSnapshot`)

- animations/transitions/`caret` are neutralised;
- web fonts are awaited (`document.fonts.ready`) before capture;
- use **seeded MSW data** and avoid live time/relative dates in snapshotted
  surfaces (freeze or mask them);
- `allowedMismatchedPixelRatio` (default `0.01`) absorbs sub-pixel AA noise —
  raise per-story only if a surface is legitimately noisy.

## Definition of Done (tables & responsive surfaces)

Per `DATA_TABLE_SPEC.md`, a data table ships a `VisualGuard` story that runs
`expectColumnsAligned` + `expectPinnedSeamFlush` and `snapshotAcrossViewports`.
Any page whose layout reflows across breakpoints ships responsive snapshots
covering at least `xs`, the `xl` convergence pair, and one desktop width.
