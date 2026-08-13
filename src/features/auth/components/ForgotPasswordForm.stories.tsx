import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent } from 'storybook/test';

import { ForgotPasswordForm } from './ForgotPasswordForm';

const meta = {
  title: 'Auth/ForgotPasswordForm',
  component: ForgotPasswordForm,
  parameters: { layout: 'centered' },
  args: { onSubmit: fn() },
  decorators: [(Story) => <div className="w-80"><Story /></div>],
} satisfies Meta<typeof ForgotPasswordForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Submitting: Story = { args: { pending: true } };
export const WithError: Story = { args: { errorMessage: 'İşlem tamamlanamadı. Lütfen tekrar deneyin.' } };
export const Empty: Story = {};
export const Mobile: Story = { parameters: { viewport: { defaultViewport: 'mobile1' } } };

/** Invalid email blocks submit; a valid one calls onSubmit. */
export const Interaction: Story = {
  play: async ({ canvas, args }) => {
    const email = canvas.getByPlaceholderText('ad.soyad@example.net');
    await userEvent.type(email, 'not-an-email');
    await userEvent.click(canvas.getByRole('button', { name: 'Sıfırlama bağlantısı gönder' }));
    await expect(await canvas.findByText('Geçerli bir e-posta adresi girin.')).toBeInTheDocument();
    await expect(args.onSubmit).not.toHaveBeenCalled();

    await userEvent.clear(email);
    await userEvent.type(email, 'moderator@example.net');
    await userEvent.click(canvas.getByRole('button', { name: 'Sıfırlama bağlantısı gönder' }));
    await expect(args.onSubmit).toHaveBeenCalled();
  },
};
