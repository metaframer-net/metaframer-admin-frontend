import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { MiniArea, MiniLines } from './MiniTrend';

const areaData = Array.from({ length: 14 }, (_, i) => ({ label: String(i + 1), value: 40 + i * 6 }));
const linesData = Array.from({ length: 14 }, (_, i) => ({ label: String(i + 1), a: 90 + i * 5, b: 40 }));

const meta = {
  title: 'Dashboard/MiniTrend',
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div style={{ width: 420 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Single-series compact area trend (revenue/traffic tiles). */
export const Area: Story = {
  render: () => <MiniArea data={areaData} colorToken={1} summary="Örnek yükselen 14 günlük trend." />,
  play: async ({ canvas }) => {
    // The summary is the accessible alternative to the decorative SVG.
    await expect(canvas.getByText('Örnek yükselen 14 günlük trend.')).toBeInTheDocument();
  },
};

/** Two-series line trend (approvals vs rejections). */
export const Lines: Story = {
  render: () => (
    <MiniLines data={linesData} colorTokens={[3, 5]} summary="Onay yükselirken ret sabit kalan 14 günlük trend." />
  ),
};
