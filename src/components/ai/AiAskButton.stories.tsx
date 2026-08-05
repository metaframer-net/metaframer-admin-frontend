import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent } from 'storybook/test';

import { AiAskButton } from './AiAskButton';

/**
 * The liquid-glass "Ask AI" launcher. It is a single interactive affordance, so
 * the loading/empty/error states do not apply — the assistant's data states live
 * in `AssistantPanel` / `AssistantDock`. We ship Default, a size scale, a dark
 * surface, and Mobile instead.
 */
const meta = {
  title: 'AI/AiAskButton',
  component: AiAskButton,
  parameters: { layout: 'centered' },
  args: { onClick: fn() },
  decorators: [
    (Story) => (
      <div className="grid min-h-[240px] place-items-center p-10">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AiAskButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, args }) => {
    const btn = canvas.getByRole('button', { name: /ask ai/i });
    await expect(btn).toBeInTheDocument();
    // AI-first hooks are present on the launcher.
    await expect(btn).toHaveAttribute('data-action', 'open-assistant');
    await expect(btn).toHaveAttribute('data-entity', 'assistant');
    // Touch target comfortably clears the 44px WCAG 2.2 AA minimum.
    const rect = btn.getBoundingClientRect();
    await expect(rect.height).toBeGreaterThanOrEqual(44);
    await userEvent.click(btn);
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

export const Sizes: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-8">
      <AiAskButton {...args} size={56} label="Ask AI" />
      <AiAskButton {...args} size={72} />
      <AiAskButton {...args} size={84} />
      <AiAskButton {...args} size={120} />
    </div>
  ),
};

export const OnDarkSurface: Story = {
  decorators: [
    (Story) => (
      <div className="dark bg-background grid min-h-[240px] place-items-center p-10">
        <Story />
      </div>
    ),
  ],
};

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
