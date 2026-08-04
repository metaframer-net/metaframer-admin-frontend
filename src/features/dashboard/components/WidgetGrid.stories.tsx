import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { expect } from 'storybook/test';

import { WIDGET_IDS, type DashboardLayout } from '@/config/dashboard-layout';
import { DASHBOARD_INSIGHTS } from '../api/handlers';
import type { DashboardStats } from '../api/queries';
import { useDashboardLayout } from '../lib/use-dashboard-layout';
import type { WidgetContext } from './widget-registry';
import { WidgetGrid } from './WidgetGrid';

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
  ],
  trends: {
    totalListings: [40, 44, 48, 52, 55, 58, 60],
    pending: [18, 16, 15, 14, 13, 12, 12],
    active: [12, 14, 15, 17, 18, 19, 20],
    rejected: [3, 4, 5, 6, 7, 8, 8],
  },
};

const CTX: WidgetContext = {
  stats: STATS,
  insights: DASHBOARD_INSIGHTS,
  kpi: DASHBOARD_INSIGHTS.periods.today,
  pending: [],
  audit: [],
  period: 'today',
  loading: false,
};

function Grid({ editing = false, initial }: { editing?: boolean; initial?: Partial<DashboardLayout> }) {
  const layout = useDashboardLayout({ persist: false, ...(initial ? { initial } : {}) });
  return <WidgetGrid layout={layout} ctx={CTX} editing={editing} labelledBy="dash-tab-genel" />;
}

const meta = {
  title: 'Dashboard/WidgetGrid',
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div className="p-6">
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Genel section — the default widget set. */
export const Default: Story = {
  render: () => <Grid />,
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Kategoriye göre ilanlar')).toBeInTheDocument();
  },
};

/** Edit mode — reorder/remove toolbars appear on each widget. */
export const Editing: Story = {
  render: () => <Grid editing />,
  play: async ({ canvas }) => {
    await expect((await canvas.findAllByRole('button', { name: /kaldır/ })).length).toBeGreaterThan(0);
  },
};

/** Empty — every widget removed: the empty-view state shows. */
export const Empty: Story = {
  render: () => <Grid initial={{ hidden: [...WIDGET_IDS] }} />,
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Bu görünümde widget yok')).toBeInTheDocument();
  },
};

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  render: () => <Grid />,
};
