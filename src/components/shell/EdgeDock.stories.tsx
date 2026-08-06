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
 * Bottom edge — a collapsed hint tab that opens (hover / focus / tap) into a
 * macOS-style magnifying dock. It rests COLLAPSED: three standing rails would wall
 * the content in. Play asserts the collapse→open result, not the magnification.
 */
export const Bottom: Story = {
  args: { edge: 'bottom' },
  play: async () => {
    const body = within(document.body);
    const hint = body.getByRole('button', { name: /Gezinme dock.*aç/ });
    await expect(hint).toHaveAttribute('aria-expanded', 'false');
    // Open it → the permitted primary nav + the ⌘K "all" button become available.
    await userEvent.click(hint);
    await expect(hint).toHaveAttribute('aria-expanded', 'true');
    await expect(body.getByRole('link', { name: 'Genel Bakış' })).toBeInTheDocument();
    await expect(body.getByRole('button', { name: /Tümü/ })).toBeInTheDocument();
    await expect(body.getByRole('link', { name: 'Genel Bakış' })).toHaveAttribute('aria-current', 'page');
  },
};

/** Left edge — vertical magnifying dock; the capsule grows along its own axis. */
export const Left: Story = {
  args: { edge: 'left' },
  play: async () => {
    const hint = within(document.body).getByRole('button', { name: /Gezinme dock.*aç/ });
    await userEvent.click(hint);
    await expect(hint).toHaveAttribute('aria-expanded', 'true');
    await expect(within(document.body).getByRole('link', { name: 'Genel Bakış' })).toBeInTheDocument();
  },
};

/** Right edge — vertical magnifying dock (mirror of the left). */
export const Right: Story = {
  args: { edge: 'right' },
  play: async () => {
    const hint = within(document.body).getByRole('button', { name: /Gezinme dock.*aç/ });
    await userEvent.click(hint);
    await expect(hint).toHaveAttribute('aria-expanded', 'true');
    await expect(within(document.body).getByRole('link', { name: 'Genel Bakış' })).toBeInTheDocument();
  },
};

/**
 * Keyboard: focusing the hint opens the dock and Escape closes it, restoring focus —
 * INCLUDING after focus has tabbed into the tiles (regression guard: the hint's focus
 * handler must not re-open the dock while focus is being restored). Focusing a tile
 * also drives the floating label, exactly as hovering does.
 */
export const Keyboard: Story = {
  args: { edge: 'bottom' },
  play: async () => {
    const hint = within(document.body).getByRole('button', { name: /Gezinme dock.*aç/ });
    hint.focus();
    // focus() → onFocus → setOpen(true); poll until React flushes the state to the DOM
    // (asserting once races the state update on slower/headless runners).
    await waitFor(() => expect(hint).toHaveAttribute('aria-expanded', 'true'));

    // Move focus off the hint into the first nav tile — the label follows it.
    await userEvent.tab();
    const label = document.body.querySelector('[data-slot="edge-dock-label"]');
    if (!(label instanceof HTMLElement)) throw new Error('dock label did not render');
    await waitFor(() => expect(label.textContent).toBe('Genel Bakış'));

    await userEvent.keyboard('{Escape}');
    await expect(hint).toHaveAttribute('aria-expanded', 'false');
    await expect(hint).toHaveFocus();
  },
};

/**
 * Hovering an icon slides the circular lens onto it (regression guard for the
 * "hover → circle" contract): the lens starts on the active route and moves to the
 * pointed-at tile, taking that tile's magnified scale.
 */
export const HoverLens: Story = {
  args: { edge: 'bottom' },
  play: async () => {
    await userEvent.click(within(document.body).getByRole('button', { name: /Gezinme dock.*aç/ }));
    const track = document.body.querySelector('[data-slot="edge-dock"] nav > div');
    const lens = document.body.querySelector('[data-slot="edge-dock-lens"]');
    if (!(track instanceof HTMLElement) || !(lens instanceof HTMLElement)) {
      throw new Error('dock track/lens did not render');
    }
    const restLeft = lens.style.left;

    // Point at the LAST tile (the ⌘K action) — never the resting active one.
    const box = track.getBoundingClientRect();
    const y = box.y + box.height / 2;
    const tiles = Array.from(track.children).filter((el): el is HTMLElement => el instanceof HTMLDivElement);
    const last = tiles[tiles.length - 1];
    if (!last) throw new Error('no dock tiles');

    // The lens glides to the pointed-at tile via a per-frame rAF lerp, and that loop only
    // reschedules while it is still moving. Its frame cadence is irregular under headless
    // CI load, so instead of firing a fixed burst and then hoping it settles within the
    // poll window, re-dispatch the move on EVERY poll: each one re-arms the rAF loop, so
    // the lens keeps converging no matter how the runner schedules frames. Deterministic.
    await waitFor(
      () => {
        track.dispatchEvent(
          new PointerEvent('pointermove', {
            pointerType: 'mouse',
            clientX: box.right - 12,
            clientY: y,
            bubbles: true,
          }),
        );
        // Landed on the pointed-at tile (same left, within a pixel).
        expect(Math.abs(parseFloat(lens.style.left) - parseFloat(last.style.left))).toBeLessThan(1.5);
      },
      { timeout: 5000 },
    );
    // …and it genuinely left its resting position (it started on the active tile).
    expect(lens.style.left).not.toBe(restLeft);
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
 * Magnification GROWS the capsule (regression guard). The dock used to keep its
 * resting length and re-centre the row inside it, so a magnified icon spilled past the
 * glass edge. Driving the pointer across the track must widen the capsule and keep
 * every tile inside it.
 */
export const MagnifiesAndGrows: Story = {
  args: { edge: 'bottom' },
  play: async () => {
    await userEvent.click(within(document.body).getByRole('button', { name: /Gezinme dock.*aç/ }));
    const track = document.body.querySelector('[data-slot="edge-dock"] nav > div');
    const capsule = track?.parentElement;
    if (!(track instanceof HTMLElement) || !(capsule instanceof HTMLElement)) {
      throw new Error('dock track did not render');
    }
    const restWidth = capsule.getBoundingClientRect().width;

    // Drive the pointer to the middle of the row and let the rAF lerp settle.
    const box = track.getBoundingClientRect();
    const midX = box.x + box.width / 2;
    const midY = box.y + box.height / 2;
    for (let i = 0; i < 24; i += 1) {
      track.dispatchEvent(
        new PointerEvent('pointermove', { pointerType: 'mouse', clientX: midX, clientY: midY, bubbles: true }),
      );
      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    const grown = capsule.getBoundingClientRect();
    await expect(grown.width).toBeGreaterThan(restWidth);

    // No tile may stick out of the capsule on either side. (Tiles are the <div>
    // children; the floating label is a <span> and deliberately sits outside.)
    const tiles = Array.from(track.children).filter((el): el is HTMLElement => el instanceof HTMLDivElement);
    await expect(tiles.length).toBeGreaterThan(1);
    for (const tile of tiles) {
      const b = tile.getBoundingClientRect();
      await expect(b.left).toBeGreaterThanOrEqual(grown.left);
      await expect(b.right).toBeLessThanOrEqual(grown.right);
    }
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
