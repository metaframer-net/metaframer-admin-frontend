import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { LeadStageBadge } from './LeadStageBadge';
import { LEAD_STAGES } from '../schemas/lead';

const meta = {
  title: 'CRM/LeadStageBadge',
  component: LeadStageBadge,
  parameters: { layout: 'centered' },
  args: { stage: 'new' },
} satisfies Meta<typeof LeadStageBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {LEAD_STAGES.map((s) => (
        <LeadStageBadge key={s} stage={s} />
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Yeni')).toBeInTheDocument();
    await expect(canvas.getByText('Kazanıldı')).toBeInTheDocument();
  },
};
export const Loading: Story = { render: () => <div className="bg-muted h-5 w-20 animate-pulse rounded-md" /> };
export const Empty: Story = { args: { stage: 'new' } };
export const Error: Story = { args: { stage: 'lost' } };
export const Mobile: Story = { parameters: { viewport: { defaultViewport: 'mobile1' } } };
