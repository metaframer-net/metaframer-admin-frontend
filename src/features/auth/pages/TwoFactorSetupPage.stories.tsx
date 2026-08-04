import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

import { makeSeededClient } from '@/features/listings/pages/page-story-utils';
import { securityKeys } from '../api/hooks';
import { TwoFactorSetupPage } from './TwoFactorSetupPage';

const meta = {
  title: 'Auth/TwoFactorSetupPage',
  component: TwoFactorSetupPage,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof TwoFactorSetupPage>;

export default meta;
type Story = StoryObj<typeof meta>;

const SETUP = { secret: 'ARSAMDEMOSECRET234', otpauth: 'otpauth://totp/arsam.net?secret=ARSAMDEMOSECRET234&issuer=arsam.net' };

function renderWith(withState: boolean) {
  const client: QueryClient = makeSeededClient((qc) =>
    qc.setQueryData([...securityKeys.setup, 'setup-demo'], SETUP),
  );
  const router = createMemoryRouter(
    [
      { path: '/login/2fa/setup', element: <TwoFactorSetupPage /> },
      { path: '/login', element: <div>Giriş</div> },
      { path: '/', element: <div>Panel</div> },
    ],
    {
      initialEntries: [
        withState
          ? { pathname: '/login/2fa/setup', state: { setupToken: 'setup-demo', returnTo: '/' } }
          : { pathname: '/login/2fa/setup' },
      ],
    },
  );
  return (
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

export const Default: Story = { render: () => renderWith(true) };
/** Direct visit with no setup token → bounced to /login. */
export const NoToken: Story = { render: () => renderWith(false) };
export const Mobile: Story = {
  render: () => renderWith(true),
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
