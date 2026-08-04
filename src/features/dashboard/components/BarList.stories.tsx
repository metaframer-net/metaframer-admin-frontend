import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { BarList } from './BarList';

const meta = {
  title: 'Dashboard/BarList',
  component: BarList,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div style={{ width: 360 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BarList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Category distribution — palette tokens with a leading swatch. */
export const Default: Story = {
  args: {
    showSwatch: true,
    items: [
      { label: 'Konut', value: 26400, display: '26.4K', colorToken: 1 },
      { label: 'İşyeri', value: 7100, display: '7.1K', colorToken: 2 },
      { label: 'Arsa', value: 5900, display: '5.9K', colorToken: 3 },
      { label: 'Devremülk', value: 1400, display: '1.4K', colorToken: 4 },
      { label: 'Turistik', value: 900, display: '0.9K', colorToken: 5 },
    ],
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Konut')).toBeInTheDocument();
    await expect(canvas.getByText('26.4K')).toBeInTheDocument();
  },
};

/** SLA buckets — semantic tones (critical/warn/info/muted) instead of palette. */
export const Tones: Story = {
  args: {
    showSwatch: true,
    items: [
      { label: '> 4 saat', value: 23, tone: 'critical' },
      { label: '1–4 saat', value: 89, tone: 'warn' },
      { label: '15–60 dk', value: 146, tone: 'info' },
      { label: '< 15 dk', value: 84, tone: 'muted' },
    ],
  },
};

/** Empty — nothing to chart. */
export const Empty: Story = { args: { items: [] } };
