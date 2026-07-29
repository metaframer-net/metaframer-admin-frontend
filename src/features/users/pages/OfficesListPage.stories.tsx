import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { OfficesListPage } from './OfficesListPage';
import { userKeys } from '../api/queries';
import { MOCK_USERS, renderPage } from './page-story-utils';

// Query is locked to type=office (see OfficesListPage.withOfficeType).
const officeQuery = { page: 1, pageSize: 25, sort: [], filters: { type: 'office' }, q: '' };
const OFFICES = MOCK_USERS.filter((u) => u.type === 'office');

function render() {
  return renderPage(<OfficesListPage />, {
    path: '/users/agents',
    initialPath: '/users/agents',
    extraRoutes: [{ path: '*', element: <div /> }],
    seed: (qc) =>
      qc.setQueryData(userKeys.list(officeQuery), {
        items: OFFICES,
        total: OFFICES.length,
        page: 1,
        pageSize: 25,
      }),
  });
}

const meta = {
  title: 'Users/Pages/Offices',
  parameters: { layout: 'fullscreen' },
  render,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Sidebar: Story = {
  globals: { layout: 'sidebar' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: 'Emlak Ofisleri' })).toBeInTheDocument();
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
    renderPage(<OfficesListPage />, {
      path: '/users/agents',
      initialPath: '/users/agents',
      extraRoutes: [{ path: '*', element: <div /> }],
      seed: () => {},
    }),
};
export const Empty: Story = {
  render: () =>
    renderPage(<OfficesListPage />, {
      path: '/users/agents',
      initialPath: '/users/agents',
      extraRoutes: [{ path: '*', element: <div /> }],
      seed: (qc) =>
        qc.setQueryData(userKeys.list(officeQuery), { items: [], total: 0, page: 1, pageSize: 25 }),
    }),
};
export const Error: Story = { ...Empty };

/**
 * Structural parity (DATA_TABLE_SPEC): every filterable column carries a header
 * funnel that writes to the same URL-synced state as the toolbar, and the
 * DataTable supplies the expand toggle for the detail sub-row.
 */
export const ColumnFilters: Story = {
  play: async ({ canvas }) => {
    for (const label of ['Durum', 'Güven skoru', 'Ofis belgesi', 'Şehir']) {
      await expect(
        canvas.getByRole('button', { name: `${label} sütununu filtrele` }),
      ).toBeInTheDocument();
    }
    await expect(canvas.getAllByRole('button', { name: 'Detayı aç' }).length).toBeGreaterThan(0);
  },
};
