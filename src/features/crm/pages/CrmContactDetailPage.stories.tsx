import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { CrmContactDetailPage } from './CrmContactDetailPage';
import { crmKeys } from '../api/queries';
import { renderPage, seedQueryError, seedQueryLoading, MOCK_CONTACTS, MOCK_LEADS } from './page-story-utils';

const meta = {
  title: 'CRM/CrmContactDetailPage',
  component: CrmContactDetailPage,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof CrmContactDetailPage>;

export default meta;
type Story = StoryObj<typeof meta>;

const contact = MOCK_CONTACTS[0]!;

export const Default: Story = {
  render: () =>
    renderPage(<CrmContactDetailPage />, {
      path: '/crm/:id',
      initialPath: `/crm/${contact.id}`,
      seed: (qc) => {
        qc.setQueryData(crmKeys.contacts.detail(contact.id), contact);
        qc.setQueryData(crmKeys.leads.byContact(contact.id), { items: MOCK_LEADS.filter((l) => l.contactId === contact.id), total: 1, page: 1, pageSize: 25 });
        qc.setQueryData(crmKeys.activities.byContact(contact.id), { items: [], total: 0, page: 1, pageSize: 100 });
      },
    }),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Ahmet Yılmaz')).toBeInTheDocument();
    await expect(canvas.getByText('Portföy Özeti')).toBeInTheDocument();
  },
};

export const Loading: Story = {
  render: () =>
    renderPage(<CrmContactDetailPage />, {
      path: '/crm/:id',
      initialPath: `/crm/${contact.id}`,
      seed: (qc) => {
        seedQueryLoading(qc, crmKeys.contacts.detail(contact.id));
      },
    }),
};

export const Empty: Story = {
  render: () =>
    renderPage(<CrmContactDetailPage />, {
      path: '/crm/:id',
      initialPath: `/crm/${contact.id}`,
      seed: (qc) => {
        qc.setQueryData(crmKeys.contacts.detail(contact.id), { ...contact, totalListings: 0, activeListings: 0, totalRevenue: 0, tags: [] });
        qc.setQueryData(crmKeys.leads.byContact(contact.id), { items: [], total: 0, page: 1, pageSize: 25 });
        qc.setQueryData(crmKeys.activities.byContact(contact.id), { items: [], total: 0, page: 1, pageSize: 100 });
      },
    }),
};

export const Error: Story = {
  render: () =>
    renderPage(<CrmContactDetailPage />, {
      path: '/crm/:id',
      initialPath: `/crm/${contact.id}`,
      seed: (qc) => {
        seedQueryError(qc, crmKeys.contacts.detail(contact.id));
      },
    }),
};

export const Mobile: Story = {
  ...Default,
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
