import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getWidget } from './widget-registry';
import { WidgetShell } from './WidgetShell';

const noop = () => {};

function Placeholder({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground text-sm">Widget içeriği</CardContent>
    </Card>
  );
}

const baseProps = {
  dragging: false,
  dropTarget: false,
  onRemove: noop,
  onMoveEarlier: noop,
  onMoveLater: noop,
  canMoveEarlier: true,
  canMoveLater: true,
  onDragStart: noop,
  onDragEnter: noop,
  onDragOver: noop,
  onDrop: noop,
  onDragEnd: noop,
};

const meta = {
  title: 'Dashboard/WidgetShell',
  component: WidgetShell,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="grid grid-cols-2 gap-4 pt-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof WidgetShell>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default (not editing) — a plain grid cell, no chrome. */
export const Default: Story = {
  args: {
    ...baseProps,
    def: getWidget('total-listings'),
    editing: false,
    children: <Placeholder title="Toplam ilan" />,
  },
};

/** Editing — 44px reorder/remove toolbar is shown. */
export const Editing: Story = {
  args: {
    ...baseProps,
    def: getWidget('total-listings'),
    editing: true,
    children: <Placeholder title="Toplam ilan" />,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: /kaldır/ })).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: /geri taşı/ })).toBeInTheDocument();
  },
};

/** Editing at the ends of the row — move buttons disable at the boundary. */
export const EditingBoundary: Story = {
  args: {
    ...baseProps,
    def: getWidget('total-listings'),
    editing: true,
    canMoveEarlier: false,
    canMoveLater: true,
    children: <Placeholder title="İlk widget" />,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: /geri taşı/ })).toBeDisabled();
  },
};

/** Drop target highlight during a drag. */
export const DropTarget: Story = {
  args: {
    ...baseProps,
    def: getWidget('total-listings'),
    editing: true,
    dropTarget: true,
    children: <Placeholder title="Bırakma hedefi" />,
  },
};
