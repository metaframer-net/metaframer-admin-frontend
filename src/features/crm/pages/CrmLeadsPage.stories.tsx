import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { CrmLeadsPage } from './CrmLeadsPage';
import { crmKeys } from '../api/queries';
import { renderPage, seedQueryError, seedQueryLoading, MOCK_LEADS } from './page-story-utils';

const defaultQuery = { page: 1, pageSize: 25, sort: [], filters: {}, q: '' };

function render() {
  return renderPage(<CrmLeadsPage />, {
    path: '/crm/leads',
    initialPath: '/crm/leads',
    extraRoutes: [{ path: '*', element: <div /> }],
    seed: (qc) => {
      qc.setQueryData(crmKeys.leads.list(defaultQuery), {
        items: MOCK_LEADS,
        total: MOCK_LEADS.length,
        page: 1,
        pageSize: 25,
      });
    },
  });
}

const meta = {
  title: 'CRM/CrmLeadsPage',
  parameters: { layout: 'fullscreen' },
  render,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: 'CRM — Leadler' })).toBeInTheDocument();
    await expect((await canvas.findAllByText('Satılık daire paketi')).length).toBeGreaterThan(0);
  },
};

export const Loading: Story = {
  render: () =>
    renderPage(<CrmLeadsPage />, {
      path: '/crm/leads',
      initialPath: '/crm/leads',
      extraRoutes: [{ path: '*', element: <div /> }],
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
      extraRoutes: [{ path: '*', element: <div /> }],
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
      extraRoutes: [{ path: '*', element: <div /> }],
      seed: (qc) => {
        seedQueryError(qc, crmKeys.leads.list(defaultQuery));
      },
    }),
};

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
