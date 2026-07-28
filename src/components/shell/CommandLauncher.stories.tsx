import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { CommandLauncher } from './CommandLauncher';
import { CommandPaletteProvider } from './command-palette-context';
import { shellRouterDecorator } from './story-helpers';

/**
 * The shared ⌘K entry point: `list` → the classic command palette (sidebar/
 * topnav), `cards` → the dock's card-grid launcher. Both read the same open
 * state, so the shortcut behaves identically across modes.
 */
const meta = {
  title: 'Shell/CommandLauncher',
  component: CommandLauncher,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <CommandPaletteProvider defaultOpen>
        <Story />
      </CommandPaletteProvider>
    ),
    shellRouterDecorator({ title: 'Genel Bakış', aiEntity: 'dashboard' }),
  ],
} satisfies Meta<typeof CommandLauncher>;

export default meta;
type Story = StoryObj<typeof meta>;

/** sidebar/topnav variant — the classic list palette. */
export const List: Story = {
  args: { variant: 'list' },
  play: async () => {
    const dialog = await within(document.body).findByRole('dialog');
    await expect(within(dialog).getByText('Modüller')).toBeInTheDocument();
  },
};

/**
 * dock variant — the icon-tile command center (identity header + navigation).
 * `CommandCardLauncher` is the mobile host: from `xl` up it renders nothing (the
 * dock pill owns the command center INSIDE itself), so this story pins a below-xl
 * viewport for the dialog to exist.
 */
export const Cards: Story = {
  args: { variant: 'cards' },
  parameters: { viewport: { defaultViewport: 'bpSm' } },
  play: async () => {
    const dialog = await within(document.body).findByRole('dialog');
    // A leaf module (dashboard → `/`) renders as a real link, so middle-click /
    // ⌘-click open it in a new tab instead of being swallowed by an onClick.
    await expect(within(dialog).getByRole('link', { name: /Genel Bakış/ })).toBeInTheDocument();
    await expect(within(dialog).getByText('AI hazır')).toBeInTheDocument();
  },
};
