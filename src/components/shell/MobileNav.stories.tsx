import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { MobileBottomNav, MobileDrawer } from './MobileNav';
import { shellRouterDecorator, commandPaletteDecorator } from './story-helpers';

const meta = {
  title: 'Shell/MobileNav',
  component: MobileBottomNav,
  parameters: {
    layout: 'fullscreen',
    viewport: { defaultViewport: 'mobile1' },
  },
  decorators: [commandPaletteDecorator, shellRouterDecorator()],
} satisfies Meta<typeof MobileBottomNav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Sidebar: Story = {
  globals: { layout: 'sidebar' },
  play: async ({ canvas }) => {
    // The mobile bottom bar is now a LiquidDock (role="tablist", "Ana gezinme"),
    // not the old <nav aria-label="Alt gezinme">.
    await expect(canvas.getByRole('tablist', { name: 'Ana gezinme' })).toBeInTheDocument();
  },
};

export const Topnav: Story = { globals: { layout: 'topnav' } };

export const Drawer: Story = {
  render: () => (
    <div className="p-3">
      <MobileDrawer />
    </div>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Menüyü aç' }));
    const dialog = await within(document.body).findByRole('dialog');
    await expect(within(dialog).getByRole('navigation', { name: 'Ana gezinme' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
  },
};

export const Mobile: Story = {};

export const Loading: Story = {
  render: () => <div className="bg-muted fixed inset-x-0 bottom-0 h-16 animate-pulse" />,
};

export const Empty: Story = {
  render: () => (
    <div className="text-muted-foreground grid h-40 place-items-center text-sm">Öğe yok.</div>
  ),
};

export const Error: Story = {
  render: () => <div className="text-destructive grid h-40 place-items-center text-sm">Hata.</div>,
};
