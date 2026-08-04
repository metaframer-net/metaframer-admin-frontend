import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent } from 'storybook/test';

import { TwoFactorPolicyForm } from './TwoFactorPolicyForm';

const meta = {
  title: 'Auth/TwoFactorPolicyForm',
  component: TwoFactorPolicyForm,
  parameters: { layout: 'centered' },
  args: { requiredRoles: ['super-admin', 'finance'], onToggle: fn() },
  decorators: [(Story) => <div className="w-96"><Story /></div>],
} satisfies Meta<typeof TwoFactorPolicyForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const ReadOnly: Story = { args: { readOnly: true } };
export const Mobile: Story = { parameters: { viewport: { defaultViewport: 'mobile1' } } };

export const Interaction: Story = {
  play: async ({ canvas, args }) => {
    // Moderatör is not required by default → toggling it on calls onToggle.
    await userEvent.click(canvas.getByLabelText('Moderatör'));
    await expect(args.onToggle).toHaveBeenCalledWith('moderator', true);
  },
};
