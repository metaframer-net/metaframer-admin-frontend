import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { ListingPreviewCard } from './ListingPreviewCard';

const meta = {
  title: 'Listings/ListingPreviewCard',
  component: ListingPreviewCard,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof ListingPreviewCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    values: {
      title: "Moda'da deniz manzaralı 3+1 daire",
      category: 'konut',
      price: '2450000',
      il: '34',
      ilce: 'Kadıköy',
      mahalle: 'Moda',
      grossArea: '135',
      rooms: '3+1',
      buildingAge: '8',
      floor: '4',
      heating: 'dogalgaz',
      deedStatus: 'kat-mulkiyeti',
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Moda'da deniz manzaralı 3+1 daire")).toBeInTheDocument();
    await expect(canvas.getByText('2.450.000 ₺')).toBeInTheDocument();
  },
};

export const Empty: Story = { args: { values: {} } };
export const NoPrice: Story = {
  args: { values: { title: 'Taslak ilan', category: 'arsa', il: '06', grossArea: '500' } },
};
export const Mobile: Story = {
  args: { values: { title: 'Kışlık daire', category: 'konut', price: '1750000', il: '35' } },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
