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

/**
 * Desktop (xl+) — the resting pill is brand-led (`arsam.net`) with the notification
 * bell. The status line and the user menu are decluttered into the hover/focus
 * reveal, but stay in the DOM (and keyboard-reachable), so they resolve here.
 */
export const Default: Story = {
  parameters: { viewport: { defaultViewport: 'bpXl' } },
  play: async () => {
    const body = within(document.body);
    // Launcher's accessible name carries the active page (route `/` → Genel Bakış).
    const pill = body.getByRole('button', { name: /Genel Bakış.*menü ve komut/i });
    await expect(pill).toBeInTheDocument();
    // The resting pill leads with the brand wordmark.
    await expect(pill).toHaveTextContent('arsam.net');
    // Notification bell present with the default flag on.
    await expect(body.getByRole('button', { name: /Bildirimler/ })).toBeInTheDocument();
    // User menu present (in the reveal, still in the DOM).
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
    // Sticky sliding highlight: hovering a dot marks it (data-highlighted) and
    // activates the strip's shared ink (data-active); moving to another dot moves
    // the highlight there while the ink stays active — the continuous glide.
    const listings = body.getByRole('button', { name: /^İlanlar$/ });
    const strip = overview.closest('[data-dock-strip]');
    await userEvent.hover(overview);
    await expect(overview).toHaveAttribute('data-highlighted', 'true');
    await expect(strip).toHaveAttribute('data-active', 'true');
    await userEvent.hover(listings);
    await expect(listings).toHaveAttribute('data-highlighted', 'true');
    await expect(overview).toHaveAttribute('data-highlighted', 'false');
    await expect(strip).toHaveAttribute('data-active', 'true');
    // Distance-aware glide: the component writes a per-move `--dock-glide` duration
    // scaled to how far the ink travels, so a long sweep is paced slower than an
    // adjacent hop (constant-ish speed). Read it live in the real browser.
    // The overflow chip is also a `.dock-dot` now — keep only the module dots here.
    const allDots = strip ? [...strip.querySelectorAll('.dock-dot')] : [];
    const moduleDots = allDots.filter((d) => !/modül daha/.test(d.getAttribute('aria-label') ?? ''));
    const farDot = moduleDots[moduleDots.length - 1] as Element; // last module — a long sweep
    const nearDot = moduleDots[moduleDots.length - 2] as Element; // its neighbour — a short hop
    const glide = () => parseFloat((strip as HTMLElement).style.getPropertyValue('--dock-glide')) || 0;

    await userEvent.hover(overview); // ink at x:0
    await userEvent.hover(farDot); // long sweep across the strip
    const farDur = glide();
    await userEvent.hover(nearDot); // short hop to the neighbour
    const nearDur = glide();

    await expect(nearDur).toBeGreaterThanOrEqual(210); // clamp floor
    await expect(farDur).toBeLessThanOrEqual(380); // clamp ceiling
    await expect(farDur).toBeGreaterThan(nearDur); // farther ⇒ longer

    // Snap-regression guard: the width transition lives on the element that actually
    // resizes (the clip), so it is a real, non-zero transition — not an instant jump
    // with only the ink gliding.
    const clipDur = parseFloat(getComputedStyle(farDot.querySelector('.dock-dot-clip') as Element).transitionDuration);
    await expect(clipDur).toBeGreaterThan(0.19);
    await expect(clipDur).toBeLessThanOrEqual(0.38);

    // Asymmetric label: the highlighted (entering) label settles slower than a
    // resting one leaves. nearDot is highlighted now; overview is at rest.
    const lblDur = (el: Element) =>
      getComputedStyle(el.querySelector('.dock-dot-label') as Element).transitionDuration;
    await expect(lblDur(nearDot)).toContain('0.26s'); // enter → --duration-slow
    await expect(lblDur(overview)).toContain('0.18s'); // rest/exit → --duration-base

    // Overflow chip is a full participant in the sliding highlight: crossing from
    // the last module onto it must NOT collapse the ink (the old "close then open"
    // bug) — it slides the highlight onto the chip and the strip stays active.
    const overflow = body.getByRole('button', { name: /modül daha/ });
    await userEvent.hover(farDot);
    await expect(strip).toHaveAttribute('data-active', 'true');
    await userEvent.hover(overflow);
    await expect(strip).toHaveAttribute('data-active', 'true'); // no collapse
    await expect(overflow).toHaveAttribute('data-highlighted', 'true');
    await expect(farDot).toHaveAttribute('data-highlighted', 'false');

    // Hover hysteresis: leaving the strip does NOT collapse the ink immediately — a
    // brief exit (a long label's reflow nudging a dot out from under the pointer)
    // has a grace window to return before the strip closes. So right after leaving
    // it is still active, and only later does it collapse.
    await userEvent.unhover(overflow);
    await expect(strip).toHaveAttribute('data-active', 'true'); // grace: still open
    await waitFor(() => expect(strip).toHaveAttribute('data-active', 'false')); // then collapses
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
 * The ENTIRE pill surface is one open/close toggle: a click opens the panel and a
 * click again closes it. The two exceptions own their own clicks and never toggle
 * the panel — the notification bell (opens notifications) and the profile menu.
 */
export const ClickToggle: Story = {
  parameters: { viewport: { defaultViewport: 'bpXl' } },
  play: async () => {
    const body = within(document.body);
    const pill = body.getByRole('button', { name: LAUNCHER });
    // Click opens…
    await userEvent.click(pill);
    await waitFor(() => expect(pill).toHaveAttribute('aria-expanded', 'true'));
    // …and clicking again closes (toggle).
    await userEvent.click(pill);
    await waitFor(() => expect(pill).toHaveAttribute('aria-expanded', 'false'));
    // The bell is excluded — clicking it opens notifications, never the panel.
    await userEvent.click(body.getByRole('button', { name: /Bildirimler/ }));
    await expect(pill).toHaveAttribute('aria-expanded', 'false');
  },
};

/**
 * The launcher's ACCESSIBLE NAME always states where you are in words — "Şu an:
 * <yol>, saat <saat>" — so assistive tech gets the full reading at rest, even
 * though the status trail + clock are visually decluttered out of the collapsed
 * (brand-led) pill and spring back on hover or keyboard focus-within. A steady
 * green dot marks it live — no pulse. `now` freezes the clock.
 */
export const StatusLine: Story = {
  args: { now: new Date('2026-07-24T13:24:00') },
  parameters: { viewport: { defaultViewport: 'bpXl' } },
  play: async () => {
    const body = within(document.body);
    const pill = body.getByRole('button', { name: LAUNCHER });
    // At rest the accessible name carries the full reading as one sentence.
    await expect(pill).toHaveAccessibleName(/Şu an: Genel Bakış, saat 13:24/);
    // Hover reveals the visible status trail + clock.
    await userEvent.hover(pill);
    await expect(pill).toHaveTextContent('Şu an:');
    await expect(pill).toHaveTextContent('Genel Bakış');
    await expect(pill).toHaveTextContent('13:24');
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
