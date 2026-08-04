import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { CrmCalendarPage } from './CrmCalendarPage';
import { crmKeys } from '../api/queries';
import { renderPage, seedQueryError, seedQueryLoading, MOCK_CONTACTS } from './page-story-utils';
import type { Activity } from '../schemas/activity';

const MOCK_ACTIVITIES: Activity[] = [
  { id: 'A-1', contactId: 'C-3000', type: 'call', subject: 'İlk tanışma', scheduledAt: new Date().toISOString(), completedAt: null, createdBy: 'admin-1', createdAt: new Date().toISOString() },
  { id: 'A-2', contactId: 'C-3001', type: 'meeting', subject: 'Ofis ziyareti', scheduledAt: new Date(Date.now() + 86400000).toISOString(), completedAt: null, createdBy: 'admin-1', createdAt: new Date().toISOString() },
  { id: 'A-3', contactId: 'C-3000', type: 'note', subject: 'VIP notu', scheduledAt: null, completedAt: new Date().toISOString(), createdBy: 'admin-1', createdAt: new Date().toISOString() },
];

const CONTACTS_QUERY = { page: 1, pageSize: 200, sort: [], filters: {}, q: '' };

const meta = {
  title: 'CRM/CrmCalendarPage',
  component: CrmCalendarPage,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof CrmCalendarPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () =>
    renderPage(<CrmCalendarPage />, {
      path: '/crm/calendar',
      initialPath: '/crm/calendar',
      seed: (qc) => {
        qc.setQueryData([...crmKeys.all, 'calendar-activities'], { items: MOCK_ACTIVITIES, total: MOCK_ACTIVITIES.length, page: 1, pageSize: 100 });
        qc.setQueryData(crmKeys.contacts.list(CONTACTS_QUERY), { items: MOCK_CONTACTS, total: MOCK_CONTACTS.length, page: 1, pageSize: 200 });
      },
    }),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('CRM Takvim')).toBeInTheDocument();
    await expect(canvas.getByText('Tarih Seçin')).toBeInTheDocument();
  },
};

export const Loading: Story = {
  render: () =>
    renderPage(<CrmCalendarPage />, {
      path: '/crm/calendar',
      initialPath: '/crm/calendar',
      seed: (qc) => {
        seedQueryLoading(qc, [...crmKeys.all, 'calendar-activities']);
        seedQueryLoading(qc, crmKeys.contacts.list(CONTACTS_QUERY));
      },
    }),
};

export const Empty: Story = {
  render: () =>
    renderPage(<CrmCalendarPage />, {
      path: '/crm/calendar',
      initialPath: '/crm/calendar',
      seed: (qc) => {
        qc.setQueryData([...crmKeys.all, 'calendar-activities'], { items: [], total: 0, page: 1, pageSize: 100 });
        qc.setQueryData(crmKeys.contacts.list(CONTACTS_QUERY), { items: [], total: 0, page: 1, pageSize: 200 });
      },
    }),
};

export const Error: Story = {
  render: () =>
    renderPage(<CrmCalendarPage />, {
      path: '/crm/calendar',
      initialPath: '/crm/calendar',
      seed: (qc) => {
        seedQueryError(qc, [...crmKeys.all, 'calendar-activities']);
        qc.setQueryData(crmKeys.contacts.list(CONTACTS_QUERY), { items: [], total: 0, page: 1, pageSize: 200 });
      },
    }),
};

export const Mobile: Story = {
  ...Default,
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
