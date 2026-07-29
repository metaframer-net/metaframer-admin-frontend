import type { Meta, StoryObj } from '@storybook/react-vite';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

import { LoginPage } from './LoginPage';

/**
 * LoginPage composition (variant A). Wrapped in a memory router (it reads
 * `?returnTo` and navigates). The global providers decorator supplies the auth
 * context; with no persisted token it renders unauthenticated → the form shows.
 * Field-level states (submitting / error / validation) live in `LoginForm`.
 */
const meta = {
  title: 'Auth/LoginPage',
  component: LoginPage,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof LoginPage>;

export default meta;
type Story = StoryObj<typeof meta>;

function renderInRouter() {
  const router = createMemoryRouter(
    [
      { path: '/login', element: <LoginPage /> },
      { path: '/', element: <div>Dashboard</div> },
    ],
    { initialEntries: ['/login'] },
  );
  return <RouterProvider router={router} />;
}

export const Default: Story = { render: renderInRouter };

export const Mobile: Story = {
  render: renderInRouter,
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
