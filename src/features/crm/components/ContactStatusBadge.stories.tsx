import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { ContactStatusBadge } from './ContactStatusBadge';
import { CONTACT_STATUSES } from '../schemas/contact';

const meta = {
  title: 'CRM/ContactStatusBadge',
  component: ContactStatusBadge,
  parameters: { layout: 'centered' },
  args: { status: 'active' },
} satisfies Meta<typeof ContactStatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {CONTACT_STATUSES.map((s) => (
        <ContactStatusBadge key={s} status={s} />
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Aktif')).toBeInTheDocument();
    await expect(canvas.getByText('VIP')).toBeInTheDocument();
  },
};
export const Loading: Story = { render: () => <div className="bg-muted h-5 w-16 animate-pulse rounded-md" /> };
export const Empty: Story = { args: { status: 'inactive' } };
export const Error: Story = { args: { status: 'churned' } };
export const Mobile: Story = { parameters: { viewport: { defaultViewport: 'mobile1' } } };
