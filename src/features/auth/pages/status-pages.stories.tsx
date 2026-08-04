import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';

import { SessionExpiredPage } from './SessionExpiredPage';
import { AccountDisabledPage } from './AccountDisabledPage';
import { AuthErrorPage } from './AuthErrorPage';
import { UnauthorizedPage } from './UnauthorizedPage';

/** The public auth status/error surfaces (all share `AuthStatusPage`). */
const meta = {
  title: 'Auth/StatusPages',
  component: SessionExpiredPage,
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <MemoryRouter><Story /></MemoryRouter>],
} satisfies Meta<typeof SessionExpiredPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SessionExpired: Story = { render: () => <SessionExpiredPage /> };
export const AccountDisabled: Story = { render: () => <AccountDisabledPage /> };
export const Unauthorized: Story = { render: () => <UnauthorizedPage /> };
export const AuthError: Story = { render: () => <AuthErrorPage /> };
export const Mobile: Story = {
  render: () => <AccountDisabledPage />,
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
