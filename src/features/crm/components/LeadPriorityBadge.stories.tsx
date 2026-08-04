import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { LeadPriorityBadge } from './LeadPriorityBadge';
import { LEAD_PRIORITIES } from '../schemas/lead';

const meta = {
  title: 'CRM/LeadPriorityBadge',
  component: LeadPriorityBadge,
  parameters: { layout: 'centered' },
  args: { priority: 'medium' },
} satisfies Meta<typeof LeadPriorityBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {LEAD_PRIORITIES.map((p) => (
        <LeadPriorityBadge key={p} priority={p} />
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Orta')).toBeInTheDocument();
    await expect(canvas.getByText('Acil')).toBeInTheDocument();
  },
};
export const Loading: Story = { render: () => <div className="bg-muted h-5 w-16 animate-pulse rounded-md" /> };
export const Empty: Story = { args: { priority: 'low' } };
export const Error: Story = { args: { priority: 'urgent' } };
export const Mobile: Story = { parameters: { viewport: { defaultViewport: 'mobile1' } } };
