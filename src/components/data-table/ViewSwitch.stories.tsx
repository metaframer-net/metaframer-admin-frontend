import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor } from 'storybook/test';

import { ViewSwitch, type DataView } from './ViewSwitch';

const meta = {
  title: 'DataTable/ViewSwitch',
  parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function Harness({
  initial = 'table' as DataView,
  views,
}: {
  initial?: DataView;
  views?: DataView[];
}) {
  const [view, setView] = useState<DataView>(initial);
  return <ViewSwitch value={view} onChange={setView} views={views} entity="demo" />;
}

/** Default — all four views. */
export const Default: Story = { render: () => <Harness /> };

/** Only table + kanban views. */
export const TwoViews: Story = {
  render: () => <Harness views={['table', 'kanban']} />,
};

/** Table + kanban + gallery (no map). */
export const ThreeViews: Story = {
  render: () => <Harness views={['table', 'kanban', 'gallery']} />,
};

/** Starts on gallery view. */
export const InitialGallery: Story = {
  render: () => <Harness initial="gallery" views={['table', 'kanban', 'gallery', 'map']} />,
};

/** Interaction: switches to Kanban and verifies aria-pressed. */
export const SwitchesView: Story = {
  render: () => <Harness />,
  play: async ({ canvas }) => {
    const kanban = canvas.getByRole('button', { name: 'Kanban' });
    await userEvent.click(kanban);
    await waitFor(() => expect(kanban).toHaveAttribute('aria-pressed', 'true'));

    const table = canvas.getByRole('button', { name: 'Tablo' });
    await waitFor(() => expect(table).toHaveAttribute('aria-pressed', 'false'));
  },
};

/** Mobile viewport — labels hidden, only icons shown. */
export const Mobile: Story = {
  render: () => <Harness />,
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
