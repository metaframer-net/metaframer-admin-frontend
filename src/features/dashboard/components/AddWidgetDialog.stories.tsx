import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import type { WidgetId } from '@/config/dashboard-layout';
import { AddWidgetDialog } from './AddWidgetDialog';

function Harness({ initialHidden }: { initialHidden: WidgetId[] }) {
  const [hidden, setHidden] = useState<WidgetId[]>(initialHidden);
  return (
    <AddWidgetDialog
      open
      onOpenChange={() => {}}
      hidden={hidden}
      activeSection="genel"
      onAdd={(id) => setHidden((h) => h.filter((x) => x !== id))}
    />
  );
}

const meta = {
  title: 'Dashboard/AddWidgetDialog',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Library with removed widgets available to re-add. */
export const Default: Story = {
  render: () => <Harness initialHidden={['quick-access', 'risk-signals', 'top-agents']} />,
  play: async () => {
    const dialog = within(await within(document.body).findByRole('dialog'));
    await expect(dialog.getByText('Widget ekle')).toBeInTheDocument();
    await expect(dialog.getByText('Hızlı erişim')).toBeInTheDocument();
    await expect(dialog.getAllByRole('button', { name: 'Ekle' }).length).toBe(3);
  },
};

/** Empty — nothing removed yet. */
export const Empty: Story = {
  render: () => <Harness initialHidden={[]} />,
  play: async () => {
    const dialog = within(await within(document.body).findByRole('dialog'));
    await expect(dialog.getByText(/Tüm widget'lar zaten ekli/)).toBeInTheDocument();
  },
};

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  render: () => <Harness initialHidden={['quick-access', 'risk-signals']} />,
};
