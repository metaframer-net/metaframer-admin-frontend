import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { CrmCalendarPage } from './CrmCalendarPage';
import { crmKeys } from '../api/queries';
import { renderPage, seedQueryError, seedQueryLoading, MOCK_CONTACTS } from './page-story-utils';
import type { Activity } from '../schemas/activity';

const MOCK_ACTIVITIES: Activity[] = [
  { id: 'A-1', contactId: 'C-3000', type: 'call', subject: 'İlk tanışma', scheduledAt: new Date().toISOString(), completedAt: null, createdBy: 'admin-1', createdAt: new Date().toISOString() },
  { id: 'A-2', contactId: 'C-3001', type: 'meeting', subject: 'Ofis ziyareti', scheduledAt: new Date(Date.now() + 86400000).toISOString(), completedAt: null, createdBy: 'admin-1', createdAt: new Date().toISOString() },
];

const CONTACTS_QUERY = { page: 1, pageSize: 200, sort: [], filters: {}, q: '' };
const ACTIVITIES_KEY = [...crmKeys.all, 'calendar-activities'];

function render() {
  return renderPage(<CrmCalendarPage />, {
    path: '/crm/calendar',
    initialPath: '/crm/calendar',
    extraRoutes: [{ path: '*', element: <div /> }],
    seed: (qc) => {
      qc.setQueryData(ACTIVITIES_KEY, { items: MOCK_ACTIVITIES, total: MOCK_ACTIVITIES.length, page: 1, pageSize: 100 });
      qc.setQueryData(crmKeys.contacts.list(CONTACTS_QUERY), { items: MOCK_CONTACTS, total: MOCK_CONTACTS.length, page: 1, pageSize: 200 });
    },
  });
}

const meta = {
  title: 'CRM/CrmCalendarPage',
  parameters: { layout: 'fullscreen' },
  render,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: 'CRM Takvim' })).toBeInTheDocument();
    await expect(canvas.getByText('Tarih Seçin')).toBeInTheDocument();
  },
};

export const Loading: Story = {
  render: () =>
    renderPage(<CrmCalendarPage />, {
      path: '/crm/calendar',
      initialPath: '/crm/calendar',
      extraRoutes: [{ path: '*', element: <div /> }],
      seed: (qc) => {
        seedQueryLoading(qc, ACTIVITIES_KEY);
        seedQueryLoading(qc, crmKeys.contacts.list(CONTACTS_QUERY));
      },
    }),
};

export const Empty: Story = {
  render: () =>
    renderPage(<CrmCalendarPage />, {
      path: '/crm/calendar',
      initialPath: '/crm/calendar',
      extraRoutes: [{ path: '*', element: <div /> }],
      seed: (qc) => {
        qc.setQueryData(ACTIVITIES_KEY, { items: [], total: 0, page: 1, pageSize: 100 });
        qc.setQueryData(crmKeys.contacts.list(CONTACTS_QUERY), { items: [], total: 0, page: 1, pageSize: 200 });
      },
    }),
};

export const Error: Story = {
  render: () =>
    renderPage(<CrmCalendarPage />, {
      path: '/crm/calendar',
      initialPath: '/crm/calendar',
      extraRoutes: [{ path: '*', element: <div /> }],
      seed: (qc) => {
        seedQueryError(qc, ACTIVITIES_KEY);
        qc.setQueryData(crmKeys.contacts.list(CONTACTS_QUERY), { items: [], total: 0, page: 1, pageSize: 200 });
      },
    }),
};

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
