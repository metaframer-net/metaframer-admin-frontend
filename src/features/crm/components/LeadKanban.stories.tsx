import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { LeadKanban } from './LeadKanban';
import type { Lead } from '../schemas/lead';

const MOCK_LEADS: Lead[] = [
  { id: 'L-1', contactId: 'C-1', contactName: 'Ahmet Yılmaz', title: 'Satılık daire paketi', stage: 'new', priority: 'high', value: 50_000, probability: 10, source: 'web', createdAt: '2026-07-01T00:00:00Z', updatedAt: '2026-07-10T00:00:00Z', expectedCloseDate: '2026-09-01T00:00:00Z' },
  { id: 'L-2', contactId: 'C-2', contactName: 'Fatma Kaya', title: 'Ofis kiralama teklifi', stage: 'qualified', priority: 'medium', value: 30_000, probability: 40, source: 'referral', createdAt: '2026-06-15T00:00:00Z', updatedAt: '2026-07-08T00:00:00Z', expectedCloseDate: '2026-08-15T00:00:00Z' },
  { id: 'L-3', contactId: 'C-3', contactName: 'Ali Demir', title: 'Arsa satış danışmanlığı', stage: 'won', priority: 'low', value: 120_000, probability: 100, source: 'cold-call', createdAt: '2026-05-01T00:00:00Z', updatedAt: '2026-07-05T00:00:00Z', expectedCloseDate: '2026-07-01T00:00:00Z' },
  { id: 'L-4', contactId: 'C-1', contactName: 'Ahmet Yılmaz', title: 'Lüks konut satışı', stage: 'negotiation', priority: 'urgent', value: 200_000, probability: 75, source: 'web', createdAt: '2026-06-20T00:00:00Z', updatedAt: '2026-07-12T00:00:00Z', expectedCloseDate: '2026-08-01T00:00:00Z' },
  { id: 'L-5', contactId: 'C-4', contactName: 'Selin Öztürk', title: 'Proje pazarlama', stage: 'lost', priority: 'medium', value: 80_000, probability: 0, source: 'walk-in', lostReason: 'Bütçe yetersizliği', createdAt: '2026-04-01T00:00:00Z', updatedAt: '2026-06-30T00:00:00Z', expectedCloseDate: '2026-06-15T00:00:00Z' },
];

const meta = {
  title: 'CRM/LeadKanban',
  component: LeadKanban,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof LeadKanban>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { leads: MOCK_LEADS },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Satılık daire paketi')).toBeInTheDocument();
    await expect(canvas.getByText('Kazanıldı')).toBeInTheDocument();
  },
};

export const Loading: Story = {
  args: { leads: [] },
  render: () => (
    <div className="flex gap-3 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-muted h-48 flex-1 animate-pulse rounded-xl" />
      ))}
    </div>
  ),
};

export const Empty: Story = {
  args: { leads: [] },
};

export const Error: Story = {
  args: { leads: [] },
  render: () => <p className="text-destructive p-4 text-sm">Lead verileri yüklenemedi.</p>,
};

export const Mobile: Story = {
  args: { leads: MOCK_LEADS },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
