import type { Meta, StoryObj } from '@storybook/react-vite';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

import { ForgotPasswordPage } from './ForgotPasswordPage';

const meta = {
  title: 'Auth/ForgotPasswordPage',
  component: ForgotPasswordPage,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ForgotPasswordPage>;

export default meta;
type Story = StoryObj<typeof meta>;

function render() {
  const router = createMemoryRouter(
    [
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/login', element: <div>Giriş</div> },
      { path: '/reset-password', element: <div>Sıfırla</div> },
    ],
    { initialEntries: ['/forgot-password'] },
  );
  return <RouterProvider router={router} />;
}

export const Default: Story = { render };
export const Mobile: Story = { render, parameters: { viewport: { defaultViewport: 'mobile1' } } };
