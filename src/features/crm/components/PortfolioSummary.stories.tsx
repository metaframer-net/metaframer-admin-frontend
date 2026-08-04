import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { PortfolioSummary } from './PortfolioSummary';
import type { Contact } from '../schemas/contact';

const MOCK_CONTACT: Contact = {
  id: 'C-3000',
  fullName: 'Ahmet Yılmaz',
  email: 'ahmet@example.com',
  phone: '+90 532 111 2233',
  type: 'agent',
  status: 'vip',
  source: 'referral',
  tags: ['premium'],
  il: '34',
  totalListings: 24,
  activeListings: 15,
  totalRevenue: 180_000,
  lastContactedAt: '2026-07-15T10:00:00Z',
  nextFollowUpAt: '2026-08-01T10:00:00Z',
  createdAt: '2025-01-10T00:00:00Z',
  updatedAt: '2026-07-15T10:00:00Z',
};

const meta = {
  title: 'CRM/PortfolioSummary',
  component: PortfolioSummary,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof PortfolioSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { contact: MOCK_CONTACT },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('24')).toBeInTheDocument();
    await expect(canvas.getByText('15')).toBeInTheDocument();
  },
};

export const Loading: Story = {
  args: { contact: MOCK_CONTACT },
  render: () => (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-muted h-20 animate-pulse rounded-lg" />
      ))}
    </div>
  ),
};

export const Empty: Story = {
  args: {
    contact: { ...MOCK_CONTACT, totalListings: 0, activeListings: 0, totalRevenue: 0 },
  },
};

export const Error: Story = {
  args: { contact: MOCK_CONTACT },
  render: () => <p className="text-destructive text-sm">Portföy verisi yüklenemedi.</p>,
};

export const Mobile: Story = {
  args: { contact: MOCK_CONTACT },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
