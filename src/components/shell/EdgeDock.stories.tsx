import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

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
 * macOS-style magnifying dock. Play asserts the collapse→open result (nav links +
 * ⌘K + active route), not the pointer-driven magnification.
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

/** Left edge — vertical magnifying dock with an always-on lens that glides to the hover. */
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
 * Keyboard: focusing the hint opens the dock; Escape closes it and restores focus —
 * INCLUDING after focus has tabbed into the tiles (regression guard: the hint's focus
 * handler must not re-open the dock while focus is being restored on Escape).
 */
export const Keyboard: Story = {
  args: { edge: 'bottom' },
  play: async () => {
    const hint = within(document.body).getByRole('button', { name: /Gezinme dock.*aç/ });
    hint.focus();
    await expect(hint).toHaveFocus();
    await expect(hint).toHaveAttribute('aria-expanded', 'true');
    // Move focus off the hint into a nav tile, then Escape from there.
    await userEvent.tab();
    await expect(hint).not.toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await expect(hint).toHaveAttribute('aria-expanded', 'false');
    await expect(hint).toHaveFocus();
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

/** Visible on mobile too — the collapsed hint tab renders and opens at a phone width. */
export const MobileVisible: Story = {
  args: { edge: 'bottom' },
  parameters: { viewport: { defaultViewport: 'bpXs' } },
  play: async () => {
    const dock = document.body.querySelector('[data-slot="edge-dock"]');
    if (!(dock instanceof HTMLElement)) throw new Error('edge dock did not render');
    await expect(getComputedStyle(dock).display).not.toBe('none');
    const hint = within(document.body).getByRole('button', { name: /Gezinme dock.*aç/ });
    await userEvent.click(hint);
    await expect(hint).toHaveAttribute('aria-expanded', 'true');
  },
};
