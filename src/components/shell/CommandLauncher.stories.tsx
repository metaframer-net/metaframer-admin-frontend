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

/** List variant rendered at a narrow mobile viewport (360 px). */
export const Mobile: Story = {
  args: { variant: 'list' },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
