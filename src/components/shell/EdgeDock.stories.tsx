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
 * Bottom edge — a collapsed hint tab that opens (hover / focus / tap) into the
 * liquid-glass LiquidDock (a `tablist` named "Ana gezinme"). It rests COLLAPSED:
 * three standing rails would wall the content in. Play asserts the collapse→open
 * result: the primary nav tabs + the ⌘K "Ara" tab become available, and the
 * current route's tab is selected.
 */
export const Bottom: Story = {
  args: { edge: 'bottom' },
  play: async () => {
    const body = within(document.body);
    const hint = body.getByRole('button', { name: /Gezinme dock.*aç/ });
    await expect(hint).toHaveAttribute('aria-expanded', 'false');
    // Open it → the permitted primary nav + the ⌘K "Ara" tab become available.
    await userEvent.click(hint);
    await expect(hint).toHaveAttribute('aria-expanded', 'true');
    await expect(body.getByRole('tablist', { name: 'Ana gezinme' })).toBeInTheDocument();
    await expect(body.getByRole('tab', { name: 'Genel' })).toBeInTheDocument();
    await expect(body.getByRole('tab', { name: 'Ara' })).toBeInTheDocument();
    // The active route ("/") maps to the first tab — it is the selected one.
    await expect(body.getByRole('tab', { name: 'Genel' })).toHaveAttribute('aria-selected', 'true');
  },
};

/** Left edge — vertical LiquidDock; icon + label stack along the vertical axis. */
export const Left: Story = {
  args: { edge: 'left' },
  play: async () => {
    const hint = within(document.body).getByRole('button', { name: /Gezinme dock.*aç/ });
    await userEvent.click(hint);
    await expect(hint).toHaveAttribute('aria-expanded', 'true');
    await expect(within(document.body).getByRole('tab', { name: 'Genel' })).toBeInTheDocument();
  },
};

/** Right edge — vertical LiquidDock (mirror of the left). */
export const Right: Story = {
  args: { edge: 'right' },
  play: async () => {
    const hint = within(document.body).getByRole('button', { name: /Gezinme dock.*aç/ });
    await userEvent.click(hint);
    await expect(hint).toHaveAttribute('aria-expanded', 'true');
    await expect(within(document.body).getByRole('tab', { name: 'Genel' })).toBeInTheDocument();
  },
};

/**
 * Keyboard: focusing the hint opens the dock and Escape closes it, restoring focus —
 * INCLUDING after focus has tabbed into the tiles (regression guard: the hint's focus
 * handler must not re-open the dock while focus is being restored). There is no
 * floating tooltip any more — every tile shows its own stacked label — so the
 * closest equivalent assertion is that the focused tab carries the expected
 * visible `[data-slot="label"]` text.
 */
export const Keyboard: Story = {
  args: { edge: 'bottom' },
  play: async () => {
    const hint = within(document.body).getByRole('button', { name: /Gezinme dock.*aç/ });
    hint.focus();
    // focus() → onFocus → setOpen(true); poll until React flushes the state to the DOM
    // (asserting once races the state update on slower/headless runners).
    await waitFor(() => expect(hint).toHaveAttribute('aria-expanded', 'true'));

    // Move focus off the hint into the active nav tab (the only tabbable tile).
    await userEvent.tab();
    await waitFor(() => {
      const focused = document.activeElement;
      if (!(focused instanceof HTMLElement)) throw new Error('nothing focused');
      expect(focused).toHaveAttribute('role', 'tab');
      expect(focused.querySelector('[data-slot="label"]')?.textContent).toBe('Genel');
    });

    await userEvent.keyboard('{Escape}');
    await expect(hint).toHaveAttribute('aria-expanded', 'false');
    await expect(hint).toHaveFocus();
  },
};

/**
 * Hovering a tile glides the liquid lens onto it (regression guard for the
 * "hover → lens" contract): the lens rests on the active route's slot and springs
 * to the pointed-at tile's slot centre.
 */
export const HoverLens: Story = {
  args: { edge: 'bottom' },
  play: async () => {
    const body = within(document.body);
    await userEvent.click(body.getByRole('button', { name: /Gezinme dock.*aç/ }));
    const tablist = body.getByRole('tablist', { name: 'Ana gezinme' });
    const lens = tablist.querySelector('[data-slot="dock-lens"]');
    if (!(lens instanceof HTMLElement)) throw new Error('dock lens did not render');
    const restLeft = lens.style.left;

    // Point at the LAST tab (the ⌘K "Ara" action) — never the resting active one.
    const tabs = within(tablist).getAllByRole('tab');
    const last = tabs[tabs.length - 1];
    if (!last) throw new Error('no dock tabs');

    // The lens glides via a per-frame rAF spring, and that loop only reschedules
    // while it is still moving. Its frame cadence is irregular under headless CI
    // load, so re-dispatch the hover move on EVERY poll: each one re-arms the rAF
    // loop, so the lens keeps converging no matter how frames are scheduled.
    await waitFor(
      () => {
        const lastRect = last.getBoundingClientRect();
        last.dispatchEvent(
          new PointerEvent('pointermove', {
            pointerType: 'mouse',
            clientX: lastRect.left + lastRect.width / 2,
            clientY: lastRect.top + lastRect.height / 2,
            bubbles: true,
          }),
        );
        // Lens centre landed on the hovered tab's slot centre (within ~1px).
        // `style.left` is relative to the tablist wrapper, which shares its left
        // edge with the glass bar in the horizontal orientation.
        const wrapperRect = tablist.getBoundingClientRect();
        const target = lastRect.left + lastRect.width / 2 - wrapperRect.left;
        const centre = parseFloat(lens.style.left) + lens.getBoundingClientRect().width / 2;
        expect(Math.abs(centre - target)).toBeLessThan(1.5);
      },
      { timeout: 5000 },
    );
    // …and it genuinely left its resting position (it started on the active tab).
    expect(lens.style.left).not.toBe(restLeft);
  },
};

