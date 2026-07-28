import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Decorator } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import type { NotificationsPayload } from '@/features/notifications';
import { DEFAULT_FLAGS } from '@/lib/settings/feature-flags';
import { setFeatureFlags, resetFeatureFlags } from '@/lib/settings/feature-flags-store';
import { CommandDock } from './CommandDock';
import { CommandPaletteProvider } from './command-palette-context';
import { shellRouterDecorator } from './story-helpers';

// The launcher's accessible name is prefixed with the active page label, so
// queries match it by substring rather than the whole string.
const LAUNCHER = /menü ve komut aramayı aç/i;

const PAYLOAD: NotificationsPayload = {
  unread: 2,
  items: [
    { id: 'moderation-queue', kind: 'moderation', title: '2 ilan moderasyon bekliyor', to: '/listings/moderation', ts: '2026-07-24T00:00:00.000Z' },
    { id: 'a1', kind: 'audit', title: 'İlan onaylandı', description: 'listing:L-1001', to: '/listings/L-1001', ts: '2026-07-24T00:00:00.000Z' },
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
      </CommandPaletteProvider>
    </QueryClientProvider>
  );
};

const meta = {
  title: 'Shell/CommandDock',
  component: CommandDock,
  parameters: { layout: 'fullscreen' },
  decorators: [seeded, shellRouterDecorator({ title: 'Genel Bakış', aiEntity: 'dashboard' })],
} satisfies Meta<typeof CommandDock>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Desktop (xl+) — the decluttered pill leads with the active page, controls on the right. */
export const Default: Story = {
  parameters: { viewport: { defaultViewport: 'bpXl' } },
  play: async () => {
    const body = within(document.body);
    // Launcher's accessible name carries the active page (route `/` → Genel Bakış).
    await expect(body.getByRole('button', { name: /Genel Bakış.*menü ve komut/i })).toBeInTheDocument();
    // Notification bell present with the default flag on.
    await expect(body.getByRole('button', { name: /Bildirimler/ })).toBeInTheDocument();
    // User menu present on the right.
    await expect(body.getByRole('button', { name: 'Kullanıcı menüsü' })).toBeInTheDocument();
  },
};

/**
 * Hover-reveal inline nav: the pill hides a strip of module dots that spring out
 * on hover (and on keyboard focus-within). The dots are BUTTONS that open the
 * command center (they don't navigate — the strip is a preview); on hover each
 * dot expands rightward to reveal its module name. They're always in the DOM
 * (width/opacity-collapsed, not unmounted) so they stay keyboard- + AT-reachable.
 */
export const InlineNav: Story = {
  parameters: { viewport: { defaultViewport: 'bpXl' } },
  play: async () => {
    const body = within(document.body);
    // Dots are buttons named by their module (route `/` → Genel Bakış is current).
    const overview = body.getByRole('button', { name: 'Genel Bakış' });
    await expect(overview).toBeInTheDocument();
    await expect(overview).toHaveAttribute('aria-current', 'page');
    // Overflow chip: default super-admin sees all modules (>6).
    await expect(body.getByRole('button', { name: /modül daha/ })).toBeInTheDocument();
    // Keyboard path: Tab reaches the launcher, then tabs INTO the (always-in-DOM) strip.
    await userEvent.tab();
    await expect(body.getByRole('button', { name: LAUNCHER })).toHaveFocus();
    await userEvent.tab();
    await expect(overview).toHaveFocus();
    // Hovering the launcher reveals the strip (pointer-events flip to auto).
    await userEvent.hover(body.getByRole('button', { name: LAUNCHER }));
    await expect(body.getByRole('navigation', { name: 'Hızlı gezinme' })).toBeInTheDocument();
    // Clicking a dot opens the command center inside the pill (it does not navigate).
    await userEvent.click(overview);
    await expect(
      body.getByRole('dialog', { name: 'Nereye gitmek istersin?' }),
    ).toBeInTheDocument();
  },
};

/**
 * Stage 3 — the panel unfolds INSIDE the pill: the pill row stays put, the
 * surface rounds and grows downward. It is a modal dialog, so focus moves to the
 * close control and is trapped, the page behind is scroll-locked, and Escape
 * hands focus back to the pill.
 */
export const PanelOpen: Story = {
  parameters: { viewport: { defaultViewport: 'bpXl' } },
  play: async () => {
    const body = within(document.body);
    const pill = body.getByRole('button', { name: LAUNCHER });
    await userEvent.click(pill);

    const dialog = await body.findByRole('dialog', { name: 'Nereye gitmek istersin?' });
    // The pill row is NOT replaced — the panel lives in the same surface.
    await expect(pill).toBeVisible();
    await expect(pill).toHaveAttribute('aria-expanded', 'true');
    // Modal contract: initial focus + scroll lock.
    await expect(body.getByRole('button', { name: 'Kapat' })).toHaveFocus();
    await expect(document.body).toHaveStyle({ overflow: 'hidden' });
    // The panel carries the card grid.
    await expect(within(dialog).getByRole('button', { name: /^İlanlar$/ })).toBeInTheDocument();

    // Escape dismisses and returns focus to the pill; the scroll lock is released.
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(pill).toHaveAttribute('aria-expanded', 'false'));
    await expect(pill).toHaveFocus();
    await expect(document.body).not.toHaveStyle({ overflow: 'hidden' });
  },
};

/**
 * The launcher states where you are in words — "Şu an: <yol> · <saat>" — with a
 * steady green dot marking it live. No pulse: a loop that never resolves keeps
 * asking for attention the reading does not need. `now` freezes the clock.
 */
export const StatusLine: Story = {
  args: { now: new Date('2026-07-24T13:24:00') },
  parameters: { viewport: { defaultViewport: 'bpXl' } },
  play: async () => {
    const body = within(document.body);
    const pill = body.getByRole('button', { name: LAUNCHER });
    // Visible: the trail and the clock, both readable without hovering anything.
    await expect(pill).toHaveTextContent('Şu an:');
    await expect(pill).toHaveTextContent('Genel Bakış');
    await expect(pill).toHaveTextContent('13:24');
    // The accessible name carries the same reading as one sentence.
    await expect(pill).toHaveAccessibleName(/Şu an: Genel Bakış, saat 13:24/);
  },
};

/**
 * Mobile (below xl): the floating dock is `hidden xl:flex`, so it drops out of the
 * layout entirely — the DockShell renders its own compact command pill + bottom nav
 * there instead. Asserts the launcher is absent (display:none → off the a11y tree).
 */
export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'bpSm' } },
  play: async () => {
    await expect(within(document.body).queryByRole('button', { name: LAUNCHER })).toBeNull();
  },
};

/** With `notificationCenter` OFF the bell is not rendered in the dock. */
export const NotificationsOff: Story = {
  parameters: { viewport: { defaultViewport: 'bpXl' } },
  beforeEach: () => {
    setFeatureFlags({ ...DEFAULT_FLAGS, notificationCenter: false });
    return () => resetFeatureFlags();
  },
  play: async () => {
    const body = within(document.body);
    await expect(body.getByRole('button', { name: LAUNCHER })).toBeInTheDocument();
    await expect(body.queryByRole('button', { name: /Bildirimler/ })).toBeNull();
  },
};
