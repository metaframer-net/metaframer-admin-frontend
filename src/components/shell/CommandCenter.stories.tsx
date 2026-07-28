import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { CommandCenter } from './CommandCenter';
import { shellRouterDecorator } from './story-helpers';

const meta = {
  title: 'Shell/CommandCenter',
  component: CommandCenter,
  args: { onClose: () => {} },
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="border-border bg-background w-[42rem] max-w-[calc(100vw-2rem)] rounded-3xl border">
        <Story />
      </div>
    ),
    shellRouterDecorator({ title: 'Genel Bakış', aiEntity: 'dashboard' }),
  ],
} satisfies Meta<typeof CommandCenter>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Card grid + the extras strip (identity, quick commands) + the NL search strip. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    // Identity lives in the extras strip.
    await expect(c.getByText('Ahmet Yönetici')).toBeInTheDocument();
    await expect(c.getByText('Süper Admin')).toBeInTheDocument();
    // A leaf module is a real link (middle-click / new tab work); the active one
    // (route `/`) is marked.
    const overview = c.getByRole('link', { name: /Genel Bakış/ });
    await expect(overview).toHaveAttribute('aria-current', 'page');
    await expect(overview).toHaveAttribute('href', '/');
    // A module that owns children is a disclosure button, not a link.
    await expect(c.getByRole('button', { name: /^İlanlar$/ })).not.toHaveAttribute('aria-current');
    await expect(c.getByText('AI hazır')).toBeInTheDocument();
  },
};

/**
 * A module that owns children opens a SUB VIEW: the other modules collapse into a
 * peek strip and the module's children take the grid. Focus follows into the new
 * view (and back to the search field on return), so the keyboard never lands on
 * `<body>` — which would take Escape away from the hosting panel.
 */
export const SubNavigation: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: /^İlanlar$/ }));
    const back = c.getByRole('button', { name: 'Tüm modüller' });
    await expect(back).toHaveFocus();
    // The module's own landing page leads its children; sub items are links.
    await expect(c.getByRole('link', { name: 'İlanlar — genel' })).toHaveAttribute(
      'href',
      '/listings',
    );
    await expect(c.getByRole('link', { name: 'Moderasyon Kuyruğu' })).toHaveAttribute(
      'href',
      '/listings/moderation',
    );
    // Other modules stay one click away in the peek strip (this one has children).
    await expect(c.getByRole('button', { name: /Kullanıcılar & Ofisler/ })).toBeInTheDocument();
    // Back returns to the grid and parks focus on the search field.
    await userEvent.click(back);
    await expect(c.getByLabelText('Modül ara')).toHaveFocus();
  },
};

/** Module search filters the card grid in place. */
export const Search: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.type(c.getByLabelText('Modül ara'), 'ilan');
    await expect(c.getByText('İlanlar')).toBeInTheDocument();
    // Dashboard ("Genel Bakış") is filtered out by the query.
    await expect(c.queryByText('Genel Bakış')).toBeNull();
  },
};

/** No module matches the search query. */
export const EmptySearch: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.type(c.getByLabelText('Modül ara'), 'zzzznope');
    await expect(c.getByText('Sonuç bulunamadı.')).toBeInTheDocument();
  },
};

/** The NL box PROPOSES an action; nothing applies until the user confirms. */
export const NaturalLanguage: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.type(c.getByLabelText('Doğal dil komutu'), 'ilanlara git');
    await userEvent.click(c.getByRole('button', { name: /Yorumla/ }));
    // Proposed navigate intent with a confirm button (guardrail: confirm-before-apply).
    await expect(c.getByText('Sayfaya git')).toBeInTheDocument();
    await expect(c.getByRole('button', { name: /Git/ })).toBeInTheDocument();
  },
};

/** Narrow viewport — the card grid reflows and the strips wrap. */
export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'bpSm' } },
  decorators: [
    (Story) => (
      <div className="border-border bg-background w-[calc(100vw-2rem)] rounded-3xl border">
        <Story />
      </div>
    ),
  ],
};
