import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { UsersListPage } from './UsersListPage';
import { userKeys } from '../api/queries';
import { MOCK_USERS, renderPage, seedQueryError } from './page-story-utils';

const defaultQuery = { page: 1, pageSize: 25, sort: [], filters: {}, q: '' };

function render() {
  return renderPage(<UsersListPage />, {
    path: '/users',
    initialPath: '/users',
    extraRoutes: [{ path: '*', element: <div /> }],
    seed: (qc) =>
      qc.setQueryData(userKeys.list(defaultQuery), {
        items: MOCK_USERS,
        total: MOCK_USERS.length,
        page: 1,
        pageSize: 25,
      }),
  });
}

const meta = {
  title: 'Users/Pages/List',
  parameters: { layout: 'fullscreen' },
  render,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Sidebar: Story = {
  globals: { layout: 'sidebar' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: /Kullanıcılar/ })).toBeInTheDocument();
    await expect((await canvas.findAllByText('İstanbul Kaya Emlak')).length).toBeGreaterThan(0);
  },
};
export const Topnav: Story = { globals: { layout: 'topnav' } };
export const Mobile: Story = { parameters: { viewport: { defaultViewport: 'mobile1' } } };
/** Smallest phone (320px): the curated mobile card renders; the desktop table is hidden. */
export const PhoneCard: Story = {
  parameters: { viewport: { defaultViewport: 'bpXs' } },
  play: async ({ canvas }) => {
    const links = await canvas.findAllByRole('link', { name: 'İstanbul Kaya Emlak' });
    await expect(links.length).toBeGreaterThan(0);
    await expect(canvas.queryByRole('columnheader')).toBeNull();
  },
};
export const Loading: Story = {
  render: () =>
    renderPage(<UsersListPage />, {
      path: '/users',
      initialPath: '/users',
      extraRoutes: [{ path: '*', element: <div /> }],
      seed: () => {},
    }),
};
export const Empty: Story = {
  render: () =>
    renderPage(<UsersListPage />, {
      path: '/users',
      initialPath: '/users',
      extraRoutes: [{ path: '*', element: <div /> }],
      seed: (qc) =>
        qc.setQueryData(userKeys.list(defaultQuery), { items: [], total: 0, page: 1, pageSize: 25 }),
    }),
};
// A real isError state (not a mirror of Empty) — deterministic, no network.
export const Error: Story = {
  render: () =>
    renderPage(<UsersListPage />, {
      path: '/users',
      initialPath: '/users',
      extraRoutes: [{ path: '*', element: <div /> }],
      seed: (qc) => seedQueryError(qc, userKeys.list(defaultQuery)),
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
    for (const label of ['Tip', 'Durum', 'Güven skoru', 'Kimlik doğrulama', 'Şehir']) {
      await expect(
        canvas.getByRole('button', { name: `${label} sütununu filtrele` }),
      ).toBeInTheDocument();
    }
    await expect(canvas.getAllByRole('button', { name: 'Detayı aç' }).length).toBeGreaterThan(0);
  },
};
