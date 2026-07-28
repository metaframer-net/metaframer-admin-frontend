import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { ListingKanban } from './ListingKanban';
import { MOCK_LISTINGS } from '../pages/page-story-utils';
import { shellRouterDecorator } from '@/components/shell/story-helpers';

const meta = {
  title: 'Listings/ListingKanban',
  component: ListingKanban,
  parameters: { layout: 'fullscreen' },
  decorators: [shellRouterDecorator()],
} satisfies Meta<typeof ListingKanban>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { listings: MOCK_LISTINGS },
  render: (args) => (
    <div className="p-4">
      <ListingKanban {...args} />
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('list', { name: 'Durum panosu' })).toBeInTheDocument();
    await expect(canvas.getByText('İstanbul konut ilanı 1')).toBeInTheDocument();
  },
};

export const Empty: Story = { args: { listings: [] }, render: (args) => <div className="p-4"><ListingKanban {...args} /></div> };
export const Mobile: Story = { args: { listings: MOCK_LISTINGS }, render: (args) => <div className="p-4"><ListingKanban {...args} /></div>, parameters: { viewport: { defaultViewport: 'mobile1' } } };
