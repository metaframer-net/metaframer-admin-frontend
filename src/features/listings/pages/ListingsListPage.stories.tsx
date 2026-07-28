import type { Meta, StoryObj } from '@storybook/react-vite';
import type { QueryClient } from '@tanstack/react-query';
import { expect } from 'storybook/test';

import { ListingsListPage } from './ListingsListPage';
import { listingKeys } from '../api/queries';
import { MOCK_LISTINGS, renderPage, seedQueryError } from './page-story-utils';

const defaultQuery = { page: 1, pageSize: 25, sort: [], filters: {}, q: '' };
const STATS = { total: MOCK_LISTINGS.length, pending: 1, aiNok: 0, active: 1 };

/** Seed the KPI stats query so the header strip renders without a network call. */
function seedStats(qc: QueryClient) {
  qc.setQueryData([...listingKeys.all, 'stats'], STATS);
}

function render() {
  return renderPage(<ListingsListPage />, {
    path: '/listings',
    initialPath: '/listings',
    extraRoutes: [{ path: '*', element: <div /> }],
    seed: (qc) => {
      qc.setQueryData(listingKeys.list(defaultQuery), {
        items: MOCK_LISTINGS,
        total: MOCK_LISTINGS.length,
        page: 1,
        pageSize: 25,
      });
      seedStats(qc);
    },
  });
}

const meta = {
  title: 'Listings/Pages/List',
  parameters: { layout: 'fullscreen' },
  render,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Sidebar: Story = {
  globals: { layout: 'sidebar' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: 'İlanlar' })).toBeInTheDocument();
    await expect((await canvas.findAllByText('İstanbul konut ilanı 1')).length).toBeGreaterThan(0);
  },
};
export const Topnav: Story = { globals: { layout: 'topnav' } };
export const Mobile: Story = { parameters: { viewport: { defaultViewport: 'mobile1' } } };
/** Smallest phone (320px): the curated mobile card renders and the desktop table is hidden. */
export const PhoneCard: Story = {
  parameters: { viewport: { defaultViewport: 'bpXs' } },
  play: async ({ canvas }) => {
    // The curated card renders the title as an open-detail link (desktop table
    // is display:none below xl, so its duplicate link is not in the a11y tree).
    const links = await canvas.findAllByRole('link', { name: 'İstanbul konut ilanı 1' });
    await expect(links.length).toBeGreaterThan(0);
    // No accessible columnheader below xl — the table view is hidden on phones.
    await expect(canvas.queryByRole('columnheader')).toBeNull();
  },
};
/** Tablet portrait (768px) — card list still active; table view takes over at `xl` (1024). */
export const Tablet: Story = { parameters: { viewport: { defaultViewport: 'bpLg' } } };
/** Desktop (1024px) — the `xl` switch point; table view active. */
export const Desktop: Story = { parameters: { viewport: { defaultViewport: 'bpXl' } } };
export const Loading: Story = {
  render: () =>
    renderPage(<ListingsListPage />, {
      path: '/listings',
      initialPath: '/listings',
      extraRoutes: [{ path: '*', element: <div /> }],
      seed: () => {},
    }),
};
export const Empty: Story = {
  render: () =>
    renderPage(<ListingsListPage />, {
      path: '/listings',
      initialPath: '/listings',
      extraRoutes: [{ path: '*', element: <div /> }],
      seed: (qc) => {
        qc.setQueryData(listingKeys.list(defaultQuery), { items: [], total: 0, page: 1, pageSize: 25 });
        seedStats(qc);
      },
    }),
};
// A real isError state (not a mirror of Empty) — deterministic, no network.
export const Error: Story = {
  render: () =>
    renderPage(<ListingsListPage />, {
      path: '/listings',
      initialPath: '/listings',
      extraRoutes: [{ path: '*', element: <div /> }],
      seed: (qc) => {
        seedQueryError(qc, listingKeys.list(defaultQuery));
        seedStats(qc);
      },
    }),
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('alert')).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Tekrar dene' })).toBeInTheDocument();
  },
};

function renderView(path: string, seed: (qc: QueryClient) => void) {
  return renderPage(<ListingsListPage />, {
    path: '/listings',
    initialPath: path,
    extraRoutes: [{ path: '*', element: <div /> }],
    seed,
  });
}

/** Kanban view (?view=kanban) with data — the moderation board renders. */
export const KanbanView: Story = {
  render: () =>
    renderView('/listings?view=kanban', (qc) => {
      qc.setQueryData(listingKeys.list(defaultQuery), {
        items: MOCK_LISTINGS,
        total: MOCK_LISTINGS.length,
        page: 1,
        pageSize: 25,
      });
      seedStats(qc);
    }),
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('list', { name: 'Durum panosu' })).toBeInTheDocument();
  },
};

/** Non-table views must show a real loading state, not a silent empty board. */
export const KanbanLoading: Story = {
  render: () => renderView('/listings?view=kanban', (qc) => seedStats(qc)),
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('status', { name: 'İlanlar yükleniyor' })).toBeInTheDocument();
  },
};

/** Non-table views must surface fetch errors with a retry, not an empty board. */
export const KanbanError: Story = {
  render: () =>
    renderView('/listings?view=kanban', (qc) => {
      seedQueryError(qc, listingKeys.list(defaultQuery));
      seedStats(qc);
    }),
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('alert')).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Tekrar dene' })).toBeInTheDocument();
  },
};
