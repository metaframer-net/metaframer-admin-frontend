import type { Meta, StoryObj } from '@storybook/react-vite';
import type { QueryClient } from '@tanstack/react-query';
import { expect } from 'storybook/test';

import { CrmContactsPage } from './CrmContactsPage';
import { crmKeys } from '../api/queries';
import { renderPage, seedQueryError, seedQueryLoading, MOCK_CONTACTS, MOCK_STATS } from './page-story-utils';

const defaultQuery = { page: 1, pageSize: 25, sort: [], filters: {}, q: '' };

function seedStats(qc: QueryClient) {
  qc.setQueryData(crmKeys.stats, MOCK_STATS);
}

function render() {
  return renderPage(<CrmContactsPage />, {
    path: '/crm',
    initialPath: '/crm',
    extraRoutes: [{ path: '*', element: <div /> }],
    seed: (qc) => {
      qc.setQueryData(crmKeys.contacts.list(defaultQuery), {
        items: MOCK_CONTACTS,
        total: MOCK_CONTACTS.length,
        page: 1,
        pageSize: 25,
      });
      seedStats(qc);
    },
  });
}

const meta = {
  title: 'CRM/CrmContactsPage',
  parameters: { layout: 'fullscreen' },
  render,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: 'CRM — Kişiler' })).toBeInTheDocument();
    await expect((await canvas.findAllByText('Ahmet Yılmaz')).length).toBeGreaterThan(0);
  },
};

export const Loading: Story = {
  render: () =>
    renderPage(<CrmContactsPage />, {
      path: '/crm',
      initialPath: '/crm',
      extraRoutes: [{ path: '*', element: <div /> }],
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
      extraRoutes: [{ path: '*', element: <div /> }],
      seed: (qc) => {
        qc.setQueryData(crmKeys.contacts.list(defaultQuery), { items: [], total: 0, page: 1, pageSize: 25 });
        qc.setQueryData(crmKeys.stats, { ...MOCK_STATS, totalContacts: 0, vipContacts: 0 });
      },
    }),
};

export const Error: Story = {
  render: () =>
    renderPage(<CrmContactsPage />, {
      path: '/crm',
      initialPath: '/crm',
      extraRoutes: [{ path: '*', element: <div /> }],
      seed: (qc) => {
        seedQueryError(qc, crmKeys.contacts.list(defaultQuery));
        seedStats(qc);
      },
    }),
};

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
