import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { DashboardPage } from './DashboardPage';
import { dashboardKeys, type DashboardStats } from '../api/queries';
import { DASHBOARD_INSIGHTS } from '../api/handlers';
import { DASHBOARD_STORAGE_KEY } from '@/config/dashboard-layout';
import { listingKeys } from '@/features/listings/api/queries';
import type { TableQuery } from '@/components/data-table/types';
import {
  MOCK_LISTINGS,
  renderPage,
  seedQueryError,
  seedQueryLoading,
} from '@/features/listings/pages/page-story-utils';

const PENDING_QUERY: TableQuery = {
  page: 1,
  pageSize: 5,
  sort: [{ id: 'createdAt', desc: true }],
  filters: { status: 'pending' },
  q: '',
};

const STATS: DashboardStats = {
  totalListings: 60,
  pending: 12,
  active: 20,
  rejected: 8,
  byCategory: [
    { category: 'konut', label: 'Konut', count: 18 },
    { category: 'isyeri', label: 'İşyeri', count: 12 },
    { category: 'arsa', label: 'Arsa', count: 14 },
    { category: 'devremulk', label: 'Devremülk', count: 8 },
    { category: 'turistik', label: 'Turistik Tesis', count: 8 },
  ],
  byStatus: [
    { status: 'active', label: 'Yayında', count: 20 },
    { status: 'pending', label: 'Beklemede', count: 12 },
    { status: 'rejected', label: 'Reddedildi', count: 8 },
    { status: 'draft', label: 'Taslak', count: 10 },
    { status: 'expired', label: 'Süresi doldu', count: 6 },
    { status: 'archived', label: 'Arşivlendi', count: 4 },
  ],
  trends: {
    totalListings: [40, 44, 48, 52, 55, 58, 60],
    pending: [18, 16, 15, 14, 13, 12, 12],
    active: [12, 14, 15, 17, 18, 19, 20],
    rejected: [3, 4, 5, 6, 7, 8, 8],
  },
};

const EMPTY_STATS: DashboardStats = {
  totalListings: 0,
  pending: 0,
  active: 0,
  rejected: 0,
  byCategory: [],
  byStatus: [],
  trends: { totalListings: [], pending: [], active: [], rejected: [] },
};

type Mode = 'seeded' | 'loading' | 'empty' | 'error' | 'insights-error';

function render(mode: Mode = 'seeded') {
  return renderPage(<DashboardPage />, {
    path: '/',
    initialPath: '/',
    extraRoutes: [{ path: '*', element: <div /> }],
    seed: (qc) => {
      // Each story starts from the DEFAULT layout — clear any persisted
      // personalization so remove/reorder interactions don't leak between stories.
      try {
        window.localStorage.removeItem(DASHBOARD_STORAGE_KEY);
      } catch {
        /* ignore */
      }
      if (mode === 'loading') {
        seedQueryLoading(qc, dashboardKeys.stats);
        seedQueryLoading(qc, dashboardKeys.insights);
        seedQueryLoading(qc, listingKeys.list(PENDING_QUERY));
        return;
      }
      if (mode === 'error') {
        seedQueryError(qc, dashboardKeys.stats);
        qc.setQueryData(dashboardKeys.insights, DASHBOARD_INSIGHTS);
        return;
      }
      if (mode === 'insights-error') {
        // stats OK but insights fails — the board must STILL show the error
        // state (most widgets read from insights), not confident zeroes.
        qc.setQueryData(dashboardKeys.stats, STATS);
        seedQueryError(qc, dashboardKeys.insights);
        qc.setQueryData(listingKeys.list(PENDING_QUERY), {
          items: MOCK_LISTINGS.filter((l) => l.status === 'pending'),
          total: 12,
          page: 1,
          pageSize: 5,
        });
        return;
      }
      qc.setQueryData(dashboardKeys.stats, mode === 'empty' ? EMPTY_STATS : STATS);
      qc.setQueryData(dashboardKeys.insights, DASHBOARD_INSIGHTS);
      qc.setQueryData(listingKeys.list(PENDING_QUERY), {
        items: mode === 'empty' ? [] : MOCK_LISTINGS.filter((l) => l.status === 'pending'),
        total: mode === 'empty' ? 0 : 12,
        page: 1,
        pageSize: 5,
      });
    },
  });
}

