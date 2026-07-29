import type { Meta, StoryObj } from '@storybook/react-vite';
import { getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { expect, userEvent, within } from 'storybook/test';

import { ColumnVisibility } from './ColumnVisibility';
import { demoColumns, DEMO_ROWS } from './story-fixtures';

function Harness() {
  const table = useReactTable({
    data: DEMO_ROWS.slice(0, 3),
    columns: demoColumns,
    getCoreRowModel: getCoreRowModel(),
    enableColumnPinning: true,
  });
  return <ColumnVisibility table={table} />;
}

const meta = {
  title: 'DataTable/ColumnVisibility',
  parameters: { layout: 'centered' },
  render: () => <Harness />,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: /Kolonlar/ }));
    await expect(await within(document.body).findByText('Görünür kolonlar')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
  },
};
/** The menu always exposes keyboard-accessible pin + move (per-column submenu). */
export const WithControls: Story = {
  play: async ({ canvas }) => {
    const body = within(document.body);
    await userEvent.click(canvas.getByRole('button', { name: /Kolonlar/ }));
    await expect(await body.findByText('Kolon düzeni')).toBeInTheDocument();
    await userEvent.click(await body.findByRole('menuitem', { name: 'Şehir' }));
    await expect(await body.findByRole('menuitem', { name: 'Sola sabitle' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
  },
};
export const Loading: Story = { render: () => <div className="bg-muted h-8 w-24 animate-pulse rounded-md" /> };
export const Empty: Story = { render: () => <Harness /> };
export const Error: Story = { render: () => <Harness /> };
export const Mobile: Story = { parameters: { viewport: { defaultViewport: 'mobile1' } } };
