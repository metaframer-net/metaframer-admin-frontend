import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { Brand } from './Brand';
import { shellRouterDecorator } from './story-helpers';

const meta = {
  title: 'Shell/Brand',
  component: Brand,
  parameters: { layout: 'centered' },
  decorators: [shellRouterDecorator()],
} satisfies Meta<typeof Brand>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: /example/i })).toBeInTheDocument();
  },
};

export const Compact: Story = { args: { compact: true } };
export const Mobile: Story = { parameters: { viewport: { defaultViewport: 'mobile1' } } };
export const Loading: Story = { render: () => <div className="bg-muted h-8 w-28 animate-pulse rounded-md" /> };
export const Empty: Story = { render: () => <Brand compact /> };
export const Error: Story = { render: () => <Brand /> };
