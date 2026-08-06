import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Decorator } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import type { NotificationsPayload } from '@/features/notifications';
import { DEFAULT_FLAGS } from '@/lib/settings/feature-flags';
import { setFeatureFlags, resetFeatureFlags } from '@/lib/settings/feature-flags-store';
import { DockShell } from './DockShell';
import { CommandPaletteProvider } from './command-palette-context';
import { shellRouterDecorator } from './story-helpers';

const FIXED_NOW = new Date('2026-07-25T09:07:00');

const PAYLOAD: NotificationsPayload = {
  unread: 2,
  items: [
    { id: 'moderation-queue', kind: 'moderation', title: '2 ilan moderasyon bekliyor', to: '/listings/moderation', ts: '2026-07-24T00:00:00.000Z' },
  ],
};

const seeded: Decorator = (Story) => {
  const qc = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false, refetchOnMount: false } },
  });
  qc.setQueryData(['notifications'], PAYLOAD);
  return (
    <QueryClientProvider client={qc}>
      <CommandPaletteProvider>
        <Story />
        {/* NOTE: dock mode has NO mobile bottom nav — AppShell renders MobileBottomNav
            only for sidebar/topnav modes. On mobile the DockShell carries navigation via
            its floating command pill + the edge nav docks, so none is mounted here. */}
      </CommandPaletteProvider>
    </QueryClientProvider>
  );
};

const SampleContent = (
  <div className="mx-auto max-w-3xl">
    <h1 className="text-2xl font-semibold">Genel Bakış</h1>
    <p className="text-muted-foreground mt-1">Dock modu — kalıcı kenar çubuğu/üst menü yok.</p>
  </div>
);

const meta = {
  title: 'Shell/DockShell',
  component: DockShell,
  parameters: { layout: 'fullscreen' },
  args: { now: FIXED_NOW, children: SampleContent },
  decorators: [seeded, shellRouterDecorator({ title: 'Genel Bakış', aiEntity: 'dashboard' })],
} satisfies Meta<typeof DockShell>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Desktop (xl+) — the full dock chrome together: top-center command dock + all three
 * edge nav docks (edgeDock flag ON by default). This is the combined preview for the
 * four-glass composition (top logo + 3 edge handles).
 */
export const Desktop: Story = {
  parameters: { viewport: { defaultViewport: 'bpXl' } },
  play: async () => {
    // The floating command dock renders (its launcher carries the active page).
    await expect(
      within(document.body).getByRole('button', { name: /menü ve komut aramayı aç/i }),
    ).toBeInTheDocument();
    // All three edge docks render (bottom / left / right).
    await expect(document.body.querySelectorAll('[data-slot="edge-dock"]')).toHaveLength(3);
  },
};

/** Tablet portrait (768) — below xl, the floating command pill carries nav (no bottom bar in dock mode). */
export const Tablet: Story = {
  parameters: { viewport: { defaultViewport: 'bpLg' } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: /menü ve komut aramayı aç/i })).toBeInTheDocument();
    await expect(canvas.queryByRole('navigation', { name: 'Alt gezinme' })).toBeNull();
  },
};

/** Phone (480) — the floating rounded command pill + edge nav docks (NO bottom bar in dock mode). */
export const Phone: Story = {
  parameters: { viewport: { defaultViewport: 'bpSm' } },
  play: async ({ canvas }) => {
    // The floating pill's launcher is reachable; the bottom nav is intentionally absent.
    await expect(canvas.getByRole('button', { name: /menü ve komut aramayı aç/i })).toBeInTheDocument();
    await expect(canvas.queryByRole('navigation', { name: 'Alt gezinme' })).toBeNull();
    // Edge nav docks carry navigation on mobile too.
    await expect(document.body.querySelectorAll('[data-slot="edge-dock"]').length).toBeGreaterThan(0);
  },
};

/** Small phone (320). */
export const SmallPhone: Story = { parameters: { viewport: { defaultViewport: 'bpXs' } } };

/** Each edge is independently flag-gated: with all three OFF, no edge dock renders. */
export const EdgeDocksOff: Story = {
  parameters: { viewport: { defaultViewport: 'bpXl' } },
  beforeEach: () => {
    setFeatureFlags({ ...DEFAULT_FLAGS, edgeDockBottom: false, edgeDockLeft: false, edgeDockRight: false });
    return () => resetFeatureFlags();
  },
  play: async () => {
    // Top command dock still renders; the edge docks do not.
    await expect(
      within(document.body).getByRole('button', { name: /menü ve komut aramayı aç/i }),
    ).toBeInTheDocument();
    await expect(document.body.querySelectorAll('[data-slot="edge-dock"]')).toHaveLength(0);
  },
};

/** Per-edge: only the left edge enabled → exactly one edge dock renders. */
export const OnlyLeftEdge: Story = {
  parameters: { viewport: { defaultViewport: 'bpXl' } },
  beforeEach: () => {
    setFeatureFlags({ ...DEFAULT_FLAGS, edgeDockBottom: false, edgeDockLeft: true, edgeDockRight: false });
    return () => resetFeatureFlags();
  },
  play: async () => {
    const docks = document.body.querySelectorAll('[data-slot="edge-dock"]');
    await expect(docks).toHaveLength(1);
    await expect(docks[0]).toHaveAttribute('data-edge', 'left');
  },
};
