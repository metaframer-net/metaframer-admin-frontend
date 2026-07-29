import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { PaymentsListPage } from './PaymentsListPage';
import { paymentKeys } from '../api/queries';
import { MOCK_PAYMENTS, renderPage, seedQueryError } from './page-story-utils';

const defaultQuery = { page: 1, pageSize: 25, sort: [], filters: {}, q: '' };

function seededList() {
  return renderPage(<PaymentsListPage />, {
    path: '/promotions/payments',
    initialPath: '/promotions/payments',
    extraRoutes: [{ path: '*', element: <div /> }],
    seed: (qc) =>
      qc.setQueryData(paymentKeys.list(defaultQuery), {
        items: MOCK_PAYMENTS,
        total: MOCK_PAYMENTS.length,
        page: 1,
        pageSize: 25,
      }),
  });
}

const meta = {
  title: 'Promotions/Pages/PaymentsList',
  parameters: { layout: 'fullscreen' },
  render: seededList,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Sidebar: Story = {
  globals: { layout: 'sidebar' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: /Ödemeler/ })).toBeInTheDocument();
    await expect((await canvas.findAllByText('FT-2026-1000')).length).toBeGreaterThan(0);
  },
};
export const Topnav: Story = { globals: { layout: 'topnav' } };
export const Mobile: Story = { parameters: { viewport: { defaultViewport: 'mobile1' } } };
/** Smallest phone (320px): the curated mobile card renders; the desktop table is hidden. */
export const PhoneCard: Story = {
  parameters: { viewport: { defaultViewport: 'bpXs' } },
  play: async ({ canvas }) => {
    const links = await canvas.findAllByRole('link', { name: 'FT-2026-1000' });
    await expect(links.length).toBeGreaterThan(0);
    await expect(canvas.queryByRole('columnheader')).toBeNull();
  },
};
export const Loading: Story = {
  render: () =>
    renderPage(<PaymentsListPage />, {
      path: '/promotions/payments',
      initialPath: '/promotions/payments',
      extraRoutes: [{ path: '*', element: <div /> }],
      seed: () => {},
    }),
};
export const Empty: Story = {
  render: () =>
    renderPage(<PaymentsListPage />, {
      path: '/promotions/payments',
      initialPath: '/promotions/payments',
      extraRoutes: [{ path: '*', element: <div /> }],
      seed: (qc) => qc.setQueryData(paymentKeys.list(defaultQuery), { items: [], total: 0, page: 1, pageSize: 25 }),
    }),
};
// A real isError state (not a mirror of Empty) — deterministic, no network.
export const Error: Story = {
  render: () =>
    renderPage(<PaymentsListPage />, {
      path: '/promotions/payments',
      initialPath: '/promotions/payments',
      extraRoutes: [{ path: '*', element: <div /> }],
      seed: (qc) => seedQueryError(qc, paymentKeys.list(defaultQuery)),
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
    for (const label of ['Yöntem', 'Durum', 'Tarih']) {
      await expect(
        canvas.getByRole('button', { name: `${label} sütununu filtrele` }),
      ).toBeInTheDocument();
    }
    await expect(canvas.getAllByRole('button', { name: 'Detayı aç' }).length).toBeGreaterThan(0);
  },
};
