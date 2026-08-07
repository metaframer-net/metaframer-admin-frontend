import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { EdgeDock } from './EdgeDock';
import { CommandPaletteProvider } from './command-palette-context';
import { shellRouterDecorator } from './story-helpers';

const meta = {
  title: 'Shell/EdgeDock',
  component: EdgeDock,
  parameters: { layout: 'fullscreen', viewport: { defaultViewport: 'bpXl' } },
  decorators: [
    (Story) => (
      <CommandPaletteProvider>
        <Story />
      </CommandPaletteProvider>
    ),
    shellRouterDecorator({ title: 'Genel Bakış', aiEntity: 'dashboard' }),
  ],
} satisfies Meta<typeof EdgeDock>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The revealed dock is a LiquidDock: a `role="tablist"` (aria-label "Ana gezinme")
 * of icon tabs — the permitted primary nav + a trailing "Ara" (⌘K) tab. There is no
 * `<nav>`/link markup and no growing capsule (that was the earlier MagnifyDock); the
 * lens is a fixed-size circle that SLIDES onto the pointed tile, and the pointed tile's
 * icon crossfades from its outline to its filled variant.
 */

/** Open the collapsed dock via its hint and return the revealed LiquidDock tablist. */
async function openDock(): Promise<HTMLElement> {
  const hint = within(document.body).getByRole('button', { name: /Gezinme dock.*aç/ });
  await userEvent.click(hint);
  await expect(hint).toHaveAttribute('aria-expanded', 'true');
  return within(document.body).getByRole('tablist', { name: 'Ana gezinme' });
}

/** Resolve the LiquidDock DOM handles the pointer tests drive. */
function dockParts(tablist: HTMLElement) {
  const tabs = within(tablist).getAllByRole('tab');
  const track = tabs[0]?.parentElement ?? null; // flex row holding the tiles
  const bar = track?.parentElement ?? null; // glass bar — owns the pointer handlers
  // The lens is the only aria-hidden <div> that is a direct child of the tablist
  // (the active-dot lives inside the bar; the vertical tooltip is a <span>).
  const lens = tablist.querySelector<HTMLElement>(':scope > div[aria-hidden="true"]');
  return { tabs, track, bar, lens };
}

/**
 * Bottom edge — a collapsed hint tab that opens (hover / focus / tap) into the
 * LiquidDock. It rests COLLAPSED: three standing rails would wall the content in.
 * Play asserts the collapse→open result: the permitted nav tabs + the "Ara" tab are
 * present and the active route's tab is selected.
 */
export const Bottom: Story = {
  args: { edge: 'bottom' },
  play: async () => {
    const body = within(document.body);
    const hint = body.getByRole('button', { name: /Gezinme dock.*aç/ });
    await expect(hint).toHaveAttribute('aria-expanded', 'false');

    const tablist = await openDock();
    const tabs = within(tablist).getAllByRole('tab');
    await expect(tabs.length).toBeGreaterThan(1);
    // The trailing search tab (⌘K "all") is always present.
    await expect(within(tablist).getByRole('tab', { name: 'Ara' })).toBeInTheDocument();
    // Exactly one tab is selected — the active route (or index 0 as the fallback).
    await expect(tablist.querySelector('[role="tab"][aria-selected="true"]')).toBeTruthy();
  },
};

/** Left edge — vertical LiquidDock (icons stack; labels move to a side tooltip). */
export const Left: Story = {
  args: { edge: 'left' },
  play: async () => {
    const tablist = await openDock();
    await expect(within(tablist).getAllByRole('tab').length).toBeGreaterThan(1);
    await expect(within(tablist).getByRole('tab', { name: 'Ara' })).toBeInTheDocument();
  },
};

/** Right edge — vertical LiquidDock (mirror of the left). */
export const Right: Story = {
  args: { edge: 'right' },
  play: async () => {
    const tablist = await openDock();
    await expect(within(tablist).getAllByRole('tab').length).toBeGreaterThan(1);
    await expect(within(tablist).getByRole('tab', { name: 'Ara' })).toBeInTheDocument();
  },
};

/**
 * Keyboard: focusing the hint opens the dock and Escape closes it, restoring focus —
 * INCLUDING after focus has tabbed into the tiles (regression guard: the hint's focus
 * handler must not re-open the dock while focus is being restored). Tabbing off the
 * hint lands on the dock's active tab (the only one in the tab order).
 */
