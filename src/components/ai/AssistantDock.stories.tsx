import type { ReactElement } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { expect, screen, userEvent } from 'storybook/test';

import { listingKeys } from '@/features/listings/api/queries';
import type { Listing } from '@/features/listings';
import { resetAssistant, setAssistantOpen } from '@/lib/ai';
import { AssistantDock } from './AssistantDock';
import { AI_QUEUE_QUERY } from './assistant-context';

const QUEUE: Listing[] = [
  {
    id: 'L-1000', title: 'Kadıköy 3+1 daire', description: '—', category: 'konut', status: 'pending',
    price: 4_250_000, il: '34', ilce: 'kadikoy', mahalle: 'Moda',
    attributes: { grossArea: 120 }, agentName: 'Ofis 1', aiSuggestion: 'ok', aiReasons: ['Kurallara uygun'],
    createdAt: '2026-06-02T00:00:00.000Z',
  },
];

/**
 * The standalone floating launcher was retired: the dock's AI orb logo now opens
 * the command center, and the assistant Sheet is opened imperatively (⌘K / the
 * command palette in the app). Stories drive it via a plain trigger button so the
 * Sheet's data states stay coverable.
 */
const Dock = () => (
  <>
    <button type="button" onClick={() => setAssistantOpen(true)}>
      Asistanı aç
    </button>
    <AssistantDock />
  </>
);

function renderDock(): ReactElement {
  const qc = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false, refetchOnMount: false, retryOnMount: false } },
  });
  qc.setQueryData(listingKeys.list(AI_QUEUE_QUERY), { items: QUEUE, total: 1, page: 1, pageSize: 50 });
  const router = createMemoryRouter(
    [
      {
        path: '/listings',
        element: <Dock />,
        handle: { routeMeta: { title: 'İlanlar', permission: 'listing.view', aiEntity: 'listing' } },
      },
      { path: '*', element: <div /> },
    ],
    { initialEntries: ['/listings'] },
  );
  return (
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

const meta = {
  title: 'AI/AssistantDock',
  render: renderDock,
  beforeEach: () => {
    resetAssistant();
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    // The Sheet is closed at rest; the trigger opens it.
    await expect(canvas.getByRole('button', { name: 'Asistanı aç' })).toBeInTheDocument();
  },
};

export const Open: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Asistanı aç' }));
    // Sheet content is portaled to document.body.
    await expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await expect(screen.getByText('AI Asistanı')).toBeInTheDocument();
    await expect(screen.getByLabelText('Komut')).toBeInTheDocument();
  },
};

export const Loading: Story = {
  render: () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity, retry: false, refetchOnMount: false, retryOnMount: false } },
    });
    const router = createMemoryRouter(
      [
        {
          path: '/listings',
          element: <Dock />,
          handle: { routeMeta: { title: 'İlanlar', permission: 'listing.view', aiEntity: 'listing' } },
        },
      ],
      { initialEntries: ['/listings'] },
    );
    return (
      <QueryClientProvider client={qc}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    );
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Asistanı aç' }));
    await expect(await screen.findByText('Moderasyon kopilotu')).toBeInTheDocument();
  },
};

export const Empty: Story = {
  render: () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity, retry: false, refetchOnMount: false, retryOnMount: false } },
    });
    qc.setQueryData(listingKeys.list(AI_QUEUE_QUERY), { items: [], total: 0, page: 1, pageSize: 50 });
    const router = createMemoryRouter(
      [
        {
          path: '/listings',
          element: <Dock />,
          handle: { routeMeta: { title: 'İlanlar', permission: 'listing.view', aiEntity: 'listing' } },
        },
      ],
      { initialEntries: ['/listings'] },
    );
    return (
      <QueryClientProvider client={qc}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    );
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Asistanı aç' }));
    await expect(await screen.findByText('Onay bekleyen AI-OK ilan yok.')).toBeInTheDocument();
  },
};

export const Error: Story = {
  render: () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity, retry: false, refetchOnMount: false, retryOnMount: false } },
    });
    const query = qc.getQueryCache().build(qc, { queryKey: [...listingKeys.list(AI_QUEUE_QUERY)] });
    query.setState({ status: 'error', error: new globalThis.Error('İstek başarısız'), fetchStatus: 'idle', data: undefined });
    const router = createMemoryRouter(
      [
        {
          path: '/listings',
          element: <Dock />,
          handle: { routeMeta: { title: 'İlanlar', permission: 'listing.view', aiEntity: 'listing' } },
        },
      ],
      { initialEntries: ['/listings'] },
    );
    return (
      <QueryClientProvider client={qc}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    );
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Asistanı aç' }));
    await expect(await screen.findByText('Kuyruk alınamadı')).toBeInTheDocument();
  },
};

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Asistanı aç' }));
    await expect(await screen.findByRole('dialog')).toBeInTheDocument();
  },
};