const meta = {
  title: 'Dashboard/DashboardPage',
  parameters: { layout: 'fullscreen' },
  render: () => render(),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Genel (default) section — KPI band + category/status/pending widgets. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: 'Genel Bakış' })).toBeInTheDocument();
    await expect(await canvas.findByText('Toplam ilan')).toBeInTheDocument();
    await expect(canvas.getByText('Kategoriye göre ilanlar')).toBeInTheDocument();
    await expect(canvas.getByText('Duruma göre dağılım')).toBeInTheDocument();
  },
};

/** Switching sections swaps the visible widget set to a full, section-specific board. */
export const SectionSwitch: Story = {
  play: async ({ canvas }) => {
    // Section switch is an ARIA tablist (role="tab"), not toggle buttons.
    await userEvent.click(canvas.getByRole('tab', { name: 'Moderasyon' }));
    await expect(await canvas.findByText('Kuyruk yaşlanma — SLA')).toBeInTheDocument();
    await expect(canvas.getByText('Moderatör performansı')).toBeInTheDocument();

    await userEvent.click(canvas.getByRole('tab', { name: 'Gelir' }));
    await expect(await canvas.findByText('En çok kazandıran emlakçılar')).toBeInTheDocument();
    await expect(canvas.getByText('Gelir kırılımı')).toBeInTheDocument();

    await userEvent.click(canvas.getByRole('tab', { name: 'Trafik' }));
    await expect(await canvas.findByText('Trafik kaynağı')).toBeInTheDocument();
    await expect(canvas.getByText('Popüler aramalar')).toBeInTheDocument();
  },
};

/** The period toggle re-labels + re-values the period-scoped KPIs. */
export const PeriodSwitch: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Gelir · Bugün')).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: '30 gün' }));
    await expect(await canvas.findByText('Gelir · 30 gün')).toBeInTheDocument();
  },
};

/** Edit mode: remove a widget, then re-add it from the library dialog. */
export const EditRemoveAndAdd: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Düzenle' }));
    // Remove the "Hızlı erişim" widget via its labelled remove control.
    const removeBtn = await canvas.findByRole('button', { name: /Hızlı erişim.*kaldır/ });
    await userEvent.click(removeBtn);
    await expect(canvas.queryByText('Hızlı erişim')).not.toBeInTheDocument();

    // Re-add it from the library dialog (rendered in a portal → document scope).
    await userEvent.click(canvas.getByRole('button', { name: /Widget ekle/ }));
    const dialog = within(await within(document.body).findByRole('dialog'));
    await userEvent.click(dialog.getByRole('button', { name: 'Ekle' }));
    await expect(await canvas.findByText('Hızlı erişim')).toBeInTheDocument();
  },
};

export const Mobile: Story = { parameters: { viewport: { defaultViewport: 'mobile1' } } };

/** Smallest phone (320px) — widgets stack 1-up. */
export const Phone: Story = {
  parameters: { viewport: { defaultViewport: 'bpXs' } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Toplam ilan')).toBeInTheDocument();
  },
};

/** Tablet portrait (768px) — 2-up bento mosaic. */
export const Tablet: Story = {
  parameters: { viewport: { defaultViewport: 'bpLg' } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Kategoriye göre ilanlar')).toBeInTheDocument();
  },
};

/** Desktop (1024px) — 4-up KPI band above a 2-up panel grid. */
export const Desktop: Story = {
  parameters: { viewport: { defaultViewport: 'bpXl' } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Toplam ilan')).toBeInTheDocument();
    await expect(canvas.getByText('Kategoriye göre ilanlar')).toBeInTheDocument();
  },
};

/** Loading — shape-matched KPI bars + widget/chart skeletons. */
export const Loading: Story = {
  render: () => render('loading'),
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-slot="widget-skeleton"]')).not.toBeNull();
  },
};

/** Empty — zero listings: pending queue shows its empty state. */
export const Empty: Story = {
  render: () => render('empty'),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Bekleyen ilan yok')).toBeInTheDocument();
  },
};

/** Error — a failed stats fetch replaces the whole board with a retry state. */
export const Error: Story = {
  render: () => render('error'),
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('alert')).toBeInTheDocument();
    await expect(canvas.getByText('Panel yüklenemedi')).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Tekrar dene' })).toBeInTheDocument();
  },
};

/** Insights-only error — stats succeed but insights fail; the board still shows
 *  the retry state instead of rendering confident zeroes. */
export const InsightsError: Story = {
  render: () => render('insights-error'),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Panel yüklenemedi')).toBeInTheDocument();
  },
};
