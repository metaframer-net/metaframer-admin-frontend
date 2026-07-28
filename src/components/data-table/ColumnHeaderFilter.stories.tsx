import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { ColumnHeaderFilter } from './ColumnHeaderFilter';
import { useTableUrlState } from './use-table-url-state';
import type { FilterConfig } from './types';
import { shellRouterDecorator } from '@/components/shell/story-helpers';

const facetedFilter: FilterConfig = {
  id: 'status',
  label: 'Durum',
  kind: 'faceted',
  multiple: true,
  options: [
    { value: 'active', label: 'Yayında', count: 12 },
    { value: 'pending', label: 'Beklemede', count: 5 },
    { value: 'rejected', label: 'Reddedildi', count: 2 },
  ],
};

const rangeFilter: FilterConfig = { id: 'price', label: 'Fiyat', kind: 'numberRange', unit: '₺' };

function Harness() {
  const state = useTableUrlState();
  return (
    <div className="flex items-center gap-8 p-10">
      <span className="text-muted-foreground inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide">
        <ColumnHeaderFilter filter={facetedFilter} state={state} />
        Durum
      </span>
      <span className="text-muted-foreground inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide">
        <ColumnHeaderFilter filter={rangeFilter} state={state} />
        Fiyat
      </span>
    </div>
  );
}

const meta = {
  title: 'DataTable/ColumnHeaderFilter',
  parameters: { layout: 'fullscreen' },
  decorators: [shellRouterDecorator()],
  render: () => <Harness />,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const FacetedFilters: Story = {
  play: async ({ canvas }) => {
    const funnel = canvas.getByRole('button', { name: 'Durum sütununu filtrele' });
    await expect(funnel).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(funnel);
    const option = await within(document.body).findByRole('checkbox', { name: 'Beklemede' });
    await userEvent.click(option);
    // Selecting a value marks the funnel active (not color-only: aria-pressed).
    await waitFor(() => expect(funnel).toHaveAttribute('aria-pressed', 'true'));
  },
};

export const RangeFilter: Story = {
  play: async ({ canvas }) => {
    const funnel = canvas.getByRole('button', { name: 'Fiyat sütununu filtrele' });
    await userEvent.click(funnel);
    await waitFor(() => expect(funnel).toHaveAttribute('aria-expanded', 'true'));
    // The number-range body (min/max inputs) mounts in the popover.
    await expect(await within(document.body).findByRole('group')).toBeInTheDocument();
  },
};

export const Mobile: Story = { parameters: { viewport: { defaultViewport: 'mobile1' } } };
