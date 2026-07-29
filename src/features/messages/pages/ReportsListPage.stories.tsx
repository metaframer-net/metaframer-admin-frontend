import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { ReportsListPage } from './ReportsListPage';
import { reportKeys } from '../api/queries';
import { MOCK_REPORTS, renderPage, seedQueryError } from './page-story-utils';

const defaultQuery = { page: 1, pageSize: 25, sort: [], filters: {}, q: '' };

function seededList() {
  return renderPage(<ReportsListPage />, {
    path: '/messages',
    initialPath: '/messages',
    extraRoutes: [{ path: '*', element: <div /> }],
    seed: (qc) =>
      qc.setQueryData(reportKeys.list(defaultQuery), {
        items: MOCK_REPORTS,
        total: MOCK_REPORTS.length,
        page: 1,
        pageSize: 25,
      }),
  });
}

const meta = {
  title: 'Messages/Pages/List',
  parameters: { layout: 'fullscreen' },
  render: seededList,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Sidebar: Story = {
  globals: { layout: 'sidebar' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: /Şikayetler/ })).toBeInTheDocument();
    await expect((await canvas.findAllByText('Deniz manzaralı 3+1 daire')).length).toBeGreaterThan(0);
  },
};
export const Topnav: Story = { globals: { layout: 'topnav' } };
export const Mobile: Story = { parameters: { viewport: { defaultViewport: 'mobile1' } } };
/** Smallest phone (320px): the curated mobile card renders; the desktop table is hidden. */
export const PhoneCard: Story = {
  parameters: { viewport: { defaultViewport: 'bpXs' } },
  play: async ({ canvas }) => {
    const links = await canvas.findAllByRole('link', { name: 'Deniz manzaralı 3+1 daire' });
    await expect(links.length).toBeGreaterThan(0);
    await expect(canvas.queryByRole('columnheader')).toBeNull();
  },
};
export const Loading: Story = {
  render: () =>
    renderPage(<ReportsListPage />, {
      path: '/messages',
      initialPath: '/messages',
      extraRoutes: [{ path: '*', element: <div /> }],
      seed: () => {},
    }),
};
export const Empty: Story = {
  render: () =>
    renderPage(<ReportsListPage />, {
      path: '/messages',
      initialPath: '/messages',
      extraRoutes: [{ path: '*', element: <div /> }],
      seed: (qc) =>
        qc.setQueryData(reportKeys.list(defaultQuery), { items: [], total: 0, page: 1, pageSize: 25 }),
    }),
};
// A real isError state (not a mirror of Empty) — deterministic, no network.
export const Error: Story = {
  render: () =>
    renderPage(<ReportsListPage />, {
      path: '/messages',
      initialPath: '/messages',
      extraRoutes: [{ path: '*', element: <div /> }],
      seed: (qc) => seedQueryError(qc, reportKeys.list(defaultQuery)),
    }),
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('alert')).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Tekrar dene' })).toBeInTheDocument();
  },
};

/**
 * Structural parity (DATA_TABLE_SPEC): every filterable column carries a header
 * funnel that writes to the same URL-synced state as the toolbar, and the
 * DataTable supplies the expand toggle for the detail sub-row.
 */
export const ColumnFilters: Story = {
  play: async ({ canvas }) => {
    for (const label of ['Tür', 'Sebep', 'Öncelik', 'Durum']) {
      await expect(
        canvas.getByRole('button', { name: `${label} sütununu filtrele` }),
      ).toBeInTheDocument();
    }
    await expect(canvas.getAllByRole('button', { name: 'Detayı aç' }).length).toBeGreaterThan(0);
  },
};
