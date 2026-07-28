import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { ListingGallery } from './ListingGallery';
import { MOCK_LISTINGS } from '../pages/page-story-utils';
import { shellRouterDecorator } from '@/components/shell/story-helpers';

const meta = {
  title: 'Listings/ListingGallery',
  component: ListingGallery,
  parameters: { layout: 'fullscreen' },
  decorators: [shellRouterDecorator()],
} satisfies Meta<typeof ListingGallery>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { listings: MOCK_LISTINGS },
  render: (args) => (
    <div className="p-4">
      <ListingGallery {...args} />
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('İstanbul konut ilanı 1')).toBeInTheDocument();
  },
};

export const Empty: Story = { args: { listings: [] }, render: (args) => <div className="p-4"><ListingGallery {...args} /></div> };
export const Mobile: Story = { args: { listings: MOCK_LISTINGS }, render: (args) => <div className="p-4"><ListingGallery {...args} /></div>, parameters: { viewport: { defaultViewport: 'mobile1' } } };
