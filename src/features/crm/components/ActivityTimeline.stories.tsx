import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';

import { ActivityTimeline } from './ActivityTimeline';
import type { Activity } from '../schemas/activity';

const MOCK_ACTIVITIES: Activity[] = [
  { id: 'A-1', contactId: 'C-1', type: 'call', subject: 'İlk tanışma görüşmesi', description: 'Detaylı bilgi verildi.', scheduledAt: '2026-07-15T10:00:00Z', completedAt: '2026-07-15T10:30:00Z', createdBy: 'admin-1', createdAt: '2026-07-15T10:00:00Z' },
  { id: 'A-2', contactId: 'C-1', type: 'meeting', subject: 'Ofis ziyareti', scheduledAt: '2026-07-20T14:00:00Z', completedAt: null, createdBy: 'admin-1', createdAt: '2026-07-18T09:00:00Z' },
  { id: 'A-3', contactId: 'C-1', type: 'note', subject: 'VIP müşteri notu', description: 'Özel fiyatlandırma uygulanacak.', scheduledAt: null, completedAt: null, createdBy: 'admin-1', createdAt: '2026-07-19T11:00:00Z' },
  { id: 'A-4', contactId: 'C-1', type: 'email', subject: 'Teklif gönderildi', scheduledAt: '2026-07-21T08:00:00Z', completedAt: '2026-07-21T08:15:00Z', createdBy: 'admin-1', createdAt: '2026-07-21T08:00:00Z' },
];

const meta = {
  title: 'CRM/ActivityTimeline',
  component: ActivityTimeline,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof ActivityTimeline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { activities: MOCK_ACTIVITIES, onComplete: fn() },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('İlk tanışma görüşmesi')).toBeInTheDocument();
    await expect(canvas.getByText('VIP müşteri notu')).toBeInTheDocument();
  },
};

export const Loading: Story = {
  args: { activities: [] },
  render: () => <div className="bg-muted h-40 animate-pulse rounded-lg" />,
};

export const Empty: Story = {
  args: { activities: [] },
};

export const Error: Story = {
  args: { activities: [] },
  render: () => <p className="text-destructive text-sm">Aktiviteler yüklenemedi.</p>,
};

export const Mobile: Story = {
  args: { activities: MOCK_ACTIVITIES, onComplete: fn() },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
