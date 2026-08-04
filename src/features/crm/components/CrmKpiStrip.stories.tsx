import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { CrmKpiStrip } from './CrmKpiStrip';
import type { CrmStats } from '../api/queries';

const MOCK_STATS: CrmStats = {
  totalContacts: 42,
  vipContacts: 5,
  activeLeads: 18,
  wonLeads: 7,
  totalPipeline: 340_000,
  wonRevenue: 125_000,
  overdueFollowUps: 3,
  conversionRate: 23,
};

const meta = {
  title: 'CRM/CrmKpiStrip',
  component: CrmKpiStrip,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof CrmKpiStrip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { stats: MOCK_STATS, isLoading: false },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('42')).toBeInTheDocument();
    await expect(canvas.getByText('5 VIP')).toBeInTheDocument();
  },
};

export const Loading: Story = {
  args: { stats: undefined, isLoading: true },
};

export const Empty: Story = {
  args: {
    stats: { totalContacts: 0, vipContacts: 0, activeLeads: 0, wonLeads: 0, totalPipeline: 0, wonRevenue: 0, overdueFollowUps: 0, conversionRate: 0 },
    isLoading: false,
  },
};

export const Error: Story = {
  args: { stats: undefined, isLoading: false },
};

export const Mobile: Story = {
  args: { stats: MOCK_STATS, isLoading: false },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
