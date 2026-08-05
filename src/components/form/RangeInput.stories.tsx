import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent } from 'storybook/test';

import { RangeInput, type RangeValue } from './RangeInput';

function Harness(props: Partial<React.ComponentProps<typeof RangeInput>>) {
  const [value, setValue] = useState<RangeValue>({});
  return (
    <div className="w-80">
      <RangeInput value={value} onChange={setValue} {...props} />
    </div>
  );
}

const meta = {
  title: 'Form/RangeInput',
  component: RangeInput,
  parameters: { layout: 'centered' },
  render: () => <Harness unit="₺" />,
} satisfies Meta<typeof RangeInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    const min = canvas.getByLabelText('En az');
    await userEvent.type(min, '1500000');
    await expect(min).toHaveValue('1.500.000');
  },
};
export const WithSlider: Story = {
  render: () => <Harness unit="₺" sliderMin={0} sliderMax={10_000_000} sliderStep={50_000} />,
};
export const AreaMeters: Story = { render: () => <Harness unit="m²" minPlaceholder="En az" maxPlaceholder="En çok" /> };
export const Loading: Story = { render: () => <Harness disabled unit="₺" /> };
export const Empty: Story = { render: () => <Harness unit="₺" /> };
export const Error: Story = { render: () => <div className="w-80"><RangeInput unit="₺" aria-invalid /></div> };
export const Mobile: Story = { parameters: { viewport: { defaultViewport: 'mobile1' } } };
