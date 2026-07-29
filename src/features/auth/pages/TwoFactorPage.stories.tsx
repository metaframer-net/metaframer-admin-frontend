import type { Meta, StoryObj } from '@storybook/react-vite';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

import { TwoFactorPage } from './TwoFactorPage';

const meta = {
  title: 'Auth/TwoFactorPage',
  component: TwoFactorPage,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof TwoFactorPage>;

export default meta;
type Story = StoryObj<typeof meta>;

function renderWithChallenge(withState: boolean) {
  const router = createMemoryRouter(
    [
      { path: '/login/2fa', element: <TwoFactorPage /> },
      { path: '/login', element: <div>Giriş</div> },
      { path: '/', element: <div>Panel</div> },
    ],
    {
      initialEntries: [
        withState
          ? { pathname: '/login/2fa', state: { challengeToken: 'chal-demo', returnTo: '/' } }
          : { pathname: '/login/2fa' },
      ],
    },
  );
  return <RouterProvider router={router} />;
}

export const Default: Story = { render: () => renderWithChallenge(true) };
/** No challenge in navigation state → bounced back to /login. */
export const NoChallenge: Story = { render: () => renderWithChallenge(false) };
export const Mobile: Story = {
  render: () => renderWithChallenge(true),
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
