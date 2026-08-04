import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClientProvider } from '@tanstack/react-query';
import { expect, userEvent, within } from 'storybook/test';

import { AuthProvider, type SessionUser } from '@/lib/auth/auth-context';
import { makeSeededClient } from '@/features/listings/pages/page-story-utils';
import { orgKeys } from '../api/hooks';
import { OrgSwitcher } from './OrgSwitcher';

const USER: SessionUser = { id: 'u-1', name: 'Ahmet Yönetici', email: 'super@arsam.net', role: 'super-admin' };
const ORGS = {
  organizations: [
    { id: 'org-main', name: 'arsam.net' },
    { id: 'org-corp', name: 'arsam Kurumsal' },
    { id: 'org-ege', name: 'arsam Ege Bölge' },
  ],
  activeOrgId: 'org-main',
};

const meta = {
  title: 'Auth/OrgSwitcher',
  component: OrgSwitcher,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof OrgSwitcher>;

export default meta;
type Story = StoryObj<typeof meta>;

function renderWith(data: typeof ORGS) {
  const client = makeSeededClient((qc) => qc.setQueryData(orgKeys.list, data));
  return (
    <AuthProvider initialState={{ status: 'authenticated', user: USER }}>
      <QueryClientProvider client={client}>
        <OrgSwitcher />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export const Default: Story = { render: () => renderWith(ORGS) };
/** A single-org user gets no switcher (renders nothing). */
export const SingleOrg: Story = {
  render: () => renderWith({ organizations: [ORGS.organizations[0]!], activeOrgId: 'org-main' }),
};

export const Interaction: Story = {
  render: () => renderWith(ORGS),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: /Organizasyon/ }));
    const menu = await within(document.body).findByRole('menu');
    await expect(within(menu).getByText('arsam Ege Bölge')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
  },
};
