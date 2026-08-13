import type { Meta, StoryObj } from '@storybook/react-vite';

import { Input } from '@/components/ui/input';
import { SettingsSection } from './SettingsSection';

const meta = {
  title: 'Settings/SettingsSection',
  component: SettingsSection,
  parameters: { layout: 'padded' },
  args: {
    title: 'Genel / Sistem',
    description: 'Platform kimliği ve sistem düzeyi ayarlar.',
    children: <Input placeholder="example.net" aria-label="Örnek alan" />,
  },
} satisfies Meta<typeof SettingsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// Loading placeholder — sections wrap async content that streams in below.
export const Loading: Story = {
  render: () => (
    <SettingsSection title="Genel / Sistem" description="Platform kimliği ve sistem düzeyi ayarlar.">
      <div className="bg-muted h-24 w-full animate-pulse rounded" />
    </SettingsSection>
  ),
};

// Empty — a section with no description and minimal content.
export const Empty: Story = {
  args: { description: undefined, children: <p className="text-muted-foreground text-sm">İçerik yok.</p> },
};

// Error — a section framing an error message.
export const Error: Story = {
  args: {
    title: 'Yüklenemedi',
    description: 'Bu bölüm alınamadı.',
    children: <p className="text-destructive text-sm">Bir hata oluştu.</p>,
  },
};

export const Mobile: Story = { parameters: { viewport: { defaultViewport: 'mobile1' } } };
