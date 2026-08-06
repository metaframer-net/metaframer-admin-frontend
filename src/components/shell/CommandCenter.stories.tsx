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

/** "Ara… Sor…" box + module card grid + AI suggestion chips. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    // A leaf module is a real link (middle-click / new tab work); the active one
    // (route `/`) is marked.
    const overview = c.getByRole('link', { name: /Genel Bakış/ });
    await expect(overview).toHaveAttribute('aria-current', 'page');
    await expect(overview).toHaveAttribute('href', '/');
    // A module that owns children is a disclosure button, not a link.
    await expect(c.getByRole('button', { name: /^İlanlar$/ })).not.toHaveAttribute('aria-current');
    // The single box carries both search and command (no visible title/label).
    await expect(c.getByPlaceholderText('Ara… Sor…')).toBeInTheDocument();
  },
};

/**
 * A module that owns children opens a SUB VIEW: the other modules collapse and the
 * module's children take the grid. Focus follows into the new view (and back to the
 * search field on return), so the keyboard never lands on `<body>`.
 */
export const SubNavigation: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: /^İlanlar$/ }));
    const back = c.getByRole('button', { name: 'Geri' });
    await expect(back).toHaveFocus();
    // The module's children render as a vertical list of real links.
    await expect(c.getByRole('link', { name: /Tüm İlanlar/ })).toHaveAttribute('href', '/listings');
    await expect(c.getByRole('link', { name: /Moderasyon Kuyruğu/ })).toHaveAttribute(
      'href',
      '/listings/moderation',
    );
    // Back returns to the grid and parks focus on the search/command field.
    await userEvent.click(back);
    await expect(c.getByLabelText(/Modül ara/)).toHaveFocus();
  },
};

/** The box live-filters the card grid in place. */
export const Search: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.type(c.getByLabelText(/Modül ara/), 'ilan');
    await expect(c.getByText('İlanlar')).toBeInTheDocument();
    // Dashboard ("Genel Bakış") is filtered out by the query.
    await expect(c.queryByText('Genel Bakış')).toBeNull();
  },
};

/** No module matches the query. */
export const EmptySearch: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.type(c.getByLabelText(/Modül ara/), 'zzzznope');
    await expect(c.getByText('Sonuç bulunamadı.')).toBeInTheDocument();
  },
};

/** The same box PROPOSES an action on submit; nothing applies until confirmed. */
export const NaturalLanguage: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.type(c.getByLabelText(/Modül ara/), 'ilanlara git');
    await userEvent.click(c.getByRole('button', { name: 'Komutu çalıştır' }));
    // Proposed navigate intent with a confirm button (guardrail: confirm-before-apply).
    await expect(c.getByText('Sayfaya git')).toBeInTheDocument();
    await expect(c.getByRole('button', { name: /Git/ })).toBeInTheDocument();
  },
};

/** Narrow viewport — the grid packs 2-up and the chips wrap 2×2. */
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
