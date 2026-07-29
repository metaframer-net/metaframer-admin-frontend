import type { Meta, StoryObj } from '@storybook/react-vite';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

import { ResetPasswordPage } from './ResetPasswordPage';

const meta = {
  title: 'Auth/ResetPasswordPage',
  component: ResetPasswordPage,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ResetPasswordPage>;

export default meta;
type Story = StoryObj<typeof meta>;

function renderAt(initialPath: string) {
  const router = createMemoryRouter(
    [
      { path: '/reset-password', element: <ResetPasswordPage /> },
      { path: '/login', element: <div>Giriş</div> },
      { path: '/forgot-password', element: <div>Şifremi unuttum</div> },
    ],
    { initialEntries: [initialPath] },
  );
  return <RouterProvider router={router} />;
}

export const Default: Story = { render: () => renderAt('/reset-password?token=demo-token') };
export const InvalidLink: Story = { render: () => renderAt('/reset-password') };
export const Mobile: Story = {
  render: () => renderAt('/reset-password?token=demo-token'),
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
