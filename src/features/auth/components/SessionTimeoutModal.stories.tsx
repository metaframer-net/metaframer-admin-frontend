import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { SessionTimeoutModal } from './SessionTimeoutModal';

const meta = {
  title: 'Auth/SessionTimeoutModal',
  component: SessionTimeoutModal,
  parameters: { layout: 'fullscreen' },
  args: { open: true, onReauth: fn(), onLogout: fn() },
} satisfies Meta<typeof SessionTimeoutModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Submitting: Story = { args: { pending: true } };
export const WithError: Story = { args: { errorMessage: 'Şifre hatalı.' } };
export const Mobile: Story = { parameters: { viewport: { defaultViewport: 'mobile1' } } };

/** Enter password → onReauth; the sign-out button → onLogout. */
export const Interaction: Story = {
  play: async ({ args }) => {
    const body = within(document.body);
    await userEvent.type(body.getByLabelText('Şifre'), 'arsam1234');
    await userEvent.click(body.getByRole('button', { name: 'Kilidi aç' }));
    await expect(args.onReauth).toHaveBeenCalledWith('arsam1234');

    await userEvent.click(body.getByRole('button', { name: 'Çıkış yap' }));
    await expect(args.onLogout).toHaveBeenCalled();
  },
};
