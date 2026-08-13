import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { AlertTriangle } from 'lucide-react';

import { EmptyState } from '@/components/feedback/EmptyState';
import { PageSkeleton } from '@/app/pages/PageSkeleton';
import { PageContainer } from './PageContainer';
import { shellRouterDecorator } from './story-helpers';

/**
 * PageContainer is the single source of the "pages render at 80%, centered from
 * `xl` up" rule. Stories exercise both variants, the per-route opt-out, and the
 * loading/empty/error surfaces it wraps in AppShell — to prove none of them get
 * distorted at 80% width.
 */
const Sample = ({ label }: { label: string }) => (
  <div className="rounded-md border border-border bg-card p-3">
    <h1 className="text-lg font-semibold">{label}</h1>
    <p className="text-muted-foreground mt-1 text-sm">
      Bu blok sayfa içeriğini temsil eder. Geniş ekranda (≥1024px) çevresindeki
      boşluğa bakın: contained modda %80 ortalanır, full modda kenardan kenara
      uzanır.
    </p>
  </div>
);

const meta = {
  title: 'Shell/PageContainer',
  component: PageContainer,
  parameters: { layout: 'fullscreen' },
  // Router decorator is applied per-story (not on meta) so each story mounts
  // exactly one router — the full-width story needs a different `routeMeta`, and
  // nesting two RouterProviders throws.
  args: { children: <Sample label="Sayfa" /> },
} satisfies Meta<typeof PageContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default: 80% centered from `xl` (1024) up, full-width below. */
export const Default: Story = {
  decorators: [shellRouterDecorator()],
  render: () => (
    <PageContainer>
      <Sample label="Contained (varsayılan)" />
    </PageContainer>
  ),
  play: async ({ canvas }) => {
    const el = canvas.getByText('Contained (varsayılan)').closest('[data-slot="page-container"]');
    await expect(el).toHaveAttribute('data-variant', 'contained');
  },
};

/** Loading: the Suspense skeleton AppShell shows during route code-split, at 80%. */
export const Loading: Story = {
  decorators: [shellRouterDecorator()],
  render: () => (
    <PageContainer>
      <PageSkeleton />
    </PageContainer>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('status', { name: 'Sayfa yükleniyor' })).toBeInTheDocument();
  },
};

/** Empty: a data-empty page renders its empty-state centered within the container. */
export const Empty: Story = {
  decorators: [shellRouterDecorator()],
  render: () => (
    <PageContainer>
      <EmptyState title="Kayıt yok" description="Bu görünümde gösterilecek veri bulunmuyor." />
    </PageContainer>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Kayıt yok')).toBeInTheDocument();
  },
};

/** Error: an error surface stays legible and centered at 80% width. */
export const Error: Story = {
  decorators: [shellRouterDecorator()],
  render: () => (
    <PageContainer>
      <EmptyState
        icon={AlertTriangle}
        title="Bir şeyler ters gitti"
        description="Sayfa yüklenemedi. Lütfen tekrar deneyin."
      />
    </PageContainer>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Bir şeyler ters gitti')).toBeInTheDocument();
  },
};

/** Explicit full-width override via the `variant` prop. */
export const Full: Story = {
  decorators: [shellRouterDecorator()],
  render: () => (
    <PageContainer variant="full">
      <Sample label="Full (explicit)" />
    </PageContainer>
  ),
  play: async ({ canvas }) => {
    const el = canvas.getByText('Full (explicit)').closest('[data-slot="page-container"]');
    await expect(el).toHaveAttribute('data-variant', 'full');
  },
};

/** Per-route opt-out: `routeMeta.fullWidth` makes the page full-width with no prop. */
export const FullWidthRoute: Story = {
  decorators: [shellRouterDecorator({ title: 'Harita', fullWidth: true })],
  render: () => (
    <PageContainer>
      <Sample label="Full (routeMeta.fullWidth)" />
    </PageContainer>
  ),
  play: async ({ canvas }) => {
    const el = canvas.getByText('Full (routeMeta.fullWidth)').closest('[data-slot="page-container"]');
    await expect(el).toHaveAttribute('data-variant', 'full');
  },
};

/** Mobile: below `xl` both variants fill the width; content fills main. */
export const Mobile: Story = {
  decorators: [shellRouterDecorator()],
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  render: () => (
    <PageContainer>
      <Sample label="Mobil (tam genişlik)" />
    </PageContainer>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Mobil (tam genişlik)')).toBeInTheDocument();
  },
};
