import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { DEFAULT_FLAGS } from '@/lib/settings/feature-flags';
import { setFeatureFlags, resetFeatureFlags } from '@/lib/settings/feature-flags-store';
import { AppShell } from './AppShell';
import { shellRouterDecorator } from './story-helpers';

const SampleContent = (
  <div className="mx-auto max-w-3xl">
    <h1 className="text-2xl font-semibold">Genel Bakış</h1>
    <p className="text-muted-foreground mt-1">
      Kenar çubuğu ve üst menü modları tek nav şemasından beslenir.
    </p>
  </div>
);

const meta = {
  title: 'Shell/AppShell',
  component: AppShell,
  parameters: { layout: 'fullscreen' },
  decorators: [shellRouterDecorator()],
  args: { children: SampleContent },
} satisfies Meta<typeof AppShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Sidebar: Story = {
  globals: { layout: 'sidebar' },
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId('sidebar')).toBeInTheDocument();
    await expect(canvas.getByRole('navigation', { name: 'Ana gezinme' })).toBeInTheDocument();
  },
};

export const Topnav: Story = {
  globals: { layout: 'topnav' },
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId('topnav')).toBeInTheDocument();
  },
};

export const Mobile: Story = {
  globals: { layout: 'sidebar' },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvas }) => {
    // Convergence: below xl the shell shows the mobile bottom bar — now a LiquidDock
    // (role="tablist", "Ana gezinme"), replacing the old <nav aria-label="Alt gezinme">.
    await expect(canvas.getByRole('tablist', { name: 'Ana gezinme' })).toBeInTheDocument();
  },
};

/**
 * `dock` mode (behind the `dockLayout` flag, on by default): no persistent
 * sidebar/topnav — a floating rich-glass command dock with a context pill.
 */
export const Dock: Story = {
  globals: { layout: 'dock' },
  play: async ({ canvas }) => {
    // No persistent sidebar/topnav chrome in dock mode.
    await expect(canvas.queryByTestId('sidebar')).toBeNull();
    await expect(canvas.queryByTestId('topnav')).toBeNull();
    // The floating command dock is present.
    await expect(document.body.querySelector('[data-entity="dock"]')).not.toBeNull();
  },
};

/**
 * Dock mode on a phone: unlike sidebar/topnav (which converge to the bottom nav),
 * dock mode has NO bottom bar — navigation is carried by the floating command pill,
 * the edge nav docks and ⌘K. Guards the AppShell `effectiveMode !== 'dock'` gate.
 */
export const DockMobile: Story = {
  globals: { layout: 'dock' },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvas }) => {
    // The mobile bottom nav is intentionally absent in dock mode.
    await expect(canvas.queryByRole('navigation', { name: 'Alt gezinme' })).toBeNull();
    // The floating command pill's launcher carries navigation instead.
    await expect(canvas.getByRole('button', { name: /menü ve komut aramayı aç/i })).toBeInTheDocument();
    // Edge nav docks are DESKTOP-only now (hidden below xl), so their hint tabs are
    // not reachable on mobile — the command pill is the sole navigation surface.
    await expect(canvas.queryByRole('button', { name: /Gezinme dock.*aç/ })).toBeNull();
  },
};

/**
 * Feature-flag safety: with `dockLayout` OFF, a persisted `dock` mode falls back
 * to `sidebar` — existing modes are never affected by the flag being off.
 */
export const DockFlagOff: Story = {
  globals: { layout: 'dock' },
  beforeEach: () => {
    setFeatureFlags({ ...DEFAULT_FLAGS, dockLayout: false });
    return () => resetFeatureFlags();
  },
  play: async ({ canvas }) => {
    // Fell back to sidebar: the sidebar chrome is present, no dock pill.
    await expect(canvas.getByTestId('sidebar')).toBeInTheDocument();
    await expect(document.body.querySelector('[data-entity="dock"]')).toBeNull();
  },
};

/**
 * Tablet portrait (768px). Under the 8-token scale (task 019) the shell converges
 * to drawer + bottom nav BELOW `xl` (1024) — so at 768 the bottom nav is the
 * active navigation and the persistent sidebar is still CSS-hidden (`display:none`,
 * out of the a11y tree). The viewport IS applied in the test runner, so `getByRole`
 * (which excludes `display:none`) proves convergence at the real 768px width.
 */
export const Tablet: Story = {
  globals: { layout: 'sidebar' },
  parameters: { viewport: { defaultViewport: 'bpLg' } },
  play: async ({ canvas }) => {
    // Bottom bar (now a LiquidDock "Ana gezinme" tablist) is visible at 768
    // (convergence still active below xl).
    const bottomNav = canvas.getByRole('tablist', { name: 'Ana gezinme' });
    await expect(bottomNav).toBeInTheDocument();
    // Its fixed wrapper carries `xl:hidden`, so it drops out at xl (see Desktop).
    await expect(bottomNav.closest('.xl\\:hidden')).not.toBeNull();
    // The sidebar exists in the DOM but its reveal is gated at `xl:flex` (1024), NOT `lg` (768).
    await expect(canvas.getByTestId('sidebar').className).toContain('xl:flex');
  },
};

/**
 * Desktop (1024px) — the `xl` threshold where the persistent sidebar takes over.
 * Verifies Strategy A: convergence was remapped from `lg` (now 768) to `xl` (1024),
 * so at 1024 the bottom nav is `display:none` (absent from the a11y tree) while the
 * sidebar is revealed. That the bottom nav drops out here — but is present at 768
 * above — proves the switch point stayed at 1024, not 768.
 */
export const Desktop: Story = {
  globals: { layout: 'sidebar' },
  parameters: { viewport: { defaultViewport: 'bpXl' } },
  play: async ({ canvas }) => {
    // At 1024 the bottom bar (LiquidDock "Ana gezinme" tablist) is hidden via its
    // `xl:hidden` wrapper → not in the accessibility tree.
    await expect(canvas.queryByRole('tablist', { name: 'Ana gezinme' })).toBeNull();
    // The sidebar reveal class is `xl:flex` (visible at 1024).
    await expect(canvas.getByTestId('sidebar').className).toContain('xl:flex');
  },
};

export const Loading: Story = {
  args: {
    children: (
      <div className="mx-auto max-w-3xl space-y-3">
        <div className="bg-muted h-6 w-40 animate-pulse rounded" />
        <div className="bg-muted h-24 w-full animate-pulse rounded" />
      </div>
    ),
  },
};

export const Empty: Story = {
  args: {
    children: (
      <div className="text-muted-foreground grid min-h-40 place-items-center text-sm">
        Görüntülenecek içerik yok.
      </div>
    ),
  },
};

export const Error: Story = {
  args: {
    children: (
      <div className="text-destructive grid min-h-40 place-items-center text-sm">
        İçerik yüklenemedi.
      </div>
    ),
  },
};

export const CommandPaletteOpen: Story = {
  globals: { layout: 'sidebar' },
  play: async ({ canvasElement }) => {
    await userEvent.keyboard('{Meta>}k{/Meta}');
    const dialog = await within(document.body).findByRole('dialog');
    await expect(dialog).toBeInTheDocument();
    await expect(within(dialog).getByPlaceholderText(/Modül ara/i)).toBeInTheDocument();
    // Close to keep the DOM clean for a11y checks.
    await userEvent.keyboard('{Escape}');
    void canvasElement;
  },
};
