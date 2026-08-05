/**
 * Visual + layout regression helpers for the Storybook browser (Playwright) test
 * project. Two complementary guards against the "kayma" (shift/misalignment)
 * class of bugs that behaviour and a11y tests can't see:
 *
 *  1. `snapshotAcrossViewports` — pixel snapshots at the DESIGN_SYSTEM breakpoints
 *     (see `breakpoints.ts`). Catches the SYMPTOM (anything moved by ≥ threshold).
 *  2. `expectAlignedX` / `expectColumnsAligned` — geometric assertions via
 *     `getBoundingClientRect()`. Catch the ROOT CAUSE (header/body/pinned columns
 *     out of alignment) deterministically, without the flakiness of pixel diffs.
 *
 * Browser-only: these import `@vitest/browser/context` and must run in the
 * `storybook` vitest project (a real Chromium), e.g. from a story `play` fn.
 */
import { page } from 'vitest/browser';
import { expect } from 'vitest';

import { RESPONSIVE_VIEWPORTS, type Viewport } from './breakpoints';

/** ID of the injected stylesheet that neutralises motion for stable snapshots. */
const FREEZE_STYLE_ID = 'arsam-visual-freeze';

/**
 * Make rendering deterministic so pixel snapshots don't flake:
 *  - kill all animations/transitions/scroll-behaviour,
 *  - wait for web fonts (a late font swap shifts text and fails a snapshot).
 * Call once at the start of a visual `play` fn.
 */
export async function freezeForSnapshot(): Promise<void> {
  if (typeof document === 'undefined') return;
  if (!document.getElementById(FREEZE_STYLE_ID)) {
    const style = document.createElement('style');
    style.id = FREEZE_STYLE_ID;
    style.textContent = `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
        scroll-behavior: auto !important;
        caret-color: transparent !important;
      }
    `;
    document.head.appendChild(style);
  }
  if (document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      /* fonts API unavailable — proceed */
    }
  }
}

/** Let layout settle after a viewport change (two rAFs ≈ a painted frame). */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

export interface SnapshotOptions {
  /** Viewports to capture at. Defaults to the DESIGN_SYSTEM responsive set. */
  viewports?: readonly Viewport[];
  /** Max ratio of differing pixels tolerated per frame (anti-aliasing slack). */
  allowedMismatchedPixelRatio?: number;
}

/**
 * Capture `name` at each viewport as a separate baseline
 * (`name-<viewport>.png`). First run writes baselines; later runs diff against
 * them. Restores the original viewport afterwards.
 */
export async function snapshotAcrossViewports(
  name: string,
  { viewports = RESPONSIVE_VIEWPORTS, allowedMismatchedPixelRatio = 0.01 }: SnapshotOptions = {},
): Promise<void> {
  await freezeForSnapshot();
  const original = { width: window.innerWidth, height: window.innerHeight };
  try {
    for (const vp of viewports) {
      await page.viewport(vp.width, vp.height);
      await nextFrame();
      await expect(document.body).toMatchScreenshot(`${name}-${vp.name}`, {
        comparatorName: 'pixelmatch',
        comparatorOptions: { allowedMismatchedPixelRatio },
      });
    }
  } finally {
    await page.viewport(original.width, original.height);
  }
}

// ---------------------------------------------------------------------------
// Geometric alignment assertions (fast, deterministic — no pixel baselines)
// ---------------------------------------------------------------------------

const leftOf = (el: Element) => el.getBoundingClientRect().left;
const rightOf = (el: Element) => el.getBoundingClientRect().right;

/**
 * Assert two elements share a left edge within `tolerance` px — e.g. a header
 * cell and the body cell in the same column. Sub-pixel rounding makes exact
 * equality unsafe, so a 1px default tolerance is used.
 */
export function expectAlignedX(a: Element, b: Element, tolerance = 1): void {
  const delta = Math.abs(leftOf(a) - leftOf(b));
  expect(
    delta,
    `expected left edges within ${tolerance}px but they differ by ${delta.toFixed(2)}px`,
  ).toBeLessThanOrEqual(tolerance);
}

/**
 * Assert a table's header cells align column-by-column with the first body row.
 * The classic pinned/sized-column shift bug (header width source diverging from
 * the body) fails here immediately, independent of any pixel baseline.
 */
export function expectColumnsAligned(
  headerCells: ArrayLike<Element>,
  bodyCells: ArrayLike<Element>,
  tolerance = 1,
): void {
  expect(
    headerCells.length,
    'header and body must expose the same number of columns',
  ).toBe(bodyCells.length);
  for (let i = 0; i < headerCells.length; i++) {
    expectAlignedX(headerCells[i]!, bodyCells[i]!, tolerance);
  }
}

/**
 * Assert a pinned column's right edge meets the next column's left edge (no gap,
 * no overlap) within `tolerance` px — the seam visible in the reported table
 * screenshots. `pinned` is the sticky cell, `next` the first scrolling cell.
 */
export function expectPinnedSeamFlush(pinned: Element, next: Element, tolerance = 1): void {
  const gap = leftOf(next) - rightOf(pinned);
  expect(
    Math.abs(gap),
    `pinned column seam should be flush but has a ${gap.toFixed(2)}px gap/overlap`,
  ).toBeLessThanOrEqual(tolerance);
}
