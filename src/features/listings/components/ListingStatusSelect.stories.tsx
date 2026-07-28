import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { ListingStatusSelect } from './ListingStatusSelect';
import type { Listing } from '../schemas/listing';

const meta = {
  title: 'Listings/ListingStatusSelect',
  parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function Harness({ initial = 'pending' as Listing['status'] }) {
  const [value, setValue] = useState<Listing['status']>(initial);
  return (
    <div className="w-56">
      <ListingStatusSelect value={value} onChange={setValue} />
      <p className="text-muted-foreground mt-2 text-xs">
        Seçili: <span data-testid="value">{value}</span>
      </p>
    </div>
  );
}

export const Default: Story = { render: () => <Harness /> };

export const ChangesStatus: Story = {
  render: () => <Harness />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('combobox', { name: 'İlan durumunu değiştir' }));
    await userEvent.click(await within(document.body).findByRole('option', { name: 'Yayında' }));
    await waitFor(() => expect(canvas.getByTestId('value')).toHaveTextContent('active'));
  },
};

export const Disabled: Story = { render: () => <div className="w-56"><ListingStatusSelect value="active" onChange={() => {}} disabled /></div> };
export const Mobile: Story = { render: () => <Harness />, parameters: { viewport: { defaultViewport: 'mobile1' } } };
