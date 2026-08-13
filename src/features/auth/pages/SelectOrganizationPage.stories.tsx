import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

import {
  makeSeededClient,
  seedQueryError,
  seedQueryLoading,
} from '@/features/listings/pages/page-story-utils';
import { orgKeys } from '../api/hooks';
import { SelectOrganizationPage } from './SelectOrganizationPage';

const ORGS = {
  organizations: [
    { id: 'org-main', name: 'example.net' },
    { id: 'org-corp', name: 'Example Kurumsal' },
    { id: 'org-ege', name: 'Example Ege Bölge' },
  ],
  activeOrgId: 'org-main',
};

const meta = {
  title: 'Auth/SelectOrganizationPage',
  component: SelectOrganizationPage,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof SelectOrganizationPage>;

export default meta;
type Story = StoryObj<typeof meta>;

function renderWith(seed: (qc: QueryClient) => void) {
  const client = makeSeededClient(seed);
  const router = createMemoryRouter(
    [
      { path: '/select-organization', element: <SelectOrganizationPage /> },
      { path: '/', element: <div>Panel</div> },
    ],
    { initialEntries: ['/select-organization'] },
  );
  return (
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

export const Default: Story = { render: () => renderWith((qc) => qc.setQueryData(orgKeys.list, ORGS)) };
export const Loading: Story = { render: () => renderWith((qc) => seedQueryLoading(qc, orgKeys.list)) };
export const Error: Story = { render: () => renderWith((qc) => seedQueryError(qc, orgKeys.list)) };
export const Mobile: Story = {
  render: () => renderWith((qc) => qc.setQueryData(orgKeys.list, ORGS)),
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
