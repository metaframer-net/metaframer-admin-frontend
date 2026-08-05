# Visual & Layout Regression Testing

Guards for the class of bugs behaviour and a11y tests can't see: spacing/alignment
**shifts** ("kayma") and **mobile-view breakage** after a change. Runs inside the
existing Storybook browser (Playwright/Chromium) vitest project — no new tooling.

## Two complementary guards

| Guard | Catches | File |
| --- | --- | --- |
| **Geometric alignment** (`expectColumnsAligned`, `expectPinnedSeamFlush`, `expectAlignedX`) | the ROOT CAUSE — header/body/pinned columns out of alignment. Fast, deterministic, no image baseline, human-readable diff ("differ by 16px"). | `src/test/visual.ts` |
| **Responsive pixel snapshot** (`snapshotAcrossViewports`) | the SYMPTOM — anything that moved ≥ threshold, at each breakpoint. | `src/test/visual.ts` |

Prefer the geometric guard where you can express the invariant; add a pixel
snapshot for whole-surface coverage.

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
    expectColumnsAligned(h, b);                      // root-cause guard
    expectPinnedSeamFlush(h[0]!, h[1]!);             // pinned-column seam
    await snapshotAcrossViewports('listings-table');  // responsive snapshots
  },
};
```

Mark header cells and the first body row's cells with `data-testid="hcell"` /
`data-testid="bcell"` (or pass your own elements to `expectAlignedX`).

## Baselines

`toMatchScreenshot` writes a reference on first run (and fails that run so you
review it), then diffs against it. To (re)generate after an intended visual
change:

```
npx vitest run --project storybook <story-file> -u
```

Commit the `src/test/**/__screenshots__/*.png` baselines. Filenames carry the
platform (`-chromium-darwin`), so **generate them in the same environment that
runs CI** — otherwise CI creates its own on first run and fails once. For this
solo/local setup, baselines live on the dev machine.

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
