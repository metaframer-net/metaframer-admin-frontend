import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { ListingPhotoStudio } from './ListingPhotoStudio';

const meta = {
  title: 'Listings/ListingPhotoStudio',
  component: ListingPhotoStudio,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof ListingPhotoStudio>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { initialCount: 3 },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Kapak')).toBeInTheDocument();
    await expect(canvas.getByLabelText('Yüklenen fotoğraflar')).toBeInTheDocument();
  },
};

export const Empty: Story = { args: { initialCount: 0 } };

export const AddsAndRemoves: Story = {
  args: { initialCount: 2 },
  play: async ({ canvas }) => {
    const list = canvas.getByLabelText('Yüklenen fotoğraflar');
    const initial = within(list).getAllByRole('listitem').length;
    await userEvent.click(canvas.getByRole('button', { name: 'Fotoğraf ekle' }));
    await waitFor(() => expect(within(list).getAllByRole('listitem').length).toBe(initial + 1));
    await userEvent.click(canvas.getByRole('button', { name: '1. fotoğrafı kaldır' }));
    await waitFor(() => expect(within(list).getAllByRole('listitem').length).toBe(initial));
  },
};

export const Mobile: Story = { args: { initialCount: 3 }, parameters: { viewport: { defaultViewport: 'mobile1' } } };
