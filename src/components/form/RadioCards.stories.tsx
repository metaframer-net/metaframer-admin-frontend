import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor } from 'storybook/test';

import { RadioCards, type RadioCardOption } from './RadioCards';

const meta = {
  title: 'Form/RadioCards',
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const authorityOptions: RadioCardOption[] = [
  { value: 'sahibi', label: 'Mülk sahibiyim', hint: "EİDS'de taşınmaz sahipliği doğrulanır." },
  { value: 'yakini', label: 'Yakını / eşiyim', hint: 'Birinci veya ikinci derece yakınlık doğrulanır.' },
  { value: 'yetkili', label: 'Yetkili işletmeyim', hint: 'Taşınmaz sahibinin verdiği yetki aranır.' },
];

function Harness({ options = authorityOptions, initial = 'sahibi' }: { options?: RadioCardOption[]; initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <div className="max-w-2xl">
      <RadioCards options={options} value={value} onChange={setValue} aria-label="Yetki" />
      <p className="text-muted-foreground mt-2 text-xs">
        Seçili: <span data-testid="value">{value}</span>
      </p>
    </div>
  );
}

export const Default: Story = { render: () => <Harness /> };

export const TwoOptions: Story = {
  render: () => (
    <Harness
      options={[
        { value: 'satilik', label: 'Satılık' },
        { value: 'kiralik', label: 'Kiralık' },
      ]}
      initial="satilik"
    />
  ),
};

export const Selects: Story = {
  render: () => <Harness />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByText('Yakını / eşiyim'));
    await waitFor(() => expect(canvas.getByTestId('value')).toHaveTextContent('yakini'));
  },
};

export const Mobile: Story = { render: () => <Harness />, parameters: { viewport: { defaultViewport: 'mobile1' } } };
