import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent } from 'storybook/test';

import { SetPasswordForm } from './SetPasswordForm';

const meta = {
  title: 'Auth/SetPasswordForm',
  component: SetPasswordForm,
  parameters: { layout: 'centered' },
  args: { onSubmit: fn() },
  decorators: [(Story) => <div className="w-80"><Story /></div>],
} satisfies Meta<typeof SetPasswordForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Submitting: Story = { args: { pending: true } };
export const WithError: Story = { args: { errorMessage: 'Sıfırlama bağlantısı geçersiz veya süresi dolmuş.' } };
export const Empty: Story = {};
export const Mobile: Story = { parameters: { viewport: { defaultViewport: 'mobile1' } } };

/** Length rule, mismatch, then a valid matching password. */
export const Interaction: Story = {
  play: async ({ canvas, args }) => {
    const [password, confirm] = canvas.getAllByPlaceholderText('••••••••');

    await userEvent.type(password!, 'short');
    await userEvent.click(canvas.getByRole('button', { name: 'Şifreyi kaydet' }));
    await expect(await canvas.findByText('Şifre en az 8 karakter olmalı.')).toBeInTheDocument();

    await userEvent.clear(password!);
    await userEvent.type(password!, 'strongpass1');
    await userEvent.type(confirm!, 'different1');
    await userEvent.click(canvas.getByRole('button', { name: 'Şifreyi kaydet' }));
    await expect(await canvas.findByText('Şifreler eşleşmiyor.')).toBeInTheDocument();
    await expect(args.onSubmit).not.toHaveBeenCalled();

    await userEvent.clear(confirm!);
    await userEvent.type(confirm!, 'strongpass1');
    await userEvent.click(canvas.getByRole('button', { name: 'Şifreyi kaydet' }));
    await expect(args.onSubmit).toHaveBeenCalled();
  },
};
