import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { ListingsKpiStrip } from './ListingsKpiStrip';

const meta = {
  title: 'Listings/ListingsKpiStrip',
  component: ListingsKpiStrip,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof ListingsKpiStrip>;

export default meta;
type Story = StoryObj<typeof meta>;

const stats = { total: 248, pending: 37, aiNok: 6, active: 190 };

export const Default: Story = {
  args: { stats },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('248')).toBeInTheDocument();
    await expect(canvas.getByText('Moderasyon bekleyen')).toBeInTheDocument();
  },
};

export const Loading: Story = { args: { isLoading: true } };
export const Empty: Story = { args: { stats: { total: 0, pending: 0, aiNok: 0, active: 0 } } };
export const Error: Story = { args: { isLoading: true } };
export const Mobile: Story = { args: { stats }, parameters: { viewport: { defaultViewport: 'mobile1' } } };
