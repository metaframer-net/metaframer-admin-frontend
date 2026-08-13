import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent } from 'storybook/test';

import { ChangePasswordForm } from './ChangePasswordForm';

const meta = {
  title: 'Auth/ChangePasswordForm',
  component: ChangePasswordForm,
  parameters: { layout: 'centered' },
  args: { onSubmit: fn() },
  decorators: [(Story) => <div className="w-96"><Story /></div>],
} satisfies Meta<typeof ChangePasswordForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Submitting: Story = { args: { pending: true } };
export const WithError: Story = { args: { errorMessage: 'Mevcut şifre hatalı.' } };
export const Empty: Story = {};
export const Mobile: Story = { parameters: { viewport: { defaultViewport: 'mobile1' } } };

export const Interaction: Story = {
  play: async ({ canvas, args }) => {
    const [current, next, confirm] = canvas.getAllByPlaceholderText('••••••••');

    // Mismatch blocks submit.
    await userEvent.type(current!, 'example1234');
    await userEvent.type(next!, 'newStrong1');
    await userEvent.type(confirm!, 'different1');
    await userEvent.click(canvas.getByRole('button', { name: 'Şifreyi güncelle' }));
    await expect(await canvas.findByText('Şifreler eşleşmiyor.')).toBeInTheDocument();
    await expect(args.onSubmit).not.toHaveBeenCalled();

    // Matching passes.
    await userEvent.clear(confirm!);
    await userEvent.type(confirm!, 'newStrong1');
    await userEvent.click(canvas.getByRole('button', { name: 'Şifreyi güncelle' }));
    await expect(args.onSubmit).toHaveBeenCalledWith({
      currentPassword: 'example1234',
      newPassword: 'newStrong1',
    });
  },
};