export const Keyboard: Story = {
  args: { edge: 'bottom' },
  play: async () => {
    const hint = within(document.body).getByRole('button', { name: /Gezinme dock.*aç/ });
    hint.focus();
    // focus() → onFocus → setOpen(true); poll until React flushes the state to the DOM
    // (asserting once races the state update on slower/headless runners).
    await waitFor(() => expect(hint).toHaveAttribute('aria-expanded', 'true'));

    // Move focus off the hint into the dock — it lands on the active tab (tabIndex 0;
    // the rest are roving-tabindex -1).
    await userEvent.tab();
    await waitFor(() => expect(document.activeElement?.getAttribute('role')).toBe('tab'));

    await userEvent.keyboard('{Escape}');
    await expect(hint).toHaveAttribute('aria-expanded', 'false');
    await expect(hint).toHaveFocus();
  },
};

/**
 * Hovering an icon SLIDES the circular lens onto it (regression guard for the
 * "hover → circle" contract): the lens starts on the active route and moves toward the
 * pointed-at tile. Pointer handlers live on the glass bar, so the move is dispatched
 * there.
 */
export const HoverLens: Story = {
  args: { edge: 'bottom' },
  play: async () => {
    const tablist = await openDock();
    const { bar, lens } = dockParts(tablist);
    if (!(bar instanceof HTMLElement) || !(lens instanceof HTMLElement)) {
      throw new Error('dock bar/lens did not render');
    }
    const restLeft = parseFloat(lens.style.left) || 0;

    // Point at the far (right) end — never the resting active tile at the left.
    const rect = bar.getBoundingClientRect();
    const y = rect.top + rect.height / 2;
    const targetX = rect.right - 12;

    // The lens glides to the pointed-at slot via a per-frame rAF lerp, and that loop only
    // reschedules while it is still moving. Its frame cadence is irregular under headless
    // CI load, so re-dispatch the move on EVERY poll: each one re-arms the rAF loop, so the
    // lens keeps converging no matter how the runner schedules frames. Deterministic.
    await waitFor(
      () => {
        bar.dispatchEvent(
          new PointerEvent('pointermove', {
            pointerType: 'mouse',
            clientX: targetX,
            clientY: y,
            bubbles: true,
          }),
        );
        // It has slid a meaningful distance to the right, toward the pointer.
        expect(parseFloat(lens.style.left)).toBeGreaterThan(restLeft + 4);
      },
      { timeout: 5000 },
    );
  },
};

/**
 * The dock is permissions-driven and holds no async data, so it has no distinct
 * loading / empty / error surfaces — these stubs render the resting dock and exist only
 * for state-set parity with the sibling shell components (Storybook-first rule).
 */
export const Loading: Story = { args: { edge: 'bottom' } };
export const Empty: Story = { args: { edge: 'bottom' } };
export const ErrorState: Story = { args: { edge: 'bottom' }, name: 'Error' };

/**
 * Magnification in LiquidDock is a CROSSFADE, not a scale (regression guard): the tile
 * under the lens swaps its outline icon for the filled variant. Driving the pointer onto
 * the last tile must fade its filled icon in (and its outline out).
 */
export const HoverFillsPointedTile: Story = {
  name: 'Magnifies (icon crossfade)',
  args: { edge: 'bottom' },
  play: async () => {
    const tablist = await openDock();
    const { tabs, bar } = dockParts(tablist);
    if (!(bar instanceof HTMLElement)) throw new Error('dock bar did not render');
    const last = tabs[tabs.length - 1];
    const filled = last?.querySelector<SVGElement>('[data-variant="filled"]');
    const outline = last?.querySelector<SVGElement>('[data-variant="outline"]');
    if (!(filled instanceof SVGElement) || !(outline instanceof SVGElement)) {
      throw new Error('dock tile icons did not render');
    }

    const rect = bar.getBoundingClientRect();
    const y = rect.top + rect.height / 2;
    const targetX = rect.right - 12; // the last tile

    await waitFor(
      () => {
        bar.dispatchEvent(
          new PointerEvent('pointermove', {
            pointerType: 'mouse',
            clientX: targetX,
            clientY: y,
            bubbles: true,
          }),
        );
        // The pointed tile is now showing its filled icon.
        expect(parseFloat(filled.style.opacity)).toBeGreaterThan(0.9);
      },
      { timeout: 5000 },
    );
    // …and its outline has faded out in tandem.
    await expect(parseFloat(outline.style.opacity)).toBeLessThan(0.1);
  },
};

/**
 * Desktop only — below xl the edge dock is hidden (`max-xl:hidden`). The full-width
 * command pill carries navigation on mobile, so the edge handles would otherwise
 * peek as stray rectangles beside it. The element still renders (in the DOM) but
 * is `display: none` at a phone width.
 */
export const MobileHidden: Story = {
  args: { edge: 'bottom' },
  parameters: { viewport: { defaultViewport: 'bpXs' } },
  play: async () => {
    const dock = document.body.querySelector('[data-slot="edge-dock"]');
    if (!(dock instanceof HTMLElement)) throw new Error('edge dock did not render');
    await expect(getComputedStyle(dock).display).toBe('none');
  },
};
