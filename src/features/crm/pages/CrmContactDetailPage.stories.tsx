import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { CrmContactDetailPage } from './CrmContactDetailPage';
import { crmKeys } from '../api/queries';
import { renderPage, seedQueryError, seedQueryLoading, MOCK_CONTACTS, MOCK_LEADS } from './page-story-utils';

const contact = MOCK_CONTACTS[0]!;

function render() {
  return renderPage(<CrmContactDetailPage />, {
    path: '/crm/:id',
    initialPath: `/crm/${contact.id}`,
    extraRoutes: [{ path: '*', element: <div /> }],
    seed: (qc) => {
      qc.setQueryData(crmKeys.contacts.detail(contact.id), contact);
      qc.setQueryData(crmKeys.leads.byContact(contact.id), {
        items: MOCK_LEADS.filter((l) => l.contactId === contact.id),
        total: 1,
        page: 1,
        pageSize: 25,
      });
      qc.setQueryData(crmKeys.activities.byContact(contact.id), {
        items: [],
        total: 0,
        page: 1,
        pageSize: 100,
      });
    },
  });
}

const meta = {
  title: 'CRM/CrmContactDetailPage',
  parameters: { layout: 'fullscreen' },
  render,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect((await canvas.findAllByText('Ahmet Yılmaz')).length).toBeGreaterThan(0);
    await expect(canvas.getByText('Portföy Özeti')).toBeInTheDocument();
  },
};

export const Loading: Story = {
  render: () =>
    renderPage(<CrmContactDetailPage />, {
      path: '/crm/:id',
      initialPath: `/crm/${contact.id}`,
      extraRoutes: [{ path: '*', element: <div /> }],
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
      extraRoutes: [{ path: '*', element: <div /> }],
      seed: (qc) => {
        qc.setQueryData(crmKeys.contacts.detail(contact.id), {
          ...contact,
          totalListings: 0,
          activeListings: 0,
          totalRevenue: 0,
          tags: [],
        });
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
      extraRoutes: [{ path: '*', element: <div /> }],
      seed: (qc) => {
        seedQueryError(qc, crmKeys.contacts.detail(contact.id));
      },
    }),
};

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
