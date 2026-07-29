import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

import {
  makeSeededClient,
  seedQueryError,
  seedQueryLoading,
} from '@/features/listings/pages/page-story-utils';
import type { SecurityInfo } from '../schemas/auth';
import { securityKeys } from '../api/hooks';
import { AccountSecurityPage } from './AccountSecurityPage';

const meta = {
  title: 'Auth/AccountSecurityPage',
  component: AccountSecurityPage,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof AccountSecurityPage>;

export default meta;
type Story = StoryObj<typeof meta>;

const SESSIONS: SecurityInfo['sessions'] = [
  { id: 'current', device: 'Bu tarayıcı', location: 'İstanbul, TR', lastActive: 'Şu anda aktif', current: true },
  { id: 'sess-chrome-win', device: 'Chrome · Windows', location: 'Ankara, TR', lastActive: 'Bugün 09:12', current: false },
  { id: 'sess-ios-app', device: 'arsam iOS uygulaması', location: 'İzmir, TR', lastActive: '2 gün önce', current: false },
];

function renderWith(seed: (qc: QueryClient) => void) {
  const client = makeSeededClient(seed);
  const router = createMemoryRouter([{ path: '/account/security', element: <AccountSecurityPage /> }], {
    initialEntries: ['/account/security'],
  });
  return (
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

const info = (totpEnabled: boolean): SecurityInfo => ({ totpEnabled, sessions: SESSIONS });

export const Default: Story = { render: () => renderWith((qc) => qc.setQueryData(securityKeys.info, info(true))) };
export const TwoFactorOff: Story = { render: () => renderWith((qc) => qc.setQueryData(securityKeys.info, info(false))) };
export const Loading: Story = { render: () => renderWith((qc) => seedQueryLoading(qc, securityKeys.info)) };
export const Error: Story = { render: () => renderWith((qc) => seedQueryError(qc, securityKeys.info)) };
export const Mobile: Story = {
  render: () => renderWith((qc) => qc.setQueryData(securityKeys.info, info(true))),
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
