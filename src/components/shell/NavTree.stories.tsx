import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor } from 'storybook/test';

import { NavTree } from './NavTree';
import { navSchema } from '@/config/nav-schema';
import { shellRouterDecorator } from './story-helpers';

const meta = {
  title: 'Shell/NavTree',
  component: NavTree,
  parameters: { layout: 'padded' },
  decorators: [shellRouterDecorator()],
  args: { items: navSchema },
} satisfies Meta<typeof NavTree>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div className="bg-sidebar w-64 rounded-md p-3">
      <NavTree {...args} />
    </div>
  ),
  play: async ({ canvas }) => {
    // Groups with children are accordion toggles (buttons), not links.
    await expect(canvas.getByRole('button', { name: 'İlanlar' })).toBeInTheDocument();
    await expect(canvas.getByRole('link', { name: 'Genel Bakış' })).toBeInTheDocument();
  },
};

export const Collapsed: Story = {
  render: (args) => (
    <div className="bg-sidebar w-16 rounded-md p-3">
      <NavTree {...args} collapsed />
    </div>
  ),
  play: async ({ canvas }) => {
    // Icon-only rows must still expose an accessible name (via aria-label).
    await expect(canvas.getByRole('link', { name: 'Genel Bakış' })).toBeInTheDocument();
    await expect(canvas.getByRole('link', { name: 'İlanlar' })).toBeInTheDocument();
  },
};

export const Mobile: Story = {
  ...Default,
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};

export const Loading: Story = {
  render: () => (
    <div className="w-64 space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-muted h-10 w-full animate-pulse rounded-md" />
      ))}
    </div>
  ),
};

export const Empty: Story = {
  render: () => (
    <div className="text-muted-foreground w-64 p-3 text-sm">Erişilebilir modül yok.</div>
  ),
  args: { items: [] },
};

export const Error: Story = {
  render: () => <div className="text-destructive w-64 p-3 text-sm">Menü yüklenemedi.</div>,
};

/**
 * Double-active fix: after navigating to `/listings/moderation` ONLY "Moderasyon
 * Kuyruğu" is the current page. The parent "İlanlar" (a toggle) and sibling "Tüm
 * İlanlar" (whose `/listings` is a URL prefix) must NOT carry aria-current.
 */
export const ActiveChildOnly: Story = {
  render: (args) => (
    <div className="bg-sidebar w-64 rounded-md p-3">
      <NavTree {...args} />
    </div>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'İlanlar' }));
    await userEvent.click(await canvas.findByRole('link', { name: 'Moderasyon Kuyruğu' }));

    await waitFor(() => {
      const current = canvas.getAllByRole('link').filter((el) => el.getAttribute('aria-current') === 'page');
      expect(current).toHaveLength(1);
      expect(current[0]).toHaveAccessibleName('Moderasyon Kuyruğu');
    });
    await expect(canvas.getByRole('button', { name: 'İlanlar' })).not.toHaveAttribute('aria-current');
  },
};

/**
 * Single-open accordion: opening a second group collapses the first. Opening
 * "İlanlar" reveals its children; opening "Kullanıcılar & Ofisler" hides them.
 */
export const SingleOpenAccordion: Story = {
  render: (args) => (
    <div className="bg-sidebar w-64 rounded-md p-3">
      <NavTree {...args} />
    </div>
  ),
  play: async ({ canvas }) => {
    const listings = canvas.getByRole('button', { name: 'İlanlar' });
    await userEvent.click(listings);
    await expect(listings).toHaveAttribute('aria-expanded', 'true');
    await expect(await canvas.findByRole('link', { name: 'Moderasyon Kuyruğu' })).toBeInTheDocument();

    // Opening another group closes the first (single-open).
    await userEvent.click(canvas.getByRole('button', { name: 'Kullanıcılar & Ofisler' }));
    await expect(listings).toHaveAttribute('aria-expanded', 'false');
    await waitFor(() => expect(canvas.queryByRole('link', { name: 'Moderasyon Kuyruğu' })).not.toBeInTheDocument());
  },
};
