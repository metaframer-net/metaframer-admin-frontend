import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

import {
  makeSeededClient,
  seedQueryError,
  seedQueryLoading,
} from '@/features/listings/pages/page-story-utils';
import type { InviteDetails } from '../schemas/auth';
import { AcceptInvitePage } from './AcceptInvitePage';

const meta = {
  title: 'Auth/AcceptInvitePage',
  component: AcceptInvitePage,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof AcceptInvitePage>;

export default meta;
type Story = StoryObj<typeof meta>;

const INVITE: InviteDetails = { email: 'yeni.admin@arsam.net', name: 'Yeni Yönetici', role: 'moderator' };
const KEY = ['auth', 'invite', 'invite-demo'] as const;

function renderWith(seed: (qc: QueryClient) => void) {
  const client = makeSeededClient(seed);
  const router = createMemoryRouter(
    [
      { path: '/accept-invite', element: <AcceptInvitePage /> },
      { path: '/', element: <div>Panel</div> },
      { path: '/login', element: <div>Giriş</div> },
    ],
    { initialEntries: ['/accept-invite?token=invite-demo'] },
  );
  return (
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

export const Default: Story = { render: () => renderWith((qc) => qc.setQueryData(KEY, INVITE)) };
export const Loading: Story = { render: () => renderWith((qc) => seedQueryLoading(qc, KEY)) };
export const Invalid: Story = { render: () => renderWith((qc) => seedQueryError(qc, KEY)) };
export const Mobile: Story = {
  render: () => renderWith((qc) => qc.setQueryData(KEY, INVITE)),
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
