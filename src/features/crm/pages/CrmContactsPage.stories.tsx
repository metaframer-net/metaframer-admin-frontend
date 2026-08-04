import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { CrmContactsPage } from './CrmContactsPage';
import { crmKeys } from '../api/queries';
import { renderPage, seedQueryError, seedQueryLoading, MOCK_CONTACTS, MOCK_STATS } from './page-story-utils';

const meta = {
  title: 'CRM/CrmContactsPage',
  component: CrmContactsPage,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof CrmContactsPage>;

export default meta;
type Story = StoryObj<typeof meta>;

const defaultQuery = { page: 1, pageSize: 25, sort: [], filters: {}, q: '' };

export const Default: Story = {
  render: () =>
    renderPage(<CrmContactsPage />, {
      path: '/crm',
      initialPath: '/crm',
      seed: (qc) => {
        qc.setQueryData(crmKeys.contacts.list(defaultQuery), { items: MOCK_CONTACTS, total: MOCK_CONTACTS.length, page: 1, pageSize: 25 });
        qc.setQueryData(crmKeys.stats, MOCK_STATS);
      },
    }),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Ahmet Yılmaz')).toBeInTheDocument();
  },
};

export const Loading: Story = {
  render: () =>
    renderPage(<CrmContactsPage />, {
      path: '/crm',
      initialPath: '/crm',
      seed: (qc) => {
        seedQueryLoading(qc, crmKeys.contacts.list(defaultQuery));
        seedQueryLoading(qc, crmKeys.stats);
      },
    }),
};

export const Empty: Story = {
  render: () =>
    renderPage(<CrmContactsPage />, {
      path: '/crm',
      initialPath: '/crm',
      seed: (qc) => {
        qc.setQueryData(crmKeys.contacts.list(defaultQuery), { items: [], total: 0, page: 1, pageSize: 25 });
        qc.setQueryData(crmKeys.stats, { ...MOCK_STATS, totalContacts: 0, vipContacts: 0, activeLeads: 0, wonLeads: 0, totalPipeline: 0, wonRevenue: 0, overdueFollowUps: 0, conversionRate: 0 });
      },
    }),
};

export const Error: Story = {
  render: () =>
    renderPage(<CrmContactsPage />, {
      path: '/crm',
      initialPath: '/crm',
      seed: (qc) => {
        seedQueryError(qc, crmKeys.contacts.list(defaultQuery));
        qc.setQueryData(crmKeys.stats, MOCK_STATS);
      },
    }),
};

export const Mobile: Story = {
  ...Default,
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
