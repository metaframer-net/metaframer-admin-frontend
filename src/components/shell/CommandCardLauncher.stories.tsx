import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { CommandCardLauncher } from './CommandCardLauncher';
import { CommandPaletteProvider } from './command-palette-context';
import { shellRouterDecorator } from './story-helpers';

const meta = {
  title: 'Shell/CommandCardLauncher',
  component: CommandCardLauncher,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <CommandPaletteProvider defaultOpen>
        <Story />
      </CommandPaletteProvider>
    ),
    shellRouterDecorator({ title: 'Genel Bakış', aiEntity: 'dashboard' }),
  ],
} satisfies Meta<typeof CommandCardLauncher>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Below xl this is the command center's host: a dialog anchored under the mobile
 * command bar, carrying the same `CommandCenter` body the dock pill unfolds.
 */
export const Default: Story = {
  parameters: { viewport: { defaultViewport: 'bpSm' } },
  play: async () => {
    const dialog = await within(document.body).findByRole('dialog', {
      name: 'Nereye gitmek istersin?',
    });
    // The shared body is present: identity strip + module cards + NL box.
    await expect(within(dialog).getByText('Ahmet Yönetici')).toBeInTheDocument();
    await expect(within(dialog).getByRole('link', { name: /Genel Bakış/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(within(dialog).getByLabelText('Doğal dil komutu')).toBeInTheDocument();
  },
};

/**
 * From xl up the launcher renders NOTHING — the dock pill hosts the command
 * center inside itself, and two surfaces on one open state would fight over
 * focus, scroll lock and Escape.
 */
export const DesktopStandsDown: Story = {
  parameters: { viewport: { defaultViewport: 'bpXl' } },
  play: async () => {
    await expect(within(document.body).queryByRole('dialog')).toBeNull();
  },
};
