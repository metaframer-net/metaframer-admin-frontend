import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { ListingsMap } from './ListingsMap';
import { MOCK_LISTINGS } from '../pages/page-story-utils';
import { shellRouterDecorator } from '@/components/shell/story-helpers';

const meta = {
  title: 'Listings/ListingsMap',
  component: ListingsMap,
  parameters: { layout: 'fullscreen' },
  decorators: [shellRouterDecorator()],
} satisfies Meta<typeof ListingsMap>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { listings: MOCK_LISTINGS },
  render: (args) => (
    <div className="p-4">
      <ListingsMap {...args} />
    </div>
  ),
};

export const Empty: Story = {
  args: { listings: [] },
  render: (args) => (
    <div className="p-4">
      <ListingsMap {...args} />
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Kayıt bulunamadı')).toBeInTheDocument();
  },
};

export const Mobile: Story = {
  args: { listings: MOCK_LISTINGS },
  render: (args) => (
    <div className="p-4">
      <ListingsMap {...args} />
    </div>
  ),
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
