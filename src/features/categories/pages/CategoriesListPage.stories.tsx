import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { CategoriesListPage } from './CategoriesListPage';
import { categoryKeys } from '../api/queries';
import { MOCK_CATEGORIES, renderPage, seedQueryError } from './page-story-utils';

const defaultQuery = { page: 1, pageSize: 25, sort: [], filters: {}, q: '' };

function seedList(items = MOCK_CATEGORIES) {
  return (qc: Parameters<Parameters<typeof renderPage>[1]['seed']>[0]) =>
    qc.setQueryData(categoryKeys.list(defaultQuery), {
      items,
      total: items.length,
      page: 1,
      pageSize: 25,
    });
}

function render(seed = seedList()) {
  return renderPage(<CategoriesListPage />, {
    path: '/categories',
    initialPath: '/categories',
    extraRoutes: [{ path: '*', element: <div /> }],
    seed,
  });
}

const meta = {
  title: 'Categories/Pages/List',
  parameters: { layout: 'fullscreen' },
  render: () => render(),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Sidebar: Story = {
  globals: { layout: 'sidebar' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: /Kategoriler/ })).toBeInTheDocument();
    await expect((await canvas.findAllByText('Konut')).length).toBeGreaterThan(0);
  },
};
export const Topnav: Story = { globals: { layout: 'topnav' } };
export const Mobile: Story = { parameters: { viewport: { defaultViewport: 'mobile1' } } };
/** Smallest phone (320px): the curated mobile card renders; the desktop table is hidden. */
export const PhoneCard: Story = {
  parameters: { viewport: { defaultViewport: 'bpXs' } },
  play: async ({ canvas }) => {
    const links = await canvas.findAllByRole('link', { name: 'Konut' });
    await expect(links.length).toBeGreaterThan(0);
    await expect(canvas.queryByRole('columnheader')).toBeNull();
  },
};
export const Loading: Story = { render: () => render(() => {}) };
export const Empty: Story = { render: () => render(seedList([])) };
// A real isError state (not a mirror of Empty) — deterministic, no network.
export const Error: Story = {
  render: () => render((qc) => seedQueryError(qc, categoryKeys.list(defaultQuery))),
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
    for (const label of ['Durum']) {
      await expect(
        canvas.getByRole('button', { name: `${label} sütununu filtrele` }),
      ).toBeInTheDocument();
    }
    await expect(canvas.getAllByRole('button', { name: 'Detayı aç' }).length).toBeGreaterThan(0);
  },
};
