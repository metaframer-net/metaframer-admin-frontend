import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { CrmPipelinePage } from './CrmPipelinePage';
import { crmKeys } from '../api/queries';
import { renderPage, seedQueryError, seedQueryLoading, MOCK_LEADS, MOCK_STATS } from './page-story-utils';

const defaultQuery = { page: 1, pageSize: 1000, sort: [], filters: {}, q: '' };

function render() {
  return renderPage(<CrmPipelinePage />, {
    path: '/crm/pipeline',
    initialPath: '/crm/pipeline',
    extraRoutes: [{ path: '*', element: <div /> }],
    seed: (qc) => {
      qc.setQueryData(crmKeys.leads.list(defaultQuery), {
        items: MOCK_LEADS,
        total: MOCK_LEADS.length,
        page: 1,
        pageSize: 1000,
      });
      qc.setQueryData(crmKeys.stats, MOCK_STATS);
    },
  });
}

const meta = {
  title: 'CRM/CrmPipelinePage',
  parameters: { layout: 'fullscreen' },
  render,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: 'Pipeline Raporları' })).toBeInTheDocument();
    await expect(canvas.getByText('Kazanma Oranı')).toBeInTheDocument();
  },
};

export const Loading: Story = {
  render: () =>
    renderPage(<CrmPipelinePage />, {
      path: '/crm/pipeline',
      initialPath: '/crm/pipeline',
      extraRoutes: [{ path: '*', element: <div /> }],
      seed: (qc) => {
        seedQueryLoading(qc, crmKeys.leads.list(defaultQuery));
        seedQueryLoading(qc, crmKeys.stats);
      },
    }),
};

export const Empty: Story = {
  render: () =>
    renderPage(<CrmPipelinePage />, {
      path: '/crm/pipeline',
      initialPath: '/crm/pipeline',
      extraRoutes: [{ path: '*', element: <div /> }],
      seed: (qc) => {
        qc.setQueryData(crmKeys.leads.list(defaultQuery), { items: [], total: 0, page: 1, pageSize: 1000 });
        qc.setQueryData(crmKeys.stats, { ...MOCK_STATS, activeLeads: 0, wonLeads: 0, totalPipeline: 0, wonRevenue: 0 });
      },
    }),
};

export const Error: Story = {
  render: () =>
    renderPage(<CrmPipelinePage />, {
      path: '/crm/pipeline',
      initialPath: '/crm/pipeline',
      extraRoutes: [{ path: '*', element: <div /> }],
      seed: (qc) => {
        seedQueryError(qc, crmKeys.leads.list(defaultQuery));
        qc.setQueryData(crmKeys.stats, MOCK_STATS);
      },
    }),
};

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
