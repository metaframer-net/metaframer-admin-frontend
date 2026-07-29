import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { expect, userEvent, within } from 'storybook/test';

import { UserMenu } from './UserMenu';

const meta = {
  title: 'Shell/UserMenu',
  component: UserMenu,
  parameters: { layout: 'centered' },
  decorators: [(Story) => <MemoryRouter><Story /></MemoryRouter>],
} satisfies Meta<typeof UserMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Interaction: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Kullanıcı menüsü' }));
    const menu = await within(document.body).findByRole('menu');
    await expect(within(menu).getByText('Çıkış yap')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
  },
};

export const Mobile: Story = { parameters: { viewport: { defaultViewport: 'mobile1' } } };
export const Loading: Story = { render: () => <div className="bg-muted size-8 animate-pulse rounded-full" /> };
export const Empty: Story = { render: () => <UserMenu /> };
export const Error: Story = { render: () => <UserMenu /> };