/**
 * Hovering a tile crossfades its icon from outline to filled as the lens overlap
 * grows (regression guard for the icon fill contract, ported from the sibling
 * branch's "Magnifies (icon crossfade)" story).
 */
export const HoverFillsPointedTile: Story = {
  name: 'Hover fills pointed tile',
  args: { edge: 'bottom' },
  play: async () => {
    const body = within(document.body);
    await userEvent.click(body.getByRole('button', { name: /Gezinme dock.*aç/ }));
    const tablist = body.getByRole('tablist', { name: 'Ana gezinme' });
    const tabs = within(tablist).getAllByRole('tab');
    const last = tabs[tabs.length - 1];
    const filled = last?.querySelector<SVGElement>('[data-variant="filled"]');
    const outline = last?.querySelector<SVGElement>('[data-variant="outline"]');
    if (!(filled instanceof SVGElement) || !(outline instanceof SVGElement) || !last) {
      throw new Error('dock tile icons did not render');
    }

    // Re-dispatch the hover on every poll — the rAF spring only reschedules
    // while moving, and headless frame cadence is irregular (see HoverLens).
    await waitFor(
      () => {
        const rect = last.getBoundingClientRect();
        last.dispatchEvent(
          new PointerEvent('pointermove', {
            pointerType: 'mouse',
            clientX: rect.left + rect.width / 2,
            clientY: rect.top + rect.height / 2,
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
 * The dock is permissions-driven and holds no async data, so it has no distinct
 * loading / empty / error surfaces — these stubs render the resting dock and exist only
 * for state-set parity with the sibling shell components (Storybook-first rule).
 */
export const Loading: Story = { args: { edge: 'bottom' } };
export const Empty: Story = { args: { edge: 'bottom' } };
export const ErrorState: Story = { args: { edge: 'bottom' }, name: 'Error' };

/**
 * No-overflow guard, successor of the old "magnification grows the capsule" story.
 * The current dock does not magnify tiles — a fixed glass bar carries equal-width
 * tab slots and a traveling lens — so the surviving contract is containment: every
 * tab slot stays inside the glass bar on the main axis, even while the pointer
 * hovers the far end and the lens springs after it.
 */
export const NoOverflow: Story = {
  args: { edge: 'bottom' },
  play: async () => {
    const body = within(document.body);
    await userEvent.click(body.getByRole('button', { name: /Gezinme dock.*aç/ }));
    const tablist = body.getByRole('tablist', { name: 'Ana gezinme' });
    const tabs = within(tablist).getAllByRole('tab');
    await expect(tabs.length).toBeGreaterThan(1);
    const first = tabs[0];
    const last = tabs[tabs.length - 1];
    if (!first || !last) throw new Error('no dock tabs');
    // The glass bar is the tabs' track's parent (the element with the pill radius).
    const bar = first.parentElement?.parentElement;
    if (!(bar instanceof HTMLElement)) throw new Error('dock bar did not render');

    // Hover the far end so the lens springs after the pointer, then verify
    // containment holds while it travels and after it settles.
    const lastRect = last.getBoundingClientRect();
    last.dispatchEvent(
      new PointerEvent('pointermove', {
        pointerType: 'mouse',
        clientX: lastRect.left + lastRect.width / 2,
        clientY: lastRect.top + lastRect.height / 2,
        bubbles: true,
      }),
    );

    await waitFor(() => {
      const barRect = bar.getBoundingClientRect();
      for (const tab of tabs) {
        const b = tab.getBoundingClientRect();
        expect(b.left).toBeGreaterThanOrEqual(barRect.left - 0.5);
        expect(b.right).toBeLessThanOrEqual(barRect.right + 0.5);
      }
    });
  },
};

/**
 * Mobile — the edge dock is shown on phones too (dock layout, desktop AND mobile;
 * the hint tab is a 44px touch target), so its navigation is available alongside
 * the command pill. It renders visible (not `display: none`) at a phone width,
 * and a tap on the collapsed hint must open the dock.
 */
export const MobileVisible: Story = {
  args: { edge: 'bottom' },
  parameters: { viewport: { defaultViewport: 'bpXs' } },
  play: async () => {
    const dock = document.body.querySelector('[data-slot="edge-dock"]');
    if (!(dock instanceof HTMLElement)) throw new Error('edge dock did not render');
    await expect(getComputedStyle(dock).display).not.toBe('none');
    // Its collapsed hint is a reachable toggle at phone width — and a tap opens it.
    const hint = within(document.body).getByRole('button', { name: /Gezinme dock.*aç/ });
    await userEvent.click(hint);
    await expect(hint).toHaveAttribute('aria-expanded', 'true');
  },
};
