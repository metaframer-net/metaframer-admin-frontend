import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent } from 'storybook/test';

import { TwoFactorForm } from './TwoFactorForm';

const meta = {
  title: 'Auth/TwoFactorForm',
  component: TwoFactorForm,
  parameters: { layout: 'centered' },
  args: { onSubmit: fn() },
  decorators: [(Story) => <div className="w-80"><Story /></div>],
} satisfies Meta<typeof TwoFactorForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Submitting: Story = { args: { pending: true } };
export const WithError: Story = { args: { errorMessage: 'Doğrulama kodu hatalı.' } };
export const Empty: Story = {};
export const Mobile: Story = { parameters: { viewport: { defaultViewport: 'mobile1' } } };

/** Rejects a short code, accepts a valid 6-digit code. */
export const Interaction: Story = {
  play: async ({ canvas, args }) => {
    const input = canvas.getByPlaceholderText('000000');
    await userEvent.type(input, '12');
    await userEvent.click(canvas.getByRole('button', { name: 'Doğrula' }));
    await expect(await canvas.findByText('6 haneli kodu girin.')).toBeInTheDocument();
    await expect(args.onSubmit).not.toHaveBeenCalled();

    await userEvent.clear(input);
    await userEvent.type(input, '123456');
    await userEvent.click(canvas.getByRole('button', { name: 'Doğrula' }));
    await expect(args.onSubmit).toHaveBeenCalledWith('123456');
  },
};
