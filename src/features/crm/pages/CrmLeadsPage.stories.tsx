import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { CrmLeadsPage } from './CrmLeadsPage';
import { crmKeys } from '../api/queries';
import { renderPage, seedQueryError, seedQueryLoading, MOCK_LEADS } from './page-story-utils';

const meta = {
  title: 'CRM/CrmLeadsPage',
  component: CrmLeadsPage,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof CrmLeadsPage>;

export default meta;
type Story = StoryObj<typeof meta>;

const defaultQuery = { page: 1, pageSize: 25, sort: [], filters: {}, q: '' };

export const Default: Story = {
  render: () =>
    renderPage(<CrmLeadsPage />, {
      path: '/crm/leads',
      initialPath: '/crm/leads',
      seed: (qc) => {
        qc.setQueryData(crmKeys.leads.list(defaultQuery), { items: MOCK_LEADS, total: MOCK_LEADS.length, page: 1, pageSize: 25 });
      },
    }),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Satılık daire paketi')).toBeInTheDocument();
  },
};

export const Loading: Story = {
  render: () =>
    renderPage(<CrmLeadsPage />, {
      path: '/crm/leads',
      initialPath: '/crm/leads',
      seed: (qc) => {
        seedQueryLoading(qc, crmKeys.leads.list(defaultQuery));
      },
    }),
};

export const Empty: Story = {
  render: () =>
    renderPage(<CrmLeadsPage />, {
      path: '/crm/leads',
      initialPath: '/crm/leads',
      seed: (qc) => {
        qc.setQueryData(crmKeys.leads.list(defaultQuery), { items: [], total: 0, page: 1, pageSize: 25 });
      },
    }),
};

export const Error: Story = {
  render: () =>
    renderPage(<CrmLeadsPage />, {
      path: '/crm/leads',
      initialPath: '/crm/leads',
      seed: (qc) => {
        seedQueryError(qc, crmKeys.leads.list(defaultQuery));
      },
    }),
};

export const Mobile: Story = {
  ...Default,
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
