import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { expect, fn, userEvent } from 'storybook/test';

import { LoginForm } from './LoginForm';

const meta = {
  title: 'Auth/LoginForm',
  component: LoginForm,
  parameters: { layout: 'centered' },
  args: { onSubmit: fn() },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div className="w-80">
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof LoginForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** In-flight submit: inputs disabled, button spinner. */
export const Submitting: Story = { args: { pending: true } };

/** Server rejected the credentials (401). */
export const WithError: Story = { args: { errorMessage: 'E-posta veya şifre hatalı.' } };

/** Empty form == the idle/empty state. */
export const Empty: Story = {};

export const Mobile: Story = { parameters: { viewport: { defaultViewport: 'mobile1' } } };

/** Validation on submit, password reveal toggle, then a valid submission. */
export const Interaction: Story = {
  play: async ({ canvas, args }) => {
    // Empty submit surfaces validation errors and does NOT call onSubmit.
    await userEvent.click(canvas.getByRole('button', { name: 'Giriş yap' }));
    await expect(await canvas.findByText('E-posta adresi gerekli.')).toBeInTheDocument();
    await expect(args.onSubmit).not.toHaveBeenCalled();

    // Password starts masked; the toggle reveals it.
    const toggle = canvas.getByRole('button', { name: 'Şifreyi göster' });
    await userEvent.click(toggle);
    await expect(canvas.getByRole('button', { name: 'Şifreyi gizle' })).toBeInTheDocument();

    // Fill valid credentials and submit (query by placeholder — the labels carry
    // a required asterisk and "Şifre" also matches the reveal toggle).
    await userEvent.type(canvas.getByPlaceholderText('ad.soyad@example.net'), 'super@example.net');
    await userEvent.type(canvas.getByPlaceholderText('••••••••'), 'example1234');
    await userEvent.click(canvas.getByRole('button', { name: 'Giriş yap' }));
    await expect(args.onSubmit).toHaveBeenCalled();
  },
};
