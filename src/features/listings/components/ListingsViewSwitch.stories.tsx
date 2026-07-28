import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor } from 'storybook/test';

import { ListingsViewSwitch, type ListingView } from './ListingsViewSwitch';

const meta = {
  title: 'Listings/ListingsViewSwitch',
  parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function Harness({ initial = 'table' as ListingView }) {
  const [view, setView] = useState<ListingView>(initial);
  return <ListingsViewSwitch value={view} onChange={setView} />;
}

export const Default: Story = { render: () => <Harness /> };

export const SwitchesView: Story = {
  render: () => <Harness />,
  play: async ({ canvas }) => {
    const kanban = canvas.getByRole('button', { name: 'Kanban' });
    await userEvent.click(kanban);
    await waitFor(() => expect(kanban).toHaveAttribute('aria-pressed', 'true'));
  },
};

export const Mobile: Story = { render: () => <Harness />, parameters: { viewport: { defaultViewport: 'mobile1' } } };
