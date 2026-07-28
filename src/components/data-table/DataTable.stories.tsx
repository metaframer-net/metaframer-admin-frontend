import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { DataTable } from './DataTable';
import { DataTableDemo, demoColumns, DEMO_ROWS } from './story-fixtures';
import { useTableUrlState } from './use-table-url-state';
import { shellRouterDecorator } from '@/components/shell/story-helpers';

function StateHarness({ isLoading, isError, empty }: { isLoading?: boolean; isError?: boolean; empty?: boolean }) {
  const state = useTableUrlState({ defaultPageSize: 10 });
  return (
    <div className="p-4">
      <DataTable
        columns={demoColumns}
        data={empty ? [] : DEMO_ROWS.slice(0, 10)}
        total={empty ? 0 : DEMO_ROWS.length}
        state={state}
        getRowId={(r) => r.id}
        isLoading={isLoading ?? false}
        isError={isError ?? false}
        onRetry={() => {}}
      />
    </div>
  );
}

const meta = {
  title: 'DataTable/DataTable',
  parameters: { layout: 'fullscreen' },
  decorators: [shellRouterDecorator()],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <DataTableDemo />,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('columnheader', { name: /Başlık/ })).toBeInTheDocument();
    await expect(canvas.getAllByRole('row').length).toBeGreaterThan(1);
  },
};

export const SortsByColumn: Story = {
  render: () => <DataTableDemo />,
  play: async ({ canvas }) => {
    // Numeric columns sort descending on first click (TanStack sortDescFirst).
    // The Fiyat header now has two buttons (filter funnel + sort) — target sort by name.
    await userEvent.click(
      within(canvas.getByRole('columnheader', { name: /Fiyat/ })).getByRole('button', { name: 'Fiyat' }),
    );
    await waitFor(() =>
      expect(canvas.getByRole('columnheader', { name: /Fiyat/ })).toHaveAttribute('aria-sort', 'descending'),
    );
  },
};

export const FiltersByFacet: Story = {
  render: () => <DataTableDemo />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Durum filtresi' }));
    const option = await within(document.body).findByRole('checkbox', { name: 'Yayında' });
    await userEvent.click(option);
    await expect(await canvas.findByText('Durum: Yayında')).toBeInTheDocument();
  },
};

export const FiltersByColumnHeader: Story = {
  render: () => <DataTableDemo />,
  play: async ({ canvas }) => {
    // The funnel sits on the LEFT of the column label and writes to the same
    // URL-synced state as the toolbar filter → the chip appears just the same.
    await userEvent.click(canvas.getByRole('button', { name: 'Durum sütununu filtrele' }));
    const option = await within(document.body).findByRole('checkbox', { name: 'Yayında' });
    await userEvent.click(option);
    await expect(await canvas.findByText('Durum: Yayında')).toBeInTheDocument();
  },
};

export const SelectsRowsAndShowsBulkBar: Story = {
  render: () => <DataTableDemo />,
  play: async ({ canvas }) => {
    const rowCheckbox = canvas.getByRole('checkbox', { name: /İlan 1 .* satırını seç/ });
    await userEvent.click(rowCheckbox);
    await expect(await canvas.findByRole('region', { name: 'Toplu işlemler' })).toBeInTheDocument();
  },
};

export const ColumnControls: Story = {
  render: () => <DataTableDemo columnControls />,
  play: async ({ canvas }) => {
    // Drag handles are present on reorderable headers (mouse affordance)…
    await expect(canvas.getAllByRole('button', { name: 'Kolonu taşımak için sürükle' }).length).toBeGreaterThan(0);

    // …and the Kolonlar menu exposes a keyboard-accessible pin alternative.
    await userEvent.click(canvas.getByRole('button', { name: 'Kolonlar' }));
    const body = within(document.body);
    await userEvent.click(await body.findByRole('menuitem', { name: 'Şehir' }));
    await userEvent.click(await body.findByRole('menuitem', { name: 'Sola sabitle' }));
    await userEvent.keyboard('{Escape}');

    // The pinned column header becomes sticky (position set inline).
    await waitFor(() => {
      const sticky = canvas
        .getAllByRole('columnheader')
        .some((th) => (th as HTMLElement).style.position === 'sticky');
      expect(sticky).toBe(true);
    });
  },
};

export const Loading: Story = { render: () => <StateHarness isLoading /> };
export const Empty: Story = { render: () => <StateHarness empty /> };
export const Error: Story = { render: () => <StateHarness isError /> };
export const Mobile: Story = {
  render: () => <DataTableDemo />,
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};

/**
 * Tablet portrait (768px). The table ↔ card switch is the heart of Strategy A
 * (task 019): it must stay at `xl` (1024), NOT drop to `lg` (768). At 768 the
 * card list is still the active view. Assertions check the switch classes
 * (`xl:block` desktop table / `xl:hidden` mobile cards) so the threshold is
 * proven independent of the test runner's actual window size.
 */
export const Tablet: Story = {
  render: () => <DataTableDemo />,
  parameters: { viewport: { defaultViewport: 'bpLg' } },
  play: async ({ canvas }) => {
    // The viewport IS applied in the runner: at 768 (below xl) the desktop table is
    // `display:none`, so its column headers leave the a11y tree and the card view is
    // active. That the table drops out here — but is present at 1024 (Desktop story) —
    // proves the switch stayed at 1024, not 768.
    await expect(canvas.queryByRole('columnheader', { name: /Başlık/ })).toBeNull();
  },
};

/** Desktop (1024px) — the `xl` threshold where the table view takes over. */
export const Desktop: Story = {
  render: () => <DataTableDemo />,
  parameters: { viewport: { defaultViewport: 'bpXl' } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('columnheader', { name: /Başlık/ })).toBeInTheDocument();
  },
};
