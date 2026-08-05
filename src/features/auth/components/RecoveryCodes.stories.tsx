import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent } from 'storybook/test';

import { RecoveryCodes } from './RecoveryCodes';

const CODES = ['A1B2-C3D4', 'E5F6-G7H8', 'J9K0-L1M2', 'N3P4-Q5R6', 'S7T8-U9V0', 'W1X2-Y3Z4', 'AA11-BB22', 'CC33-DD44', 'EE55-FF66', 'GG77-HH88'];

const meta = {
  title: 'Auth/RecoveryCodes',
  component: RecoveryCodes,
  parameters: { layout: 'centered' },
  args: { codes: CODES, onDone: fn() },
  decorators: [(Story) => <div className="w-96"><Story /></div>],
} satisfies Meta<typeof RecoveryCodes>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Mobile: Story = { parameters: { viewport: { defaultViewport: 'mobile1' } } };

export const Interaction: Story = {
  play: async ({ canvas, args }) => {
    await expect(canvas.getByText('A1B2-C3D4')).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: /Kaydettim/ }));
    await expect(args.onDone).toHaveBeenCalled();
  },
};
